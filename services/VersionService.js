const Service = require('./Service');
const config = require('../config');
const conn = require("../databases.js").getConn_Dfam();

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
      const query = "SELECT dfam_version, total_families, curated_families, species FROM db_version";

      let data = await conn.query( query, { type: "SELECT" })
      data = data[0]
      resolve(Service.successResponse(
        {
          payload: { 
            "major": config.VERSION_MAJOR,
            "minor": config.VERSION_MINOR, 
            "bugfix": config.VERSION_BUGFIX,
            "dfam_version": data.dfam_version,
            "total_families": data.total_families,
            "curated_families": data.curated_families,
            "species": data.species
          }
        }
      ));
   
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
