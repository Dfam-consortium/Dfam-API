/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Retrieve a list of all genome assemblies in Dfam that have annotations.
* Retrieve a list of all genome assemblies in Dfam that have annotations.
*
* returns List
* */
const readAssemblies = () => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
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
  readAssemblies,
};
