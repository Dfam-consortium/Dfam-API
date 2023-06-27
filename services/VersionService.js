/* eslint-disable no-unused-vars */
const Service = require('./Service');
const config = require('../config');

/**
* Return the version of the API.
* Return the version of the API.
*
* returns versionResponse
* */
const getVersion = () => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({ "major": config.VERSION_MAJOR, "minor": "3", "bugfix": "11", "bar": "21" }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  getVersion,
};
