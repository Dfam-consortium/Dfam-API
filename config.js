const path = require('path');
const fs = require("fs");

let conf_file = "../Conf/dfam.conf";
if (process.env.DFAM_CONF) {
  conf_file = process.env.DFAM_CONF;
}
const conf = JSON.parse(fs.readFileSync(conf_file));

const config = {
  ROOT_DIR: __dirname,
  URL_PORT: 10012,
  URL_PATH: 'https://dfam.org',
  BASE_VERSION: '',
  CONTROLLER_DIRECTORY: path.join(__dirname, 'controllers'),
  PROJECT_DIR: __dirname,
  VERSION_MAJOR: '0',
  VERSION_MINOR: '4',
  VERSION_BUGFIX: '0',
  CACHE_CUTOFF: 100,
};

for(var key in conf)
{
  config[key] = conf[key];
}

config.OPENAPI_YAML = path.join(config.ROOT_DIR, 'api', 'openapi.yaml');
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, 'uploaded_files');

module.exports = config;
