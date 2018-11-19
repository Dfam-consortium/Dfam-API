'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');
const http = require('http');

const winston = require('winston');
const format = winston.format;
winston.configure({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.simple(),
      ),
    }),
    new winston.transports.File({
      format: format.combine(
        format.timestamp(),
        format.json(),
      ),
      filename: 'Dfam-API.log',
      maxsize: 1000000000, // 1 GB
    }),
  ],
});

winston.info("Dfam-API Server starting up.");

const auth = require('./auth');

var app = require('connect')();
var swaggerTools = require('swagger-tools');
var jsyaml = require('js-yaml');
var cors = require('cors');
var serverPort = process.env.DFAM_API_PORT || 10011;

// global middleware configuration

// CORS configuration. The default is Access-Control-Allow-Origin: *, which
// might not be sufficient for some requests we support in the future.
app.use(cors());

// swaggerRouter configuration
var options = {
  swaggerUi: path.join(__dirname, '/swagger.json'),
  controllers: path.join(__dirname, './controllers'),
  useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
};

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(path.join(__dirname,'api/swagger/swagger.yaml'), 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);

// Initialize the Swagger middleware
swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {

  // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
  app.use(middleware.swaggerMetadata());

  app.use(middleware.swaggerSecurity(auth.swaggerHandlers));

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

  // Serve the Swagger documents and Swagger UI
  app.use(middleware.swaggerUi());

  // Start the server
  http.createServer(app).listen(serverPort, function () {
    winston.info(`Your server is listening on port ${serverPort} (http://localhost:${serverPort})`);
    winston.info(`Swagger-ui is available on http://localhost:${serverPort}/docs`);
  });

});
