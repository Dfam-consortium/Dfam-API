'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const ncbiTaxonomyNames = require("../models/ncbi_taxdb_names.js")(conn, Sequelize);
const ncbiTaxonomyNodes = require("../models/ncbi_taxdb_nodes.js")(conn, Sequelize);

/**
 * Query the local copy of the NCBI taxonomy database
 *
 * name String Search string for taxonomy name
 * limit Integer Only return up to a maximum number of hits
 * returns taxaResponse
 **/
exports.readTaxa = function(name,limit) {
  return ncbiTaxonomyNames.findAll({
    where: {
      name_class: "scientific name",
      name_txt: { [Sequelize.Op.like]: name + "%" },
    },
    limit: limit || 20,
  }).then(function(results) {
    return { "taxa": results.map(r => ({ "species_name": r.name_txt })) };
  });
}

