const tmp = require('tmp');
const child_process = require('child_process');
const winston = require('winston');

// Wrapper around tmp.file that returns a Promise
exports.tmpFileAsync = function(options) {
  return new Promise(function(resolve, reject) {
    tmp.file(options, function(err, path, fd, cleanup) {
      if (err) { reject(err); }
      else { resolve({ path, fd, cleanup }); }
    });
  });
};

// Wrapper around child_process.execFile that returns a Promise
exports.execFileAsync = function(file, args, options) {
  return new Promise(function(resolve, reject) {
    child_process.execFile(file, args, options, function(error, stdout, stderr) {
      if (error) { return reject(error); }
      else { return resolve({ stdout, stderr }); }
    });
  });
};

const waiting = [];
let running_workers = 0;
const WORKER_LIMIT = 4;

function runReady() {
  winston.debug(waiting.length + " waiting workers.");
  while (waiting.length && running_workers < WORKER_LIMIT) {
    const job = waiting.shift();
    running_workers += 1;
    job();
  }
}

// Wrapper around child_process.fork. A helper function for running
// the 'worker' module and getting its result, spawning a limited number
// of workers at a time.
exports.runWorkerAsync = function(args) {
  return new Promise(function(resolve, reject) {
    waiting.push(resolve);
    runReady();
  }).then(function() {
    return new Promise(function(resolve, reject) {
      const workerProc = child_process.fork("worker", args, {
        stdio: ['pipe', 'inherit', 'inherit', 'pipe', 'ipc'],
      });
      workerProc.on('error', err => reject(err));

      let chunks = [];
      workerProc.stdio[3].on('data', (chunk) => chunks.push(chunk));

      workerProc.on('close', (code) => {
        if (!code) {
          resolve(Buffer.concat(chunks));
        } else {
          reject("Worker exited with code " + code);
        }
      });
    });
  }).then(function(result) {
    running_workers -= 1;
    runReady();
    return result;
  }).catch(function(error) {
    running_workers -= 1;
    runReady();
    throw error;
  });
};
