'use strict';

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const conn = require("../databases.js").dfam;
const winston = require("winston");

const familyModel = require("../models/family.js")(conn, Sequelize);
const aliasModel = require("../models/family_database_alias.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const rmSubTypeModel = require("../models/repeatmasker_subtype.js")(conn, Sequelize);
const rmStageModel = require("../models/repeatmasker_stage.js")(conn, Sequelize);
const familyHasBufferStageModel = require("../models/family_has_buffer_stage.js")(conn, Sequelize);
const citationModel = require("../models/citation.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const writer = require("../utils/writer.js");


familyModel.hasMany(aliasModel, { foreignKey: 'family_id', as: 'aliases' });
familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id', as: 'classification' });
familyModel.belongsToMany(rmStageModel, { as: 'search_stages', through: 'family_has_search_stage', foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(rmStageModel, { as: 'buffer_stages', through: familyHasBufferStageModel, foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(citationModel, { as: 'citations', through: 'family_has_citation', foreignKey: 'family_id', otherKey: 'citation_pmid' });
familyModel.belongsToMany(dfamTaxdbModel, { as: 'clades', through: 'family_clade', foreignKey: 'family_id', otherKey: 'dfam_taxdb_tax_id' });
classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id', as: 'rm_type' });
classificationModel.belongsTo(rmSubTypeModel, { foreignKey: 'repeatmasker_subtype_id', as: 'rm_subtype' });


// TODO: Implement per-search cache or cache invalidation
const classification_paths = {};

// getClassificationPath builds a ;-delimited path, for example
// root;Interspersed_Repeat;Transposable_Element;...
async function getClassificationPath(cls_id) {
  if (classification_paths[cls_id]) {
    return classification_paths[cls_id];
  }

  const cls = await classificationModel.findOne({ where: { id: cls_id } });
  if (!cls) {
    return null;
  }

  const par_id = cls.parent_id;
  var name;
  if (par_id) {
    const par_name = await getClassificationPath(par_id);
    name = par_name + ";" + cls.name;
  } else {
    name = cls.name;
  }

  classification_paths[cls_id] = name;
  return name;
}


function mapFields(source, dest, mapping) {
  Object.keys(mapping).forEach(function(key) {
    const newKey = mapping[key];
    if (source[key]) {
      dest[newKey] = source[key];
    }
  });

  return dest;
}

async function familyQueryRowToObject(row, format) {
    const obj = mapFields(row, {}, {
      "id": "id",
      "name": "name",
      "author": "author",
      "date_created": "date_created",
      "date_modified": "date_modified",
      "description": "description",
      "target_site_cons": "target_site_cons",
      "refineable": "refineable",
      "disabled": "disabled",
    });

    if (format != "summary") {
      // TODO: Decide which fields are not part of the "summary" format
      mapFields(row, obj, {
        // TODO: Use real consensus instead
        "model_consensus": "consensus_sequence",
      });
    }

    const aliases = obj["aliases"] = [];
    if (row.aliases) {
      row.aliases.forEach(function(alias) {
        aliases.push(mapFields(alias, {}, { "db_id": "database", "db_link": "alias" }));
      });
    }

    if (row.classification) {
      obj.classification = await getClassificationPath(row.classification.id);
      if (row.classification.rm_type) {
        obj.repeat_type_name = row.classification.rm_type.name;
      }
      if (row.classification.rm_subtype) {
        obj.repeat_subtype_name = row.classification.rm_subtype.name;
      }
    }

    // TODO: Can this be flattened into an Array<String>?
    const search_stages = obj["search_stages"] = [];
    if (row.search_stages) {
      row.search_stages.forEach(function(ss) {
        search_stages.push({ name: ss.name });
      });
    }

    const buffer_stages = obj["buffer_stages"] = [];
    if (row.buffer_stages) {
      row.buffer_stages.forEach(function(bs) {
        buffer_stages.push({
          name: bs.name,
          start: bs.family_has_buffer_stage.start_pos,
          end: bs.family_has_buffer_stage.end_pos,
        });
      });
    }

    const citations = obj["citations"] = [];
    if (row.citations) {
      row.citations.forEach(function(c) {
        citations.push(mapFields(c, {}, {
          "pmid": "pmid",
          "title": "title",
          "authors": "authors",
          "journal": "journal",
          "pubdate": "pubdate",
        }));
      });
    }

    // TODO: Can this be flattened into an Array<String>?
    const clades = obj["clades"] = [];
    if (row.clades) {
      row.clades.forEach(function(cl) {
        clades.push(mapFields(cl, {}, { "scientific_name": "name" }));
      });
    }

    // TODO: assembly_annots

    return obj;
}

/**
 * Returns a list of Dfam families optionally filtered and sorted.
 *
 * format String Desired output format (optional)
 * sort String A string containing the ordered sort columns (optional)
 * name String Search term for repeat identifier (optional)
 * name_prefix String Search term for repeat name prefix ( overriden by \"name\" search ) (optional)
 * clade String Search term for repeat clade (optional)
 * type String Search term for repeat type (optional)
 * subtype String Search term for repeat subtype (optional)
 * updated_after date Filter by \"updated on or after\" date (optional)
 * updated_before date Filter by \"updated on or before\" date (optional)
 * desc String Search term for repeat description (optional)
 * start Integer Start index ( for range queries ) (optional)
 * limit Integer Records to return ( for range queries ) (optional)
 * returns familiesResponse
 **/
exports.readFamilies = function(format,sort,name,name_prefix,clade,type,subtype,updated_after,updated_before,desc,start,limit) {

  const replacements = {};

  const selects = [ "family.id AS id", "family.name AS name", "author", "date_created", "date_modified", "family.description AS description", "target_site_cons", "refineable", "disabled", "classification.id AS classification_id", "repeatmasker_type.name AS type", "repeatmasker_subtype.name AS subtype" ];
  const from = "family LEFT JOIN classification ON family.classification_id = classification.id" +
" LEFT JOIN repeatmasker_type ON classification.repeatmasker_type_id = repeatmasker_type.id" +
" LEFT JOIN repeatmasker_subtype ON classification.repeatmasker_subtype_id = repeatmasker_subtype.id";
  const where = ["1"];

  if (format != "summary") {
    selects.push("model_consensus");
  }

  if (name) {
    where.push("family.name LIKE :where_name");
    replacements.where_name = "%" + name + "%";
  } else if (name_prefix) {
    where.push("family.name LIKE :where_name");
    replacements.where_name = name_prefix + "%";
  }

  if (clade) {
    where.push("(SELECT COUNT(*) FROM family_clade INNER JOIN dfam_taxdb ON family_clade.dfam_taxdb_tax_id = dfam_taxdb.tax_id WHERE family_id = family.id AND scientific_name LIKE :where_clade) > 0");
    replacements.where_clade = "%" + clade + "%";
  }

  if (desc) {
    where.push("family.description LIKE :where_desc");
    replacements.where_desc = "%" + desc + "%";
  }

  if (type) {
    where.push("repeatmasker_type.name = :where_type");
    replacements.where_type = type;
  }

  if (subtype) {
    where.push("repeatmasker_subtype.name = :where_subtype");
    replacements.where_subtype = subtype;
  }

  if (updated_after) {
    where.push("(date_modified > :where_after OR date_created > :where_after)");
    replacements.where_after = new Date(updated_after);
  }

  if (updated_before) {
    where.push("(date_modified < :where_before OR date_created < :where_before)");
    replacements.where_before = new Date(updated_before);
  }

  var sql = "SELECT " + selects.join(",") + " FROM " + from + " WHERE " + where.join(" AND ");

  // TODO: Implement more complex sort keys
  const sortKeys = [ "name", "type", "subtype", "date_created", "date_modified" ];

  const orderBy = [];
  if (sort) {
    sort.split(",").forEach(function(term) {
      const match = /(\S+):(asc|desc)/.exec(term);
      if (match && sortKeys[match[1]]) {
        orderBy.push(match[1] + " " + match[2]);
      }
    });
    if (orderBy.length) {
      console.log(orderBy);
      sql += " ORDER BY " + orderBy.join(",");
    }
  }

  if (limit) {
    sql += " LIMIT :limit";
    replacements.limit = limit;
  }

  if (start) {
    sql += " OFFSET :offset";
    replacements.offset = start;
  }

  return conn.query(sql, { type: "SELECT", replacements }).then(function(rows) {
    if (rows.length) {
      return Promise.all(rows.map(function(row) {
        var replacements = { family_id: row.id };

        return Promise.all([
          conn.query("SELECT db_id, db_link FROM family_database_alias WHERE family_id = :family_id", { type: "SELECT", replacements }),
          conn.query("SELECT name FROM family_has_search_stage INNER JOIN repeatmasker_stage ON family_has_search_stage.repeatmasker_stage_id = repeatmasker_stage.id WHERE family_id = :family_id", { type: "SELECT", replacements }),
          conn.query("SELECT name, start_pos, end_pos FROM family_has_buffer_stage INNER JOIN repeatmasker_stage ON family_has_buffer_stage.repeatmasker_stage_id = repeatmasker_stage.id WHERE family_id = :family_id", { type: "SELECT", replacements }),
          conn.query("SELECT pmid, title, authors, journal, pubdate FROM family_has_citation INNER JOIN citation ON family_has_citation.citation_pmid = citation.pmid WHERE family_id = :family_id", { type: "SELECT", replacements }),
          conn.query("SELECT scientific_name FROM family_clade INNER JOIN dfam_taxdb ON family_clade.dfam_taxdb_tax_id = dfam_taxdb.tax_id WHERE family_id = :family_id", { type: "SELECT", replacements }),
        ]).then(function([aliases, search_stages, buffer_stages, citations, clades]) {
          row.aliases = aliases;
          row.search_stages = search_stages;
          row.buffer_stages = [];
          buffer_stages.forEach(function(bs) {
            row.buffer_stages.push({ name: bs.name, family_has_buffer_stage: { start_pos: bs.start_pos, end_pos: bs.end_pos } });
          });
          row.citations = citations;
          row.clades = clades;
          row.classification = { id: row.classification_id, rm_type: { name: row.type }, rm_subtype: { name: row.subtype } };
          return familyQueryRowToObject(row, format);
        });
      }));
    } else {
      return writer.respondWithCode(404, "");
    }
  });
}


/**
 * Retrieve an individual Dfam family.
 *
 * id String The Dfam family name
 * returns familyResponse
 **/
exports.readFamilyById = function(id) {
  return familyModel.findOne({
    where: { name: id },
    include: [
      'aliases',
      { model: classificationModel, as: 'classification', include: [ 'rm_type', 'rm_subtype' ] },
      { model: rmStageModel, as: 'search_stages' },
      { model: rmStageModel, as: 'buffer_stages', through: {
        attributes: [ 'start_pos', 'end_pos'],
      } },
      { model: citationModel, as: 'citations' },
      { model: dfamTaxdbModel, as: 'clades' },
    ]
  }).then(function(row) {
    if (row) {
      return familyQueryRowToObject(row);
    } else {
      return writer.respondWithCode(404, "");
    }
  });
}

