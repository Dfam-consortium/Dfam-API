const process = require('process');
const fs = require('fs');

// TODO: This only works when fd 3 was specified by the parent.
// It would be nice to support standard output but I'm too
// afraid of widespread usage of console.log and the like - JR
const outputStream = fs.createWriteStream(null, { fd: 3 });

const winston = require('winston');
const format = winston.format;
winston.configure({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.simple(),
      ),
    }),
    new winston.transports.File({
      format: format.combine(
        format.timestamp(),
        format.json(),
      ),
      filename: 'Dfam-API-worker.log',
      maxsize: 1000000000, // 1 GB
    }),
  ],
});

const ALLOWED_COMMANDS = ['stockholm'];

if (process.argv.length > 2) {
  const command = process.argv[2];
  if (ALLOWED_COMMANDS.indexOf(command) !== -1) {
    const args = process.argv.slice(3);
    require('./' + command).apply(undefined, args).then(function(result) {
      outputStream.write(result, (err) => process.exit(err ? 1 : 0));
    });
  }
}
