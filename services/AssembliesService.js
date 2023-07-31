/* eslint-disable no-unused-vars */
const Service = require('./Service');
const dfam = require("../databases").getModels_Dfam();
const { Op } = require("sequelize");

/**
* Retrieve a list of all genome assemblies in Dfam that have annotations.
*
* returns List
* */
const readAssemblies = () => new Promise(
  async (resolve, reject) => {
    try {

      const assemblies = await dfam.assemblyModel.findAll({
        where: {
          display_order: {[Op.gt]: 0 }
        },
        include: [dfam.dfamTaxdbModel],
        order_by: ["display_order"]
      })

      resolve(Service.successResponse(assemblies.map(
        (row) => {
          return { id: row.name, name: row.dfam_taxdb.scientific_name }
        }
      )));

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
