var logger = require('./logger');
var config = require('./config');
const isMainThread = require('node:worker_threads').isMainThread;
const threadId = require('node:worker_threads').threadId;

var Sequelize = require('sequelize');

function connect(dbinfo) {
  if ( isMainThread ) {
    logger.info(`Main thread connecting to ${dbinfo.database}`);
  }else {
    logger.info(`Worker thread ` + threadId + ` connecting to ${dbinfo.database}`);
  }
  return new Sequelize(
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
      logging: function(message, data) {
        logger.debug(message);
      },
      pool: {
        max: 5,
        min: 0,
        idle: 10000,
      }
    }
  );
}

var _dfam_conn;
const getConn_Dfam = function () {
  if (! _dfam_conn) {
    _dfam_conn = connect(config.schema.Dfam);
  }
  return(_dfam_conn);
}

var _dfam_models;
const getModels_Dfam = function () {
  if (! _dfam_models) {
    _dfam_models = require("./dbmodels").getDfamModels(getConn_Dfam());
  }
  return(_dfam_models);
}

var _user_conn;
const getConn_User = function () {
  if (! _user_conn) {
    _user_conn = connect(config.schema.DfamUser);
  }
  return(_user_conn);
}

var _user_models;
const getModels_User = function () {
  if (! _user_models) {
    _user_models = require("./dbmodels").getDfamUserModels(getConn_User());
  }
  return(_user_models);
}
    
    
//var dfam_connection = connect(config.schema.Dfam);
//const dfam_models = require("./dbmodels").getDfamModels(dfam_connection);

//var users_connection = connect(config.schema.DfamUser);
//const dfam_user_models = require("./dbmodels").getDfamUserModels(users_connection);

//const assemblyModels = {};
//function getAssemblyModels(schema_name) {
//  if (!assemblyModels[schema_name]) {
//    const models = assemblyModels[schema_name] = {};
//    const conn = models.conn = connect({
//      database: schema_name,
//      host: config.schema.AssemblyDB.host,
//      port: config.schema.AssemblyDB.port,
//      user: config.schema.AssemblyDB.user,
//      password: config.schema.AssemblyDB.password,
//    });
//
//    models.modelFileModel = require("./models/assembly/model_file.js")(conn, Sequelize);
//    models.karyotypeModel = require("./models/assembly/karyotype.js")(conn, Sequelize);
//    models.coverageDataModel = require("./models/assembly/coverage_data.js")(conn, Sequelize);
//    models.percentageIdModel = require("./models/assembly/percentage_id.js")(conn, Sequelize);
 //   models.sequenceModel = require("./models/assembly/sequence.js")(conn, Sequelize);
//    models.hmmFullRegionModel = require("./models/assembly/hmm_full_region.js")(conn, Sequelize);
//    models.hmmFullRegionModel.removeAttribute('id');
//
//    models.hmmFullRegionModel.belongsTo(models.sequenceModel, { foreignKey: 'seq_accession' });
//    models.maskModel = require("./models/assembly/mask.js")(conn, Sequelize);
//    models.maskModel.removeAttribute('id');
////////    models.maskModel.belongsTo(models.sequenceModel, { foreignKey: 'seq_accession' });
//  }
//
//  return assemblyModels[schema_name];
//}


module.exports = {
  getConn_Dfam,
  getModels_Dfam,
  getConn_User,
  getModels_User
};

//module.exports = {
//  "dfam": dfam_connection,
//  dfam_models,
//  "users": users_connection,
//  dfam_user_models,
//  "getAssemblyModels": getAssemblyModels
//};
