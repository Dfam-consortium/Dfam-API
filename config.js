const path = require('path');
const fs = require('fs');

let conf_file = process.env.DFAM_CONF || '../Conf/dfam.conf';
const conf = JSON.parse(fs.readFileSync(conf_file));

// All these values could potentially be overriden by the conf_file
// however the expectation is only the lowercase fields will be
// overriden.
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
  apiserver: { 
      db_timezone: 'America/Los_Angeles',
      cache_dir: '',
      tmp_search_dir: ''
             },
  hmm_logos_dir: '',
  te_idx_bin: '',
  te_idx_dir: '',
  ucsc_utils_bin: '',
  hmmer_bin_dir: '',
  comsa_bin_dir: '',
  rmblast_bin_dir: '',
  repeat_peps_db: '',
  dfam_curated_db: '',
  ultra_bin_dir: '',
  rmblast_matrix_dir: '',
  ...conf
};

config.OPENAPI_YAML = path.join(config.ROOT_DIR, 'api', 'openapi.yaml');
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, 'uploaded_files');

//
// VALIDATE CONFIGURATION
//
function assertDefined(key, obj = config) {
  if (!obj[key]) throw new Error(`Missing required configuration: ${key}`);
}

function assertIsDir(dirPath, label = dirPath) {
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) throw new Error(`${label} is not a directory`);
}

function assertIsFile(filePath, label = filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error(`${label} is not a file`);
}

function assertExecutable(filePath) {
  fs.accessSync(filePath, fs.constants.X_OK);
}

function assertReadable(filePath) {
  fs.accessSync(filePath, fs.constants.R_OK);
}

function assertExecutableInDir(dir, exeList) {
  assertIsDir(dir);
  for (const exe of exeList) {
    const fullPath = path.join(dir, exe);
    try {
      assertExecutable(fullPath);
    } catch {
      throw new Error(`Executable '${exe}' missing or not executable in: ${dir}`);
    }
  }
}

// === BASIC FIELDS ===
assertDefined('apiserver');
assertDefined('db_timezone', config.apiserver);

// === hmm_logos_dir ===
try {
  assertIsDir(config.hmm_logos_dir);
  assertExecutable(path.join(config.hmm_logos_dir, 'webGenLogoImage.pl'));
} catch (err) {
  throw new Error(`hmm_logos_dir validation failed: ${err.message}`);
}

// === te_idx_bin / te_idx_dir ===
assertDefined('te_idx_bin');
assertDefined('te_idx_dir');
assertIsFile(config.te_idx_bin);
assertExecutable(config.te_idx_bin);
assertIsDir(config.te_idx_dir);

// === ucsc_utils_bin ===
assertDefined('ucsc_utils_bin');
assertExecutableInDir(config.ucsc_utils_bin, ['twoBitToFa', 'faSize', 'faOneRecord', 'faFrag']);

// === hmmer_bin_dir ===
assertDefined('hmmer_bin_dir');
assertExecutableInDir(config.hmmer_bin_dir, ['nhmmer']);

// === comsa_bin_dir ===
assertDefined('comsa_bin_dir');
assertExecutableInDir(config.comsa_bin_dir, ['CoMSA']);

// === tmp_search_dir ===
assertDefined('tmp_search_dir', config.apiserver);
try {
  assertIsDir(config.apiserver.tmp_search_dir);
  const testFile = path.join(config.apiserver.tmp_search_dir, `.writetest-${Date.now()}`);
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (err) {
  throw new Error(`apiserver.tmp_search_dir validation failed: ${err.message}`);
}

// === rmblast_bin_dir ===
assertDefined('rmblast_bin_dir');
assertExecutableInDir(config.rmblast_bin_dir, ['rmblastn', 'blastx']);

// === repeat_peps_db ===
assertDefined('repeat_peps_db');
try {
  assertIsFile(config.repeat_peps_db);
  assertReadable(`${config.repeat_peps_db}.psq`);
} catch (err) {
  throw new Error(`repeat_peps_db validation failed: ${err.message}`);
}

// === dfam_curated_db ===
assertDefined('dfam_curated_db');
try {
  assertIsFile(config.dfam_curated_db);
  assertReadable(`${config.dfam_curated_db}.nsq`);
} catch (err) {
  throw new Error(`dfam_curated_db validation failed: ${err.message}`);
}

// === ultra_bin_dir ===
assertDefined('ultra_bin_dir');
assertExecutableInDir(config.ultra_bin_dir, ['ultra']);

// === rmblast_matrix_dir (with subfile check) ===
assertDefined('rmblast_matrix_dir');
try {
  assertIsDir(config.rmblast_matrix_dir);
  assertReadable(path.join(config.rmblast_matrix_dir, 'nt', 'comparison.matrix'));
} catch (err) {
  throw new Error(`rmblast_matrix_dir validation failed: ${err.message}`);
}

// === cache_dir ===
assertDefined('cache_dir', config.apiserver);
assertIsDir(config.apiserver.cache_dir);

module.exports = config;

