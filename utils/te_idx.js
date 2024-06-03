const child_process = require('child_process');
const {IDX_DIR} = require('../config');

async function idx_query(args, join=true) {
  let res = await new Promise((resolve, reject) => {
    let runner = child_process.spawn(`${IDX_DIR}/target/release/te_idx`, ["idx-query", ...args]);
    let data=[];
    runner.on('error', err => { reject(err) });
    runner.stdout.on('data', d => { data.push(d) });
    runner.on('close', (code) => {
      if (code !== 0) { reject(code) }
      else { 
        data = join ? data.join('') : data
        resolve(JSON.parse(data.toString())) 
      }
    })
  })
  return res
}

async function get_chrom_id(args) {
  let res = await new Promise((resolve, reject) => {
    let val;
    let runner = child_process.spawn(`${IDX_DIR}/target/release/te_idx`, ["get-chrom-id", ...args]);
    runner.on('error', err => { reject(err) });
    runner.stdout.on('data', d => { val = d.toString().trim() });
    runner.on('close', (code) => {
      if (code != 0) { resolve(false) }
      else { resolve(val) }
    })
  })
  return res
}

module.exports = {
  idx_query,
  get_chrom_id
}