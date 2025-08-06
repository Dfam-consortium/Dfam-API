const config = require('./config');
const logger = require('./logger');
const ExpressServer = require('./expressServer');

// Only validate the configuration in the main thread
// This avoids race conditions and is more efficient
config.validateConfig();

// Announce ourselves to the logger
logger.info("DFAM-API Version " + config.VERSION_MAJOR + "." +
            config.VERSION_MINOR + "." + config.VERSION_BUGFIX);

if (config.REQUIRE_ALTCHA) {
  logger.info("DFAM-API Altcha verification for private endpoints is turned ON");
}else {
  logger.info("DFAM-API Altcha verification for private endpoints is turned OFF");
}

// Startup threaded operation (workers)
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
    if (expressServer && expressServer.close) {
      await expressServer.close();
    }
    throw error; // Let the outer catch handle logging
  }
};

if (require.main === module) {
  launchServer().catch((e) => {
    logger.error({
      message: 'Express Server failure ' + e.message || e.toString(),
      error: e.error || '',
      stack: e.stack || '',
      url: '',
      code: e.code || '',
    });
    console.error(e); 
  });
}

// Only auto-start the server if run directly, not when imported by tests
//launchServer().catch(e => logger.error(e));
//if (require.main === module) {
//  launchServer().catch(e => logger.error(e));
//}

module.exports = {
  expressServer,
  launchServer
};
