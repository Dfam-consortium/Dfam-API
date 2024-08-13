const child_process = require('child_process');
const {te_idx_bin} = require('../config');

async function query(args, join=true) {
  let res = await new Promise((resolve, reject) => {
    let runner = child_process.spawn(te_idx_bin, args);
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

async function chromInAssembly(full_assembly, chrom) {
  let res = await new Promise((resolve, reject) => {
    let args = ["--assembly", full_assembly, "json-query", "--data-type", "sequences", "--key", chrom]
    let data = 0
    let runner = child_process.spawn(te_idx_bin, args);
    runner.on('error', err => { reject(err)});
    runner.stdout.on('data', d => {data = parseInt(d.toString()) });
    runner.on('close', (code) => {
      if (code !== 0) { reject(code) }
      else {
        if (data > 0) {
          resolve(true)
        }
        else {
          resolve(false)
        }
      }
    })
  })
  return res
}

module.exports = {
  query,
  chromInAssembly
}