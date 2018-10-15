var winston = require('winston');
var security = require('./security.json');

var Sequelize = require('sequelize');

function connect(dbinfo) {
  winston.info(`Connecting to ${dbinfo.database}`);
  return new Sequelize(
    dbinfo.database,
    dbinfo.username,
    dbinfo.password,
    {
      host: "localhost",
      dialect: "mysql",
      define: {
        timestamps: false,
      },
      logging: false,
      operatorsAliases: false,
      pool: {
        max: 5,
        min: 0,
        idle: 10000,
      }
    }
  );
}

var dfam_connection = connect(security.dfam_database);
var users_connection = connect(security.users_database);

module.exports = { "dfam": dfam_connection, "users": users_connection };
