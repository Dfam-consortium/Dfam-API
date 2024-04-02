const child_process = require('child_process');
const {IDX_DIR} = require('../config');

module.exports = async function te_idx(args, join=true) {
    let res = await new Promise((resolve, reject) => {
      let runner = child_process.spawn(`${IDX_DIR}/target/release/te_idx`, args);
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