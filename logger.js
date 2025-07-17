const { transports, createLogger, format } = require('winston');
const { combine, printf } = format;
const moment = require('moment-timezone');

const appendTimestamp = format((info, opts) => {
  if(opts.tz)
    time = moment().tz(opts.tz).format();
  times = time.split("T");
  info.date = times[0];
  info.time = times[1];
  return info;
});

const myFormat = combine(
  appendTimestamp({ tz: 'America/Vancouver' }),
  printf(({ level, message, date, time }) => {
    if (level === 'info') {
      return `{"type": "${level}", "message": "${message}", "date": "${date}", "time": "${time}"}`;
    }
    else if (level === "verbose") {
      return `{"type": "${level}", "method": "${message.method}", "endpoint": "${message.endpoint}", "params": "${message.params}", "code": "${message.code}", "res_time": "${message.res_time}", "client_ip": "${message.client_ip}", "date": "${date}", "time": "${time}"}`;
    }
    else if (level === "error") {
      let code;
      let err_message;
      if (typeof(message) === "string") {
        err_message = message;
        code = 405;
      }
      else if (typeof(message) === "object"){
        code = message.error.code;
        if (typeof(message.error.error) === "string") {
          err_message = message.error.error;
        }
        else if (typeof(message.error.error) == "object") {
          err_message = message.error.error.message;
        }
        else {
          err_message = "";
        }
      }
      return `{"type": "${level}", "message": "${err_message}", "url": "${message.url}", "code": "${code}", "date": "${date}", "time": "${time}"}`;
    }
    else {
      return `{"type": "${level}", "message": "${message}", "date": "${date}", "time": "${time}"}`;
    }
  }),
);

const logger = createLogger({
  // TODO: Set this in the user environment
  level: 'verbose',
  format: myFormat,
  transports: [
    new transports.File({ filename: 'Dfam-API.log', timestamp: true }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: myFormat }));
}


module.exports = logger;
