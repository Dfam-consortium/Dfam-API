const process = require("process");
const fs = require("fs");

const winston = require("winston");

let conf_file = "../Conf/dfam.conf";
if (process.env.DFAM_CONF) {
  conf_file = process.env.DFAM_CONF;
}

const conf = JSON.parse(fs.readFileSync(conf_file));

function check(obj, name) {
  if (!obj[name]) {
    winston.error("Missing config value for: " + name);
  }
}

[
  "hmm_logos_dir", "ucsc_utils_bin", "hmmer_bin_dir", "dfam_warehouse_dir",
  "dfamdequeuer", "apiserver",
].forEach(key => check(conf, key));

if (conf.dfamdequeuer) {
  check(conf.dfamdequeuer, "result_store");
}

if (conf.apiserver) {
  ["db_timezone", "jwt_secret", "jwt_duration"].forEach(key => check(conf.apiserver, key));
}

module.exports = conf;
