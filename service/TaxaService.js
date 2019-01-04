'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const escape_sql_like = require("../utils/escape").escape_sql_like;
const assembly = require("../models/assembly.js")(conn, Sequelize);
const ncbiTaxonomyNames = require("../models/ncbi_taxdb_names.js")(conn, Sequelize);

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
      attributes: ["tax_id", "name_txt"],
      where: {
        name_class: "scientific name",
        name_txt: { [Sequelize.Op.like]: "%" + name + "%" },
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

