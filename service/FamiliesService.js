'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const zlib = require("zlib");
const mapFields = require("../utils/mapFields.js");
const child_process = require('child_process');

const familyModel = require("../models/family.js")(conn, Sequelize);
const aliasModel = require("../models/family_database_alias.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const rmSubTypeModel = require("../models/repeatmasker_subtype.js")(conn, Sequelize);
const rmStageModel = require("../models/repeatmasker_stage.js")(conn, Sequelize);
const familyHasBufferStageModel = require("../models/family_has_buffer_stage.js")(conn, Sequelize);
const citationModel = require("../models/citation.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data.js")(conn, Sequelize);
const seedRegionModel = require("../models/seed_region.js")(conn, Sequelize);
const familyOverlapModel = require("../models/family_overlap.js")(conn, Sequelize);
const overlapSegmentModel = require("../models/overlap_segment.js")(conn, Sequelize);
const escape = require("../utils/escape.js");
const writer = require("../utils/writer.js");

seedRegionModel.removeAttribute('id');

familyModel.hasMany(aliasModel, { foreignKey: 'family_id', as: 'aliases' });
familyModel.hasMany(seedRegionModel, { foreignKey: 'family_id' });
familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id', as: 'classification' });
familyModel.belongsToMany(rmStageModel, { as: 'search_stages', through: 'family_has_search_stage', foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(rmStageModel, { as: 'buffer_stages', through: familyHasBufferStageModel, foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(citationModel, { as: 'citations', through: 'family_has_citation', foreignKey: 'family_id', otherKey: 'citation_pmid' });
familyModel.belongsToMany(dfamTaxdbModel, { as: 'clades', through: 'family_clade', foreignKey: 'family_id', otherKey: 'dfam_taxdb_tax_id' });

classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id', as: 'rm_type' });
classificationModel.belongsTo(rmSubTypeModel, { foreignKey: 'repeatmasker_subtype_id', as: 'rm_subtype' });

hmmModelDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });

familyOverlapModel.belongsTo(familyModel, { foreignKey: 'family1_id', as: 'family1' });
familyOverlapModel.belongsTo(familyModel, { foreignKey: 'family2_id', as: 'family2' });
familyOverlapModel.hasMany(overlapSegmentModel, { foreignKey: 'family_overlap_id' });

function familyQueryRowToObject(row, format) {
  const obj = mapFields(row, {}, {
    "accession": "accession",
    "name": "name",
    "description": "description",
    "length": "length",
  });

  if (row.classification) {
    obj.classification = row.classification.lineage;
    if (row.classification.rm_type) {
      obj.repeat_type_name = row.classification.rm_type.name;
    }
    if (row.classification.rm_subtype) {
      obj.repeat_subtype_name = row.classification.rm_subtype.name;
    }
  }

  obj["clades"] = [];
  if (row.clades) {
    obj["clades"] = row.clades.map(cl => cl.scientific_name);
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
    "model_mask": "model_mask",
    "hmm_general_nc": "hmm_general_nc",
  });

  if (obj.refineable !== undefined) {
    obj.refineable = Boolean(obj.refineable);
  }

  if (obj.disabled !== undefined) {
    obj.disabled = Boolean(obj.disabled);
  }

  const aliases = obj["aliases"] = [];
  if (row.aliases) {
    row.aliases.forEach(function(alias) {
      aliases.push(mapFields(alias, {}, { "db_id": "database", "db_link": "alias" }));
    });
  }

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
 * classification String Search term for classification (optional)
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
exports.readFamilies = function(format,sort,name,name_prefix,classification,clade,type,subtype,updated_after,updated_before,desc,keywords,start,limit) {

  const replacements = {};

  var selects = [ "family.id AS id", "family.accession", "family.name AS name", "length", "family.description AS description", "classification.id AS classification_id", "classification.lineage as classification_lineage", "repeatmasker_type.name AS type", "repeatmasker_subtype.name AS subtype" ];
  const from = "family LEFT JOIN classification ON family.classification_id = classification.id" +
" LEFT JOIN repeatmasker_type ON classification.repeatmasker_type_id = repeatmasker_type.id" +
" LEFT JOIN repeatmasker_subtype ON classification.repeatmasker_subtype_id = repeatmasker_subtype.id";
  const where = ["1"];

  if (format != "summary") {
    selects = selects.concat([ "consensus", "author", "date_created", "date_modified", "target_site_cons", "refineable", "disabled", "model_mask", "hmm_general_nc" ]);
  }

  if (name) {
    where.push("family.name LIKE :where_name ESCAPE '#'");
    replacements.where_name = "%" + escape.escape_sql_like(name, '#') + "%";
  } else if (name_prefix) {
    where.push("family.name LIKE :where_name ESCAPE '#'");
    replacements.where_name = escape.escape_sql_like(name_prefix, '#') + "%";
  }

  if (classification) {
    where.push("classification.lineage LIKE :where_classification ESCAPE '#'");
    replacements.where_classification = "%" + escape.escape_sql_like(classification, '#') + "%";
  }

  if (clade) {
    where.push("(SELECT COUNT(*) FROM family_clade INNER JOIN dfam_taxdb ON family_clade.dfam_taxdb_tax_id = dfam_taxdb.tax_id WHERE family_id = family.id AND lineage LIKE :where_clade ESCAPE '#') > 0");
    replacements.where_clade = "%" + escape.escape_sql_like(clade, '#') + "%";
  }

  if (desc) {
    where.push("family.description LIKE :where_desc ESCAPE '#'");
    replacements.where_desc = "%" + escape.escape_sql_like(desc, '#') + "%";
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

  if (keywords) {
    var i = 0;
    keywords.split(" ").forEach(function(word) {
      i++;
      var key = "where_keywords" + i;

      where.push(`((family.name LIKE :${key} ESCAPE '#') OR (family.description LIKE :${key} ESCAPE '#') OR (accession LIKE :${key} ESCAPE '#') OR (author LIKE :${key} ESCAPE '#'))`);
      replacements[key] = "%" + escape.escape_sql_like(word, '#') + "%";
    });
  }

  var count_sql = "SELECT COUNT(*) as total_count FROM " + from + " WHERE " + where.join(" AND ");
  var sql = "SELECT " + selects.join(",") + " FROM " + from + " WHERE " + where.join(" AND ");

  // TODO: Implement more complex sort keys
  const sortKeys = [ "accession", "name", "length", "type", "subtype", "date_created", "date_modified" ];

  const orderBy = [];
  if (sort) {
    sort.split(",").forEach(function(term) {
      const match = /(\S+):(asc|desc)/.exec(term);
      if (match && sortKeys.find(sk => sk == match[1])) {
        orderBy.push(match[1] + " " + match[2]);
      }
    });
    if (orderBy.length) {
      sql += " ORDER BY " + orderBy.join(",");
    }
  }

  if (limit !== undefined) {
    sql += " LIMIT :limit";
    replacements.limit = limit;
  }

  if (start !== undefined) {
    sql += " OFFSET :offset";
    replacements.offset = start;
  }

  return Promise.all([
    conn.query(count_sql, { type: "SELECT", replacements }),
    conn.query(sql, { type: "SELECT", replacements }),
  ]).then(function([count_result, rows]) {
    const total_count = count_result[0].total_count;

    return Promise.all(rows.map(function(row) {
      var replacements = { family_id: row.id };

      const subqueries = [];

      subqueries.push(conn.query("SELECT scientific_name FROM family_clade INNER JOIN dfam_taxdb ON family_clade.dfam_taxdb_tax_id = dfam_taxdb.tax_id WHERE family_id = :family_id", { type: "SELECT", replacements }).then(cla => row.clades = cla));

      if (format != "summary") {
        subqueries.push(conn.query("SELECT db_id, db_link FROM family_database_alias WHERE family_id = :family_id", { type: "SELECT", replacements }).then(a => row.aliases = a));
        subqueries.push(conn.query("SELECT name FROM family_has_search_stage INNER JOIN repeatmasker_stage ON family_has_search_stage.repeatmasker_stage_id = repeatmasker_stage.id WHERE family_id = :family_id", { type: "SELECT", replacements }).then(ss => row.search_stages = ss));
        subqueries.push(conn.query("SELECT name, start_pos, end_pos FROM family_has_buffer_stage INNER JOIN repeatmasker_stage ON family_has_buffer_stage.repeatmasker_stage_id = repeatmasker_stage.id WHERE family_id = :family_id", { type: "SELECT", replacements }).then(function(buffer_stages) {
          row.buffer_stages = buffer_stages.map(function(bs) {
            return { name: bs.name, family_has_buffer_stage: { start_pos: bs.start_pos, end_pos: bs.end_pos } };
          });
        }));
        subqueries.push(conn.query("SELECT pmid, title, authors, journal, pubdate FROM family_has_citation INNER JOIN citation ON family_has_citation.citation_pmid = citation.pmid WHERE family_id = :family_id", { type: "SELECT", replacements }).then(cit => row.citations = cit));
      }

      return Promise.all(subqueries).then(function() {
        row.classification = {
          id: row.classification_id,
          lineage: row.classification_lineage,
          rm_type: { name: row.type },
          rm_subtype: { name: row.subtype }
        };
        return familyQueryRowToObject(row, format);
      });
    })).then(function(objs) {
      return { total_count, results: objs };
    });
  });
};


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
};


/**
 * Retrieve an individual Dfam family's HMM data
 *
 * id String The Dfam family name
 * format String The desired output format, \"hmm\" or \"logo\" or \"image\"
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
  } else if (format == "image") {
    field = "hmm";
    content_type = "image/png";
  } else {
    throw new Error("Invalid format: " + format);
  }

  return hmmModelDataModel.findOne({
    attributes: [ field ],
    include: [ { model: familyModel, where: { accession: id }, attributes: [] } ],
  }).then(function(model) {
    return new Promise(function(resolve, reject) {
      if (!model || !model[field]) {
        return resolve(null);
      }

      // TODO: Consider a streaming approach with 'data'

      zlib.gunzip(model[field], function(err, data) {
        if (err) { reject(err); }
        else { resolve(data); }
      });
    }).then(function(data) {
      if (format == "image") {

        return new Promise(function(resolve, reject) {
          // TODO: configurable HMM_Logos script location
          const proc = child_process.spawn('/usr/local/HMM_Logos/webGenLogoImage.pl',
            { stdio: ['pipe', 'pipe', 'inherit'] }
          );

          const chunks = [];
          proc.stdout.on('data', chunk => chunks.push(chunk));
          proc.on('close', function(code) {
            if (code == 0) {
              resolve(Buffer.concat(chunks));
            } else {
              reject(new Error("Error converting HMM to PNG image."));
            }
          });

          proc.stdin.write(data);
          proc.stdin.end();
        });
      } else {
        return data;
      }
    }).then(function(data) {
      if (data) {
        return { data, content_type };
      } else {
        return null;
      }
    });
  });
};


/**
 * Retrieve an individual Dfam family's relationship information
 *
 * id String The Dfam family name
 * no response value expected for this operation
 **/
exports.readFamilyRelationships = function(id) {
  return familyOverlapModel.findAll({
    include: [
      { model: familyModel, as: 'family1', attributes: ["name", "accession", "length"] },
      { model: familyModel, as: 'family2', attributes: ["name", "accession", "length"] },
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
};

// TODO: Move this to Dfam-js
function seedRegionsToStockholm(family) {
  if (family == null || family.seed_regions == null || family.seed_regions.length == 0)
    return;
  var seedRegions = family.seed_regions;

  var insLocs = {};
  var insRE = /([a-z]+)/g;
  var matches;
  var matchColCnt = -1;
  var stockholmSeqs = [];
  seedRegions.forEach(function(region) {
    stockholmSeqs.push(region.a2m_seq);
    // Create a non-gap RF line with the correct match column length
    if (matchColCnt < 0)
      matchColCnt = (region.a2m_seq.match(/[A-Z-]/g) || []).length;
    var prevLen = 0;
    while ((matches = insRE.exec(region.a2m_seq)) != null) {
      var len = matches[1].length;
      var idx = insRE.lastIndex - len - prevLen;
      if (insLocs[idx] == null || insLocs[idx] < len)
        insLocs[idx] = len;
      prevLen += len;
    }
  });

  var stockholmStr = "# STOCKHOLM 1.0\n" +
    "#=GF ID " + family.name + "\n";
  if (family.description != null)
    stockholmStr += "#=GF CC " + family.description + "\n";
  stockholmStr += "#=GF SQ " + seedRegions.length + "\n";

  // Sort highest indexes first so we can insert without affecting
  // future indices.
  var RF = "";
  RF += "X".repeat(matchColCnt);
  var sortedIdxs = Object.keys(insLocs).sort(function(a, b) {
    return b - a;
  });
  sortedIdxs.forEach(function(idx) {
    var insStr = "";
    insStr += ".".repeat(insLocs[idx]);
    RF = RF.substring(0, idx) + insStr + RF.substring(idx);
  });

  stockholmStr += "#=GC RF " + RF + "\n";

  for (var i = 0; i < stockholmSeqs.length; i++) {
    var seq = stockholmSeqs[i];
    var j = 0;
    var refPos = 0;
    var tmpSeq = "";
    while (j < seq.length) {
      var ref = RF.substring(refPos, refPos + 1);
      var seqBase = seq.substring(j, j + 1);
      if (ref == ".") {
        if (/[A-Z-]/.test(seqBase)) {
          // emit a placeholder "."
          tmpSeq += '.';
        } else {
          // else keep the current character
          tmpSeq += seqBase;
          j++;
        }
      } else {
        tmpSeq += seqBase;
        j++;
      }
      refPos++;
    }
    stockholmSeqs[i] = tmpSeq.replace(/-/g, ".").toUpperCase();
    stockholmStr += seedRegions[i].seq_id + "  " + stockholmSeqs[i] + "\n";
  }
  stockholmStr += "//\n";
  return stockholmStr;
}

/**
 * Retrieve an individual Dfam family's seed alignment data
 *
 * id String The Dfam family name
 * no response value expected for this operation
 **/
exports.readFamilySeed = function(id,format) {
  return familyModel.findOne({
    attributes: [ "id", "name", "description" ],
    where: { accession: id },
  }).then(function(family) {
    return seedRegionModel.findAll({
      attributes: [ "a2m_seq", "seq_id" ],
      where: { family_id: family.id },
    }).then(function(seed_regions) {
      family.seed_regions = seed_regions;
      return {
        data: seedRegionsToStockholm(family),
        content_type: "text/plain",
      };
    });
  });
};

