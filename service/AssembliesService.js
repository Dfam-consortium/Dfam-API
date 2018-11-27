'use strict';

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const conn = require("../databases.js").dfam;

const assemblyModel = require("../models/assembly.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);

const writer = require("../utils/writer.js");
const mapFields = require("../utils/mapFields.js");

assemblyModel.belongsTo(dfamTaxdbModel, { foreignKey: 'dfam_taxdb_tax_id' });

/**
 * Retrieve a list of annotated assemblies in Dfam
 *
 * returns assembliesResponse
 **/
exports.readAssemblies = function() {
  return assemblyModel.findAll({
    where: { display_order: { [Op.gt]: 0 } },
    include: [ dfamTaxdbModel ],
    order_by: [ "display_order" ],
  }).then(function(assemblies) {
    return assemblies.map(function(row) {
      return { id: row.name, name: row.dfam_taxdb.scientific_name };
    });
  });
}
