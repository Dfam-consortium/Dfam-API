const tmp = require('tmp');
const child_process = require('child_process');

// Wrapper around tmp.file that returns a Promise
exports.tmpFileAsync = function() {
  return new Promise(function(resolve, reject) {
    tmp.file(function(err, path, fd, cleanup) {
      if (err) { reject(err); }
      else { resolve({ path, fd, cleanup }); }
    });
  });
};

// Wrapper around child_process.exec that returns a Promise
exports.execAsync = function(command, options) {
  return new Promise(function(resolve, reject) {
    child_process.exec(command, options, function(error, stdout, stderr) {
      if (error) { return reject(error); }
      else { return resolve({ stdout, stderr }); }
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
