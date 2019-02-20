const process = require('process');
const fs = require('fs');

let writeOutput = process.stdout.write.bind(process.stdout);

// Don't trust any libraries not to use standard output.
// If DFAM_WORKER_FD is present, the result is sent there
// instead of to standard output.
if (process.env.DFAM_WORKER_FD) {
  const outputStream = fs.createWriteStream(null, { fd: parseInt(process.env.DFAM_WORKER_FD) });
  writeOutput = outputStream.write.bind(outputStream);
}

const winston = require('winston');
const format = winston.format;
winston.configure({
  level: process.env["DFAM_LOG"] || 'verbose',
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.simple(),
      ),
      // Send all logging to standard error to try not to
      // conflict with standard output.
      stderrLevels: Object.keys(winston.config.npm.levels),
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

const ALLOWED_COMMANDS = ['stockholm', 'hmm', 'embl'];

if (process.argv.length > 2) {
  const command = process.argv[2];
  if (ALLOWED_COMMANDS.indexOf(command) !== -1) {
    const args = process.argv.slice(3);
    require('./' + command).apply(undefined, args).then(function(result) {
      writeOutput(result || "", (err) => process.exit(err ? 1 : 0));
    }).catch(function(error) {
      console.error(error);
      process.exit(1);
    });
  }
}
