const path = require('path');
const Piscina = require('piscina'); 

//
//
// Note that the worker id's may increase over time there is
// never more than maxThreads (actual count = piscina.threads.length) 
// workers running at one time. This is due to the ability of u
// Piscina to retire threads when the server load is low.
//
const piscina = new Piscina({
  filename: path.resolve(__dirname, 'utils/worker.js'),
  minThreads: 5,
  maxThreads: 10 
});
console.log("Instantiated Piscina");

module.exports = {
  "piscina": piscina
};
