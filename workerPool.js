/*
 * Piscina Thread Worker Management
 *   - This is a generic pool of between 5-10 workers for use in
 *     data conversion/formatting endpoints that tend to take
 *     longer to process.
 *   - Note that the worker id's may increase over time there is
 *     never more than maxThreads (actual count = piscina.threads.length) 
 *     workers running at one time. This is due to the ability of
 *     Piscina to retire threads when the server load is low.
 *
 */
const path = require('path');
const Piscina = require('piscina'); 
const logger = require('./logger');

const piscina = new Piscina({
  filename: path.resolve(__dirname, 'utils/worker.js'),
  minThreads: 5,
  maxThreads: 10 
});
//  minThreads: 5,
//  maxThreads: 10 
logger.info("Initialized Piscina thread pool");

module.exports = {
  "piscina": piscina
};
