'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const assembly = require("../models/assembly.js")(conn, Sequelize);
const ncbiTaxonomyNames = require("../models/ncbi_taxdb_names.js")(conn, Sequelize);
const ncbiTaxonomyNodes = require("../models/ncbi_taxdb_nodes.js")(conn, Sequelize);

ncbiTaxonomyNames.belongsTo(assembly, { foreignKey: 'tax_id', targetKey: 'dfam_taxdb_tax_id' });

/**
 * Query the local copy of the NCBI taxonomy database
 *
 * name String Search string for taxonomy name
 * limit Integer Only return up to a maximum number of hits
 * returns taxaResponse
 **/
exports.readTaxa = function(name,limit,annotated) {
  if (annotated) {
    return ncbiTaxonomyNames.findAll({
      attributes: ["name_txt"],
      where: {
        name_class: "scientific name",
        name_txt: { [Sequelize.Op.like]: name + "%" },
      },
      include: {
        model: assembly,
        attributes: ["name"],
        where: {
          schema_name: { [Sequelize.Op.like]: "_%" },
        }
      },
      order: [
        [ { model: assembly}, 'display_order' ],
      ],
      limit: limit || 20,
    }).then(function(results) {
      return { "taxa": results.map(r => ({ "assembly": r.assembly.name, "species_name": r.name_txt })) };
    });
  } else {
    return ncbiTaxonomyNames.findAll({
      attributes: ["name_txt"],
      where: {
        name_class: "scientific name",
        name_txt: { [Sequelize.Op.like]: name + "%" },
      },
      limit: limit || 20,
    }).then(function(results) {
      return { "taxa": results.map(r => ({ "species_name": r.name_txt })) };
    });
  }
}

