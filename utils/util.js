const EventEmitter = require('events');
const winston = require('winston');

exports.splitLines = function (stream) {
  const emitter = new EventEmitter();

  let buf = "";

  stream.on('data', function(data) {
    winston.silly(`splitLines: got ${data.length} bytes`);
    buf += data;
    const lines = buf.split(/\r?\n/);
    if (lines.length) {
      buf = lines.pop();
      winston.silly(`splitLines: emitting ${lines.length} lines`);
      lines.forEach(line => emitter.emit('line', line));
    }
  });

  stream.on('error', e => emitter.emit('error', e));

  stream.on('end', function() {
    if (buf != "") {
      winston.silly(`splitLines: emitting ${buf.length} remaining`);
      emitter.emit('line', buf);
    }
    winston.silly(`splitLines: emitting end`);
    emitter.emit('end');
  });

  return emitter;
};

exports.forEachLine = function(stream, callback) {
  return new Promise(function(resolve, reject) {
    const events = exports.splitLines(stream);

    const queue = [];
    let running = false;
    const DONE = {};

    events.on('line', function(line) {
      queue.push(line);
      if (!running) {
        run();
      }
    });

    events.on('error', e => reject(e));
    events.on('end', () => {
      queue.push(DONE);
      if (!running) {
        run();
      }
    });

    function run() {
      running = true;
      const item = queue.shift();
      if (item === DONE) {
        return resolve();
      }

      if (item) {
        callback(item).then(() => run(), (e) => reject(e));
      } else {
        running = false;
      }
    }
  });
};
