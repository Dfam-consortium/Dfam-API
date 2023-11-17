const { transports, createLogger, format } = require('winston');

const logger = createLogger({
  // TODO: Set this in the user environment
  level: 'verbose',
  format: format.combine(
    format.timestamp(),
    format.json(),
  ),
  defaultMeta: { service: 'user-service' },
  //  new transports.File({ filename: 'Dfam-API-error.log', level: 'error', timestamp: true }),
  transports: [
    new transports.File({ filename: 'Dfam-API.log', timestamp: true }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: format.simple() }));
}


module.exports = logger;
