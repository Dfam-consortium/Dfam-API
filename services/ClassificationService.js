/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Retrieve the entire TE classification hierarchy used by Dfam.
* Retrieve the entire TE classification hierarchy used by Dfam.
*
* name String Classification name to search for. If given, the results will be returned as an array instead of the default hierarchical format. (optional)
* returns classesResponse
* */
const readClassification = ({ name }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        name,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  readClassification,
};
