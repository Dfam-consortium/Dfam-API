const path = require('path');
const fs = require("fs");

let conf_file = "../Conf/dfam.conf";
if (process.env.DFAM_CONF) {
  conf_file = process.env.DFAM_CONF;
}
const conf = JSON.parse(fs.readFileSync(conf_file));

const config = {
  ROOT_DIR: __dirname,
  URL_PORT: 10011,
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

//
// VALIDATE THE CONFIG BEFORE STARTING UP
//

// Validate that tmp_search_dir is set and writable
if (!config.tmp_search_dir) {
  throw new Error("Missing required configuration: tmp_search_dir");
}
try {
  const stat = fs.statSync(config.tmp_search_dir);
  if (!stat.isDirectory()) {
    throw new Error(`tmp_search_dir exists but is not a directory: ${config.tmp_search_dir}`);
  }

  // Try writing a temporary file to test writability
  const testFile = path.join(config.tmp_search_dir, `.writetest-${Date.now()}`);
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (err) {
  throw new Error(`tmp_search_dir validation failed: ${err.message}`);
}

// Validate that rmblast_bin_dir is set, is a directory, and contains required executables
if (!config.rmblast_bin_dir) {
  throw new Error("Missing required configuration: rmblast_bin_dir");
}

try {
  const stat = fs.statSync(config.rmblast_bin_dir);
  if (!stat.isDirectory()) {
    throw new Error(`rmblast_bin_dir exists but is not a directory: ${config.rmblast_bin_dir}`);
  }

  const requiredExecutables = ['rmblastn', 'blastx'];

  for (const exe of requiredExecutables) {
    const exePath = path.join(config.rmblast_bin_dir, exe);

    try {
      fs.accessSync(exePath, fs.constants.X_OK);
    } catch (err) {
      throw new Error(`Executable '${exe}' not found or not executable in rmblast_bin_dir: ${exePath}`);
    }
  }
} catch (err) {
  throw new Error(`rmblast_bin_dir validation failed: ${err.message}`);
}

// Validate that repeat_peps_db is set and has corresponding .psq file
if (!config.repeat_peps_db) {
  throw new Error("Missing required configuration: repeat_peps_db");
}

try {
  const mainFile = config.repeat_peps_db;
  const psqFile = `${mainFile}.psq`;

  const stat = fs.statSync(mainFile);
  if (!stat.isFile()) {
    throw new Error(`repeat_peps_db is not a valid file: ${mainFile}`);
  }

  fs.accessSync(psqFile, fs.constants.R_OK);
} catch (err) {
  throw new Error(`repeat_peps_db validation failed: ${err.message}`);
}

// Validate that dfam_curated_db is set and has corresponding .nsq file
if (!config.dfam_curated_db) {
  throw new Error("Missing required configuration: dfam_curated_db");
}

try {
  const mainFile = config.dfam_curated_db;
  const nsqFile = `${mainFile}.nsq`;

  const stat = fs.statSync(mainFile);
  if (!stat.isFile()) {
    throw new Error(`dfam_curated_db is not a valid file: ${mainFile}`);
  }

  fs.accessSync(nsqFile, fs.constants.R_OK);
} catch (err) {
  throw new Error(`dfam_curated_db validation failed: ${err.message}`);
}

// Validate that ultra_bin_dir is set, is a directory, and contains the 'ultra' executable
if (!config.ultra_bin_dir) {
  throw new Error("Missing required configuration: ultra_bin_dir");
}

try {
  const stat = fs.statSync(config.ultra_bin_dir);
  if (!stat.isDirectory()) {
    throw new Error(`ultra_bin_dir exists but is not a directory: ${config.ultra_bin_dir}`);
  }

  const ultraPath = path.join(config.ultra_bin_dir, 'ultra');
  fs.accessSync(ultraPath, fs.constants.X_OK);
} catch (err) {
  throw new Error(`ultra_bin_dir validation failed: ${err.message}`);
}

// Validate that rmblast_matrix_dir is set, is a directory, and contains nt/comparison.matrix
if (!config.rmblast_matrix_dir) {
  throw new Error("Missing required configuration: rmblast_matrix_dir");
}

try {
  const stat = fs.statSync(config.rmblast_matrix_dir);
  if (!stat.isDirectory()) {
    throw new Error(`rmblast_matrix_dir is not a valid directory: ${config.rmblast_matrix_dir}`);
  }

  const matrixPath = path.join(config.rmblast_matrix_dir, 'nt', 'comparison.matrix');
  fs.accessSync(matrixPath, fs.constants.R_OK);
} catch (err) {
  throw new Error(`rmblast_matrix_dir validation failed: ${err.message}`);
}

module.exports = config;
