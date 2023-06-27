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
      // The current validator (OpenAPIValidator) when validating the API responses will
      // only complain if a require field is missing.  If extra field exist in the payload
      // it will ignore them.
      resolve(Service.successResponse({ "major": config.VERSION_MAJOR, "minor": config.VERSION_MINOR, "bugfix": config.VERSION_BUGFIX }));
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
