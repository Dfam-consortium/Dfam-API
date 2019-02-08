'use strict';

const process = require('process');
const http = require('http');

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
      filename: 'Dfam-API.log',
      maxsize: 1000000000, // 1 GB
    }),
  ],
});

winston.info("Dfam-API Server starting up.");

var serverPort = process.env.DFAM_API_PORT || 10011;

const app = require('./app')();

// Start the server
http.createServer(app).listen(serverPort, function () {
  winston.info(`Your server is listening on port ${serverPort} (http://localhost:${serverPort})`);
  winston.info(`Swagger-ui is available on http://localhost:${serverPort}/docs`);
});
