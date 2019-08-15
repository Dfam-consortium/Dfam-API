'use strict';

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const dfam = require("../databases.js").dfam_models;

/**
 * Retrieve a list of annotated assemblies in Dfam
 *
 * returns assembliesResponse
 **/
exports.readAssemblies = function() {
  return dfam.assemblyModel.findAll({
    where: { display_order: { [Op.gt]: 0 } },
    include: [ dfam.dfamTaxdbModel ],
    order_by: [ "display_order" ],
  }).then(function(assemblies) {
    return assemblies.map(function(row) {
      return { id: row.name, name: row.dfam_taxdb.scientific_name };
    });
  });
};
