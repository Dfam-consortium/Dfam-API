# DFAM-API server

## Usage

### Dependencies

All node.js runtime dependencies are specified in `package.json`.

The core functionality of the API depends on:

* A mysql database server with Dfam databases
* Dfam-warehouse directory containing reference genomes and other caches

Some functionality requires these additional tools:

* `twoBitToFa`, `faSize` from the UCSC Genome Browser tools suite
* `nhmmer` from the HMMER suite
* `HMM_Logos`, specifically webGenLogoImage.pl
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

## Development Notes

This server was generated by the
[swagger-codegen](https://github.com/swagger-api/swagger-codegen) project.  The
general project structure has not been changed: controllers in `controllers`
read the parameters, dispatch them to `services`, and format the results.

This server uses [Sequelize](https://github.com/sequelize/sequelize) for
database access. When possible, Sequelize models are preferred over hand-built
SQL queries.

See the `autogen/README` file for more information about the swagger API and
Sequelize model generation.

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

### Testing

A [Postman](https://getpostman.com) collection is maintained
at `api/api.postman_collection.json` for developement and
testing.

To run the test suite (implemented in tests/), run

```
npm test
```

Or to get an accompanying coverage report:

```
npm run coverage
```

### Building Documentation

```
npm run build-docs
```

And to deploy them:
```
cp -r autogen/apidocs/ /path/to/target

e.g.
  cp -r autogen/apidocs/ /usr/local/Dfam-warehouse/releases/Dfam_3.0
         
```
