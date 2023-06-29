const path = require('path');
const Piscina = require('piscina'); 

const piscina = new Piscina({
  filename: path.resolve(__dirname, 'utils/worker.js'),
  minThreads: 5,
  maxThreads: 10 
});
console.log("Instantiated Piscina");

module.exports = {
  "piscina": piscina
};
