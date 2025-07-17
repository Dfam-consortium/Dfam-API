const config = require('./config');
const logger = require('./logger');
const ExpressServer = require('./expressServer');

config.validateConfigOnce();

require('./workerPool');

// Launch the Express server
let expressServer = null;
const launchServer = async () => {
  try {
    expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML);
    await expressServer.launch();
    logger.info('Express server running');
    return expressServer;
  } catch (error) {
    logger.error('Express Server failure', error.message);
    if (expressServer && expressServer.close) await expressServer.close();
    throw error;
  }
};

// Only auto-start the server if run directly, not when imported by tests
//launchServer().catch(e => logger.error(e));
if (require.main === module) {
  launchServer().catch(e => logger.error(e));
}

module.exports = {
  expressServer,
  launchServer
};
