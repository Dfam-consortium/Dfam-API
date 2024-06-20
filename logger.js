const { transports, createLogger, format } = require('winston');
const {combine, json} = format;
const moment = require('moment-timezone');

const appendTimestamp = format((info, opts) => {
  if(opts.tz)
    info.timestamp = moment().tz(opts.tz).format();
  return info;
});

const logger = createLogger({
  // TODO: Set this in the user environment
  level: 'verbose',
  format: combine(
    appendTimestamp({ tz: 'America/Vancouver' }),
    json(),
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
