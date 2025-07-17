# Dfam API
## User Documentation 
The API documentation can be found [Here](https://www.dfam.org/releases/current/apidocs/)

## Overview
This server provides a RESTful API supporting public access to the Dfam database of Transposable Element (TE) families, hidden Markov Models (HMMs), consensus sequences, and genome annotations.  The API is based on the [OpenAPI 3.0 Specfication](https://swagger.io/specification/v3/).  

This server was scaffolded using the [OpenAPI Generator](https://openapi-generator.tech) tool and relies heavily on the Sequelize, Piscina, and Swagger open source projects.

### Prerequisites
- NodeJS >= 22.17.0
- NPM >= 10.9.2

The core functionality of the API depends on:

* A mysql database server with Dfam databases.
* Dfam-warehouse directories containing reference genomes, te_idx annotation sets, 
  temporary result caches, and temporary files.

Some functionality requires these additional tools:

* `twoBitToFa`, `faSize` from the UCSC Genome Browser tools suite
* `nhmmer` from the HMMER suite
* `HMM_Logos`, specifically webGenLogoImage.pl
* `CoMSA` MSA decompression tool
* `te_idx` TE Annotation indexing tool
* `rmblast` RMBlast alignment tool
* `ultra` Tandem repeat identification tool
* A running instance of `dfamdequeuer`, and its own dependencies

Connection URLs and paths are specified in the configuration.

### Configuration

Configuration is read from the path `../conf/Dfam.conf` relative to the
working directory. If the `DFAM_CONF` environment variable is present, it will
be used instead.

### Running the server

To run the server, run:

```
[DFAM_LOG=debug] [DFAM_API_PORT=<port>] npm start
```

Logging levels, highest to lowest: error, warn, info, verbose, debug, silly.

* If unspecified, the default is 'verbose'.
* SQL statements are logged at the 'debug' level.

To view the Swagger UI interface:

```
open http://localhost:<port>/docs
```

### Testing

A [Postman](https://getpostman.com) collection is maintained
at `api/api.postman_collection.json` for developement and
testing.

Endpoint unit tests are in test/api.js and utilize the Ava/Supertest frameworks.  
To run (make sure ava is installed 'npm install ava' if not):

```
  npm test
```

Due to limitations in supertest we may consider switching from Ava to Mocha for unit testing in the future.

A globally installed copy of Artillery is used to load test the API.  

```
  npm install -g artillery@latest
  npm install -g artillery-plugin-metrics-by-endpoint
```

The tests are stored in the test/artillery folder and can be run using:

```
  artillery run test.yml
```

There are several places in the code that may be changed to produce more verbose levels of debugging output
- expressServer.js - uncomment 'console.error(err);' near the bottom of the setupMiddleware function
- Set query.logging on any Sequelize instance to `console.log` or a custom function to log SQL queries

### npm-watch

`npm-watch` can be used to restart the server when changes are made to any
javascript files.

```
[DFAM_API_PORT=<port>] npm run watch start
```

### eslint

This project uses `eslint` for code style and tidying. A custom npm script has
been set up for convenience:

```
npm run lint
```

### Building Documentation

First make sure the redocly dependency is globally installed:
```
npm install @redocly/cli -g
```

Then invoke redocly on the OpenAPI 2.0 file:
```
npm run build-docs
```

And to deploy them:
```
cp redoc-static.html /usr/local/Dfam-warehouse/releases/Dfam_x.x/apidocs/index.html
         
```

#### Autogen Notes
1. Use the OpenAPI Generator to generate your application:
Assuming you have Java (1.8+), and [have the jar](https://github.com/openapitools/openapi-generator#13---download-jar) to generate the application, run:
```java -jar {path_to_jar_file} generate -g nodejs-express-server -i {openapi yaml/json file} -o {target_directory_where_the_app_will_be_installed} ```
If you do not have the jar, or do not want to run Java from your local machine, follow instructions on the [OpenAPITools page](https://github.com/openapitools/openapi-generator). You can run the script online, on docker, and various other ways.
2. Go to the generated directory you defined. There's a fully working NodeJS-ExpressJs server waiting for you. This is important - the code is yours to change and update! Look at config.js and see that the settings there are ok with you - the server will run on port 3000, and files will be uploaded to a new directory 'uploaded_files'.
3. The server will base itself on an openapi.yaml file which is located under /api/openapi.yaml. This is not exactly the same file that you used to generate the app:
I.  If you have `application/json` contentBody that was defined inside the path object - the generate will have moved it to the components/schemas section of the openapi document.
II. Every process has a new element added to it - `x-eov-operation-handler: controllers/PetController` which directs the call to that file.
III. We have a Java application that translates the operationId to a method, and a nodeJS script that does the same process to call that method. Both are converting the method to `camelCase`, but might have discrepancy. Please pay attention to the operationID names, and see that they are represented in the `controllers` and `services` directories.
4. Take the time to understand the structure of the application. There might be bugs, and there might be settings and business-logic that does not meet your expectation. Instead of dumping this solution and looking for something else - see if you can make the generated code work for you.
To keep the explanation short (a more detailed explanation will follow): Application starts with a call to index.js (this is where you will plug in the db later). It calls expressServer.js which is where the express.js and openapi-validator kick in. This is an important file. Learn it. All calls to endpoints that were configured in the openapi.yaml document go to `controllers/{name_of_tag_which_the_operation_was_associated_with}.js`, which is a very small method. All the business-logic lies in `controllers/Controller.js`, and from there - to `services/{name_of_tag_which_the_operation_was_associated_with}.js`.

### Project Files
#### Root Directory:
In the root directory we have (besides package.json, config.js, and log files):
- **logger.js** - where we define the logger for the project. The project uses winston, but the purpose of this file is to enable users to change and modify their own logger behavior.
- **index.js** - This is the project's 'main' file, and from here we launch the application. This is a very short and concise file, and the idea behind launching from this short file is to allow use-cases of launching the server with different parameters (changing config and/or logger) without affecting the rest of the code.
- **expressServer.js** - The core of the Express.js server. This is where the express server is initialized, together with the OpenAPI validator, OpenAPI UI, and other libraries needed to start our server. If we want to add external links, that's where they would go. Our project uses the [express-openapi-validator](https://www.npmjs.com/package/express-openapi-validator) library that acts as a first step in the routing process - requests that are directed to paths defined in the `openapi.yaml` file are caught by this process, and it's parameters and bodyContent are validated against the schema. A successful result of this validation will be a new 'openapi' object added to the request. If the path requested is not part of the openapi.yaml file, the validator ignores the request and passes it on, as is, down the flow of the Express server.

#### api/
- **openapi.yaml** - This is the OpenAPI contract to which this server will comply. The file was generated using the codegen, and should contain everything needed to run the API Gateway - no references to external models/schemas.

#### utils/
Currently a single file:

- **openapiRouter.js** - This is where the routing to our back-end code happens. If the request object includes an ```openapi``` object, it picks up the following values (that are part of the ```openapi.yaml``` file): 'x-openapi-router-controller', and 'x-openapi-router-service'. These variables are names of files/classes in the controllers and services directories respectively. The operationId of the request is also extracted. The operationId is a method in the controller and the service that was generated as part of the codegen process. The routing process sends the request and response objects to the controller, which will extract the expected variables from the request, and send it to be processed by the service, returning the response from the service to the caller.

#### controllers/
After validating the request, and ensuring this belongs to our API gateway, we send the request to a `controller`, where the variables and parameters are extracted from the request and sent to the relevant `service` for processing. The `controller` handles the response from the `service` and builds the appropriate HTTP response to be sent back to the user.

- **index.js** - load all the controllers that were generated for this project, and export them to be used dynamically by the `openapiRouter.js`. If you would like to customize your controller, it is advised that you link to your controller here, and ensure that the codegen does not rewrite this file.

- **Controller.js** - The core processor of the generated controllers. The generated controllers are designed to be as slim and generic as possible, referencing to the `Controller.js` for the business logic of parsing the needed variables and arguments from the request, and for building the HTTP response which will be sent back. The `Controller.js` is a class with static methods.

- **.js** - auto-generated code, processing all the operations. The Controller is a class that is constructed with the service class it will be sending the request to. Every request defined by the `openapi.yaml`  has an operationId. The operationId is the name of the method that will be called. Every method receives the request and response, and calls the `Controller.js` to process the request and response, adding the service method that should be called for the actual business-logic processing.

#### services/
This is where the API Gateway ends, and the unique business-logic of your application kicks in. Every endpoint in the `openapi.yaml` has a variable 'x-openapi-router-service', which is the name of the service class that is generated. The operationID of the endpoint is the name of the method that will be called. The generated code provides a simple promise with a try/catch clause. A successful operation ends with a call to the generic `Service.js` to build a successful response (payload and response code), and a failure will call the generic `Service.js` to build a response with an error object and the relevant response code. It is recommended to have the services be generated automatically once, and after the initial build add methods manually.

- **index.js** - load all the services that were generated for this project, and export them to be used dynamically by the `openapiRouter.js`. If you would like to customize your service, it is advised that you link to your controller here, and ensure that the codegen does not rewrite this file.

- **Service.js** - A utility class, very simple and thin at this point, with two static methods for building a response object for successful and failed results in the service operation. The default response code is 200 for success and 500 for failure. It is recommended to send more accurate response codes and override these defaults when relevant.

- **.js** - auto-generated code, providing a stub Promise for each operationId defined in the `openapi.yaml`. Each method receives the variables that were defined in the `openapi.yaml` file, and wraps a Promise in a try/catch clause. The Promise resolves both success and failure in a call to the `Service.js` utility class for building the appropriate response that will be sent back to the Controller and then to the caller of this endpoint.

#### models/

## Download File Caching
Large download requests are cached in `/u2/webresults/browse-cache`. The filenames are `<hash of query parameters>.cache`. The `/home/dfweb/cache_cleanup.py` script is periodically run as a cron job to remove old cache files.
```
0 0 */10 * * python3 /webresults/cache-cleanup.py
```

## PLANS
- Migrate to ES from commonjs
- In the future we may be storing a model mask field for each family.  If so we should move towards providing all sequences in uppercase unless an
option is provided to apply a mask.  E.g families/DF0000001/sequence?format=fasta?mask=soft 
- I would like to rename /families/{id}/sequence to /families/{id}/consensus
- We should consider using a paging interface for any endpoint returning more than a specific number of records.  This would allow us to support full downloads of species libraries.
