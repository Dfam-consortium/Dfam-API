var logger = require('./logger');
var config = require('./config');
const isMainThread = require('node:worker_threads').isMainThread;
const threadId = require('node:worker_threads').threadId;
var Sequelize = require('sequelize');

/**
 * databases.js
 *
 * A simple module that supports a single set of mysql2 connections and 
 * Sequelize models for use in many parts of an Express application.
 */

function connect(dbinfo) {
  if ( isMainThread ) {
    logger.info(`Main thread connecting to ${dbinfo.database}`);
  }else {
    logger.info(`Worker thread ` + threadId + ` connecting to ${dbinfo.database}`);
  }
  const dbconn =  new Sequelize(
    dbinfo.database,
    dbinfo.user,
    dbinfo.password,
    {
      host: dbinfo.host,
      port: dbinfo.port,
      dialect: "mysql",
      dialectOptions: {
        charset: "latin1_swedish_ci",
        timezone: "local"
      },
      define: {
        timestamps: false,
      },
      timezone: config.apiserver.db_timezone,
      //logging: false,
      //benchmark: true,
      //logQueryParameters: true,
      logging: function(message, data) {
        logger.debug(message);
        //console.log(message);
      },
      pool: {
        max: 5,
        min: 0,
        idle: 10000,
      }
    }
  );
  //dbconn.authenticate();
  //console.log("DONE dbconn authenticate....");
  return dbconn;
}

var _dfam_conn;
const getConn_Dfam = function () {
  if (! _dfam_conn) {
    _dfam_conn = connect(config.schema.Dfam);
  }
  return(_dfam_conn);
};

var _dfam_models;
const getModels_Dfam = function () {
  if (! _dfam_models) {
    _dfam_models = require("./dbmodels").getDfamModels(getConn_Dfam());
  }
  return(_dfam_models);
};

var _user_conn;
const getConn_User = function () {
  if (! _user_conn) {
    _user_conn = connect(config.schema.DfamUser);
  }
  return(_user_conn);
};

var _user_models;
const getModels_User = function () {
  if (! _user_models) {
    _user_models = require("./dbmodels").getDfamUserModels(getConn_User());
  }
  return(_user_models);
};
    
// var _assembly_models = {};
// const getModels_Assembly = function(schema_name) {
//   if (!_assembly_models[schema_name]) {
    
//     const conn = connect({
//       database: schema_name,
//       host: config.schema.AssemblyDB.host,
//       port: config.schema.AssemblyDB.port,
//       user: config.schema.AssemblyDB.user,
//       password: config.schema.AssemblyDB.password,
//     });

//     const models = _assembly_models[schema_name] = {};

//     models.modelFileModel = require("./models/assembly/model_file.js")(conn, Sequelize);
//     models.karyotypeModel = require("./models/assembly/karyotype.js")(conn, Sequelize);
//     models.coverageDataModel = require("./models/assembly/coverage_data.js")(conn, Sequelize);
//     models.percentageIdModel = require("./models/assembly/percentage_id.js")(conn, Sequelize);
//     models.sequenceModel = require("./models/assembly/sequence.js")(conn, Sequelize);
//     models.hmmFullRegionModel = require("./models/assembly/hmm_full_region.js")(conn, Sequelize);
//     models.hmmFullRegionModel.removeAttribute('id');

//     models.hmmFullRegionModel.belongsTo(models.sequenceModel, { foreignKey: 'seq_accession' });
//     models.maskModel = require("./models/assembly/mask.js")(conn, Sequelize);
//     models.maskModel.removeAttribute('id');
//     models.maskModel.belongsTo(models.sequenceModel, { foreignKey: 'seq_accession' });
//   }

//   return _assembly_models[schema_name];
// };

module.exports = {
  getConn_Dfam,
  getModels_Dfam,
  getConn_User,
  getModels_User,
  // getModels_Assembly
};
