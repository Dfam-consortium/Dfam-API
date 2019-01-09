const process = require("process");
const fs = require("fs");

let conf_file = "../Conf/dfam.conf";
if (process.env.DFAM_CONF) {
  conf_file = process.env.DFAM_CONF;
}

const conf = JSON.parse(fs.readFileSync(conf_file));

module.exports = conf;
