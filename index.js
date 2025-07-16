const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config');
const logger = require('./logger');
const ExpressServer = require('./expressServer');
require('./workerPool');

//
// DEPRECATED -- newer releases of express-openapi-validator fix this issue
//
// Generate config.OPENAPI_YAML + ".sans_example" file for OpenAPIValidator 
//   This is a workaround for a bug in OpenAPIValidator 5.0.4 which
//   incorrectly reports duplicate 'id:' keys in a OAS 3.0 'example'
//   definition as a problem.  For this reason we need to strip them
//   out and generating a *.sans_example file. NOTE: In OAS 3.1 the
//   'example' tag has been renamed 'examples' for future reference.
function removeExamplesKeys(obj) {
  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      obj.forEach(function (item) {
        removeExamplesKeys(item);
      });
    } else {
      for (var key in obj) {
        if (key === "example") {
          delete obj[key];
        } else {
          removeExamplesKeys(obj[key]);
        }
      }
    }
  }
}
//
// 7/14/2025: RMH - Fixed in express-openapi-validator 5.5.7 (removing for now)
// Open API OAS 3.0 file and strip out example data.
// 
//let doc = yaml.load(fs.readFileSync(config.OPENAPI_YAML, 'utf-8'));
//removeExamplesKeys(doc);
//fs.writeFileSync(config.OPENAPI_YAML + ".sans_example", yaml.dump(doc));

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
