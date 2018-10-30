'use strict';

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const conn = require("../databases.js").dfam;
const winston = require("winston");
const zlib = require("zlib");

const familyModel = require("../models/family.js")(conn, Sequelize);
const aliasModel = require("../models/family_database_alias.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const rmSubTypeModel = require("../models/repeatmasker_subtype.js")(conn, Sequelize);
const rmStageModel = require("../models/repeatmasker_stage.js")(conn, Sequelize);
const familyHasBufferStageModel = require("../models/family_has_buffer_stage.js")(conn, Sequelize);
const citationModel = require("../models/citation.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const modelDataModel = require("../models/model_data.js")(conn, Sequelize);
const seedCoverageDataModel = require("../models/seed_coverage_data.js")(conn, Sequelize);
const familyOverlapModel = require("../models/family_overlap.js")(conn, Sequelize);
const overlapSegmentModel = require("../models/overlap_segment.js")(conn, Sequelize);
const writer = require("../utils/writer.js");


familyModel.hasMany(aliasModel, { foreignKey: 'family_id', as: 'aliases' });
familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id', as: 'classification' });
familyModel.belongsToMany(rmStageModel, { as: 'search_stages', through: 'family_has_search_stage', foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(rmStageModel, { as: 'buffer_stages', through: familyHasBufferStageModel, foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(citationModel, { as: 'citations', through: 'family_has_citation', foreignKey: 'family_id', otherKey: 'citation_pmid' });
familyModel.belongsToMany(dfamTaxdbModel, { as: 'clades', through: 'family_clade', foreignKey: 'family_id', otherKey: 'dfam_taxdb_tax_id' });
classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id', as: 'rm_type' });
classificationModel.belongsTo(rmSubTypeModel, { foreignKey: 'repeatmasker_subtype_id', as: 'rm_subtype' });
modelDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });
seedCoverageDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });
familyOverlapModel.belongsTo(familyModel, { foreignKey: 'family1_id', as: 'family1' });
familyOverlapModel.belongsTo(familyModel, { foreignKey: 'family2_id', as: 'family2' });
familyOverlapModel.hasMany(overlapSegmentModel, { foreignKey: 'family_overlap_id' });

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
      "accession": "accession",
      "name": "name",
      "description": "description",
      "length": "length",
    });

    if (row.classification) {
      obj.classification = await getClassificationPath(row.classification.id);
      if (row.classification.rm_type) {
        obj.repeat_type_name = row.classification.rm_type.name;
      }
      if (row.classification.rm_subtype) {
        obj.repeat_subtype_name = row.classification.rm_subtype.name;
      }
    }

    if (format == "summary") {
      return obj;
    }

    mapFields(row, obj, {
      "consensus": "consensus_sequence",
      "author": "author",
      "date_created": "date_created",
      "date_modified": "date_modified",
      "target_site_cons": "target_site_cons",
      "refineable": "refineable",
      "disabled": "disabled",
    });

    const aliases = obj["aliases"] = [];
    if (row.aliases) {
      row.aliases.forEach(function(alias) {
        aliases.push(mapFields(alias, {}, { "db_id": "database", "db_link": "alias" }));
      });
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

  var selects = [ "family.id AS id", "family.accession", "family.name AS name", "length", "family.description AS description", "classification.id AS classification_id", "repeatmasker_type.name AS type", "repeatmasker_subtype.name AS subtype" ];
  const from = "family LEFT JOIN classification ON family.classification_id = classification.id" +
" LEFT JOIN repeatmasker_type ON classification.repeatmasker_type_id = repeatmasker_type.id" +
" LEFT JOIN repeatmasker_subtype ON classification.repeatmasker_subtype_id = repeatmasker_subtype.id";
  const where = ["1"];

  if (format != "summary") {
    selects = selects.concat([ "consensus", "author", "date_created", "date_modified", "target_site_cons", "refineable", "disabled" ]);
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

  var count_sql = "SELECT COUNT(*) as total_count FROM " + from + " WHERE " + where.join(" AND ");
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

  return Promise.all([
    conn.query(count_sql, { type: "SELECT", replacements }),
    conn.query(sql, { type: "SELECT", replacements }),
  ]).then(function([count_result, rows]) {
    const total_count = count_result[0].total_count;
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
      })).then(function(objs) {
        return { total_count, results: objs };
      });
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
    where: { accession: id },
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


/**
 * Retrieve an individual Dfam family's HMM data
 *
 * id String The Dfam family name
 * format String The desired output format, \"hmm\" or \"logo\"
 * no response value expected for this operation
 **/
exports.readFamilyHmm = function(id, format) {
  var field;
  var content_type;
  if (format == "hmm") {
    // TODO: This is un-annotated. Should we return annotated?
    field = "hmm";
    content_type = "text/plain";
  } else if (format == "logo") {
    field = "hmm_logo";
    content_type = "application/json";
  } else {
    throw new Error("Invalid format: " + format);
  }

  return modelDataModel.findOne({
    attributes: [ field ],
    include: [ { model: familyModel, where: { accession: id } } ],
  }).then(function(model) {
    return new Promise(function(resolve, reject) {
      zlib.gunzip(model[field], function(err, data) {
        if (err) { reject(err); }
        else { resolve(data); }
      });
    }).then(function(data) {
      return { data, content_type };
    });
  });
}


/**
 * Retrieve an individual Dfam family's relationship information
 *
 * id String The Dfam family name
 * no response value expected for this operation
 **/
exports.readFamilyRelationships = function(id) {
  return familyOverlapModel.findAll({
    include: [
      { model: familyModel, as: 'family1' },
      { model: familyModel, as: 'family2' },
      overlapSegmentModel,
    ],
    where: {
      [Sequelize.Op.or]: {
        '$family1.accession$': id,
      }
    }
  }).then(function(overlaps) {
    var all_overlaps = [];

    overlaps.forEach(function(overlap) {
      const family_map = {
        "name": "id",
        "accession": "accession",
        "length": "length",
      };
      const model_info = mapFields(overlap.family1, {}, family_map);
      const target_info = mapFields(overlap.family2, {}, family_map);

      all_overlaps = all_overlaps.concat(overlap.overlap_segments.map(function(overlap_segment) {
        const seg = mapFields(overlap_segment, {}, {
          "strand": "strand",
          "evalue": "evalue",
          "identity": "identity",
          "coverage": "coverage",
          "cigar": "cigar",

          "family1_start": "model_start",
          "family2_start": "target_start",
          "family1_end": "model_end",
          "family2_end": "target_end",
        });

        seg.auto_overlap = {
          model: model_info,
          target: target_info,
        };

        return seg;
      }));
    });

    return all_overlaps;
  });
}


/**
 * Retrieve an individual Dfam family's HMM data
 *
 * id String The Dfam family name
 * format String The desired output format, \"graph\" or \"stockholm\"
 * no response value expected for this operation
 **/
exports.readFamilySeed = function(id,format) {
  var field;
  var content_type;
  if (format == "graph") {
    return seedCoverageDataModel.findOne({
      attributes: [ "whisker", "seed" ],
      include: [ { model: familyModel, where: { accession: id } } ],
    }).then(function(coverage_data) {
      return {
        data: JSON.stringify({
          whisker: JSON.parse(coverage_data.whisker),
          seed: JSON.parse(coverage_data.seed),
        }),
        content_type: "application/json",
      };
    });

  } else if (format == "stockholm") {
    return modelDataModel.findOne({
      attributes: [ "seed" ],
      include: [ { model: familyModel, where: { accession: id } } ],
    }).then(function(model) {
      return new Promise(function(resolve, reject) {
        zlib.gunzip(model.seed, function(err, data) {
          if (err) { reject(err); }
          else { resolve(data); }
        });
      }).then(function(data) {
        return { data, content_type: "text/plain" };
      });
    });
  } else {
    throw new Error("Invalid format: " + format);
  }

}

