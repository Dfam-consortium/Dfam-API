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

module.exports = {
  query,
}