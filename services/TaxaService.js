const Service = require('./Service');
const Sequelize = require("sequelize");
const conn = require("../databases.js").getConn_Dfam();
const dfam = require("../databases.js").getModels_Dfam();
const escape_sql_like = require("../utils/escape").escape_sql_like;

/**
* Retrieve statistics on Dfam's coverage of species.
* Retrieve statistics on Dfam's coverage of species.
*
* returns taxaCoverageResponse
* */
const readCoverage = async function () {
  const query = "SELECT species FROM db_version";
  // const query = "SELECT COUNT(DISTINCT dfam_taxdb_tax_id) AS count FROM family_clade JOIN ncbi_taxdb_nodes ON ncbi_taxdb_nodes.tax_id = dfam_taxdb_tax_id WHERE ncbi_taxdb_nodes.rank IN ('species', 'subspecies')";
  return conn.query( query, { type: "SELECT" })
    .then((rows) => {
      return Service.successResponse(rows[0]);
    })
    .catch((e) => {
      return  Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405 );
    });
};

/**
* Query Dfam's copy of the NCBI taxonomy database.
* Query Dfam's copy of the NCBI taxonomy database.
*
* name String Search string for taxonomy name.
* annotated Boolean Whether only taxa with annotated assemblies should be returned. (optional)
* limit Integer Only return up to a maximum number of matching taxa. (optional)
* returns taxaResponse
* */
const readTaxa = async function({ name, annotated, limit }) {
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
      return Service.successResponse({ "taxa": results.map(r => ({ "id": r.tax_id, "name": r.name_txt, "assembly": r.assembly.name }))});
    })
      .catch((e) => {
        return  Service.rejectResponse(
          e.message || 'Invalid input',
          e.status || 405 );
      });
  } else {
    const query = "SELECT tax_id, CASE WHEN unique_name <> '' THEN unique_name ELSE name_txt END AS display_name FROM ncbi_taxdb_names WHERE name_class = 'scientific name' AND name_txt LIKE :where_contains ESCAPE '#' ORDER BY (CASE WHEN display_name = :where_name THEN 1 WHEN display_name LIKE :where_prefix ESCAPE '#' THEN 2 ELSE 3 END), display_name LIMIT :limit";
    const replacements = {
      where_name: name,
      where_prefix: escape_sql_like(name, "#") + "%",
      where_contains: "%" + escape_sql_like(name, "#") + "%",
      limit: parseInt(limit) || 20,
    };

    return conn.query(query, { type: "SELECT", replacements })
      .then(function(results) {
        return Service.successResponse({ "taxa": results.map(r => ({ "id": r.tax_id, "name": r.display_name }))});
      })
      .catch((e) => {
        return  Service.rejectResponse(
          e.message || 'Invalid input',
          e.status || 405 );
      });
  }
};



/**
* Retrieve the name of a single taxon by its identifier.
* Retrieve the name of a single taxon by its identifier.
*
* id Integer The identifier of the taxonomy node to retrieve.
* returns taxonResponse
* */
const readTaxaById = async function({ id }) {
  try {
    let taxon =  await dfam.ncbiTaxdbNamesModel.findOne({
      attributes: ["tax_id", "name_txt"],
      where: { tax_id: id, name_class: "scientific name" },
    });
    if (!taxon) {
      return Service.successResponse("Taxon Not Found", 404);
    }
    return Service.successResponse({ "id": taxon.tax_id, "name": taxon.name_txt });
    
  } catch (e) {
    return  Service.rejectResponse(
      e.message || 'Invalid input',
      e.status || 405 );
  }
};

      
module.exports = {
  readCoverage,
  readTaxa,
  readTaxaById,
};
