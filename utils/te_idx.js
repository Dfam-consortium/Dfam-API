const child_process = require('child_process');
const {te_idx_bin} = require('../config');

async function query(args) {
  let res = await new Promise((resolve, reject) => {
    let runner = child_process.spawn(te_idx_bin, args);
    let data='';
    runner.on('error', err => { reject(err); });
    runner.stdout.on('data', d => { data += d; });
    runner.on('close', (code) => {
      if (code !== 0) { reject(code); }
      else { 
        resolve(JSON.parse(data));
      }
    });
  });
  return res;
}

async function chromInAssembly(full_assembly, chrom) {
  let res = await new Promise((resolve, reject) => {
    let args = ["--assembly", full_assembly, "json-query", "--data-type", "sequences", "--key", chrom];
    let data = 0;
    let runner = child_process.spawn(te_idx_bin, args);
    runner.on('error', err => { reject(err);});
    runner.stdout.on('data', d => {data = parseInt(d.toString()); });
    runner.on('close', (code) => {
      if (code !== 0) { reject(code); }
      else {
        if (data > 0) {
          resolve(true);
        }
        else {
          resolve(false);
        }
      }
    });
  });
  return res;
}

module.exports = {
  query,
  chromInAssembly
};