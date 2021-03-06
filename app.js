'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');

const winston = require('winston');

// The 'worker' has to be launched relative to this file.
global.dfam_app_root = path.resolve(__dirname);

module.exports = function() {
  var app = require('connect')();
  var swaggerTools = require('swagger-tools');
  var jsyaml = require('js-yaml');
  var cors = require('cors');

  // global middleware configuration

  // Simple request logger
  app.use(function(req, res, next) {
    const start = new Date();

    require('on-finished')(res, function(err, res) {
      if (!err) {
        const time = new Date() - start;
        winston.verbose(`${req.method} ${req.url} ${res.statusCode} ${time}ms`);
      } else {
        winston.error(err);
      }
    });
    next();
  });

  // CORS configuration. The default is Access-Control-Allow-Origin: *, which
  // might not be sufficient for some requests we support in the future.
  app.use(cors());

  // swaggerRouter configuration
  var options = {
    controllers: path.join(__dirname, './controllers'),
    useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
  };

  // The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
  var spec = fs.readFileSync(path.join(__dirname,'api/swagger/swagger.yaml'), 'utf8');
  var swaggerDoc = jsyaml.load(spec);

  // Initialize the Swagger middleware
  swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {

    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata());

    // Error handler for security
    app.use(function(err, req, res, next) {
      res.statusCode = err.statusCode || 403;
      res.end(err.message);
    });

    // Validate Swagger requests
    app.use(middleware.swaggerValidator());

    // Route validated requests to appropriate controller
    app.use(middleware.swaggerRouter(options));

    // Error handler for routes
    app.use(function(err, req, res, next) {
      if (err.failedValidation) {
        // Request validation error
        // swagger-tools has already set the status code to 400

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ message: err.message }));
        return;
      }

      if (err.allowedMethods) {
        // Request using an unsupported method
        // TODO: 'HEAD' in particular would be nice to
        // support properly

        res.end(JSON.stringify({ message: "Method not allowed. Allowed methods: " + err.allowedMethods.sort().join(', ') }));
        return;
      }

      if (err.stack) {
        winston.error(err.stack);
      } else {
        winston.error(err.toString());
      }

      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
      }
      res.end(JSON.stringify({ message: "Unhandled server error." }));
    });
  });

  return app;
};
