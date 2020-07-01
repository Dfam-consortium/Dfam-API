'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const dfam = require("../databases.js").dfam_models;
const escape_sql_like = require("../utils/escape").escape_sql_like;

/**
 * Query the local copy of the NCBI taxonomy database
 *
 * name String Search string for taxonomy name
 * limit Integer Only return up to a maximum number of hits
 * returns taxaResponse
 **/
exports.readTaxa = function(name,limit,annotated) {
  if (annotated) {
    return dfam.ncbiTaxdbNamesModel.findAll({
      attributes: ["tax_id", "name_txt"],
      where: {
        name_class: "scientific name",
        name_txt: { [Sequelize.Op.like]: "%" + name + "%" },
      },
      include: {
        model: dfam.assemblyModel,
        attributes: ["name"],
        where: {
          schema_name: { [Sequelize.Op.like]: "_%" },
        }
      },
      order: [
        [ { model: dfam.assemblyModel }, 'display_order' ],
      ],
      limit: limit || 20,
    }).then(function(results) {
      return { "taxa": results.map(r => ({ "id": r.tax_id, "name": r.name_txt, "assembly": r.assembly.name })) };
    });
  } else {
    const query = "SELECT tax_id, CASE WHEN unique_name <> '' THEN unique_name ELSE name_txt END AS display_name FROM ncbi_taxdb_names WHERE name_class = 'scientific name' AND name_txt LIKE :where_contains ESCAPE '#' ORDER BY (CASE WHEN display_name = :where_name THEN 1 WHEN display_name LIKE :where_prefix ESCAPE '#' THEN 2 ELSE 3 END), display_name LIMIT :limit";
    const replacements = {
      where_name: name,
      where_prefix: escape_sql_like(name, "#") + "%",
      where_contains: "%" + escape_sql_like(name, "#") + "%",
      limit: parseInt(limit) || 20,
    };

    return conn.query(query, { type: "SELECT", replacements }).then(function(results) {
      return { "taxa": results.map(r => ({ "id": r.tax_id, "name": r.display_name })) };
    });
  }
};

/**
 * Get statistics on Dfam's coverage of species.
 *
 * returns taxaCoverageResponse
 **/
exports.readCoverage = function() {
  const query = "SELECT COUNT(DISTINCT dfam_taxdb_tax_id) AS count FROM family_clade JOIN ncbi_taxdb_nodes ON ncbi_taxdb_nodes.tax_id = dfam_taxdb_tax_id WHERE ncbi_taxdb_nodes.rank IN ('species', 'subspecies')";
  return conn.query(query, { type: "SELECT" }).then(function(rows) {
    return { "count": rows[0].count };
  });
};


/**
 * Retrieve information about a single taxon by ID.
 *
 * id Integer Taxa ID to look up
 * returns taxonResponse
 **/
exports.readTaxaById = function(id) {
  return dfam.ncbiTaxdbNamesModel.findOne({
    attributes: ["tax_id", "name_txt"],
    where: { tax_id: id, name_class: "scientific name" },
  }).then(function(taxon) {
    if (!taxon) {
      return null;
    }

    return { "id": taxon.tax_id, "name": taxon.name_txt };
  });
};
