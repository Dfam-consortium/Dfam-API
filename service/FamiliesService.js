'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const zlib = require("zlib");
const mapFields = require("../utils/mapFields.js");
const child_process = require('child_process');
const config = require("../config");
const path = require("path");
const runWorkerAsync = require('../utils/async').runWorkerAsync;
const APIResponse = require('../utils/response').APIResponse;

const familyModel = require("../models/family.js")(conn, Sequelize);
const aliasModel = require("../models/family_database_alias.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const rmSubTypeModel = require("../models/repeatmasker_subtype.js")(conn, Sequelize);
const rmStageModel = require("../models/repeatmasker_stage.js")(conn, Sequelize);
const familyHasBufferStageModel = require("../models/family_has_buffer_stage.js")(conn, Sequelize);
const citationModel = require("../models/citation.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const ncbiTaxdbNamesModel = require("../models/ncbi_taxdb_names.js")(conn, Sequelize);
const ncbiTaxdbNodesModel = require("../models/ncbi_taxdb_nodes.js")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data.js")(conn, Sequelize);
const seedAlignDataModel = require("../models/seed_align_data.js")(conn, Sequelize);
const familyOverlapModel = require("../models/family_overlap.js")(conn, Sequelize);
const overlapSegmentModel = require("../models/overlap_segment.js")(conn, Sequelize);
const curationStateModel = require("../models/curation_state.js")(conn, Sequelize);
const familyFeatureModel = require("../models/family_feature.js")(conn, Sequelize);
const featureAttributeModel = require("../models/feature_attribute.js")(conn, Sequelize);
const codingSequenceModel = require("../models/coding_sequence.js")(conn, Sequelize);

const conn_users = require('../databases').users;
const userModel = require('../models/auth/user')(conn_users, Sequelize);

const escape = require("../utils/escape.js");

familyModel.hasMany(aliasModel, { foreignKey: 'family_id', as: 'aliases' });
familyModel.belongsTo(curationStateModel, { foreignKey: 'curation_state_id', as: 'curation_state' });
familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id', as: 'classification' });
familyModel.belongsToMany(rmStageModel, { as: 'search_stages', through: 'family_has_search_stage', foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(rmStageModel, { as: 'buffer_stages', through: familyHasBufferStageModel, foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(citationModel, { as: 'citations', through: 'family_has_citation', foreignKey: 'family_id', otherKey: 'citation_pmid' });
familyModel.belongsToMany(dfamTaxdbModel, { as: 'clades', through: 'family_clade', foreignKey: 'family_id', otherKey: 'dfam_taxdb_tax_id' });
familyModel.hasMany(familyFeatureModel, { foreignKey: 'family_id', as: 'features' });
familyFeatureModel.hasMany(featureAttributeModel, { foreignKey: 'family_feature_id', as: 'feature_attributes' });
familyModel.hasMany(codingSequenceModel, { foreignKey: 'family_id', as: 'coding_sequences' });

ncbiTaxdbNamesModel.belongsTo(ncbiTaxdbNodesModel, { foreignKey: 'tax_id' });
ncbiTaxdbNamesModel.belongsTo(dfamTaxdbModel, { foreignKey: 'tax_id' });

ncbiTaxdbNodesModel.hasMany(ncbiTaxdbNamesModel, { foreignKey: 'tax_id' });

classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id', as: 'rm_type' });
classificationModel.belongsTo(rmSubTypeModel, { foreignKey: 'repeatmasker_subtype_id', as: 'rm_subtype' });

hmmModelDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });

familyOverlapModel.belongsTo(familyModel, { foreignKey: 'family1_id', as: 'family1' });
familyOverlapModel.belongsTo(familyModel, { foreignKey: 'family2_id', as: 'family2' });
familyOverlapModel.hasMany(overlapSegmentModel, { foreignKey: 'family_overlap_id' });

function familySubqueries(rows, format) {
  return Promise.all(rows.map(function(row) {
    var replacements = { family_id: row.id };

    const subqueries = [];

    subqueries.push(conn.query("SELECT lineage FROM family_clade INNER JOIN dfam_taxdb ON family_clade.dfam_taxdb_tax_id = dfam_taxdb.tax_id WHERE family_id = :family_id", { type: "SELECT", replacements }).then(cla => row.clades = cla));

    if (format != "summary") {
      subqueries.push(conn.query("SELECT db_id, db_link FROM family_database_alias WHERE family_id = :family_id", { type: "SELECT", replacements }).then(a => row.aliases = a));
      subqueries.push(conn.query("SELECT name FROM family_has_search_stage INNER JOIN repeatmasker_stage ON family_has_search_stage.repeatmasker_stage_id = repeatmasker_stage.id WHERE family_id = :family_id", { type: "SELECT", replacements }).then(ss => row.search_stages = ss));
      subqueries.push(conn.query("SELECT name, start_pos, end_pos FROM family_has_buffer_stage INNER JOIN repeatmasker_stage ON family_has_buffer_stage.repeatmasker_stage_id = repeatmasker_stage.id WHERE family_id = :family_id", { type: "SELECT", replacements }).then(function(buffer_stages) {
        row.buffer_stages = buffer_stages.map(function(bs) {
          return { name: bs.name, family_has_buffer_stage: { start_pos: bs.start_pos, end_pos: bs.end_pos } };
        });
      }));
      subqueries.push(conn.query("SELECT pmid, title, authors, journal, pubdate FROM family_has_citation INNER JOIN citation ON family_has_citation.citation_pmid = citation.pmid WHERE family_id = :family_id", { type: "SELECT", replacements }).then(cit => row.citations = cit));
      subqueries.push(userModel.findOne({ where: { id: row.deposited_by_id }, attributes: [ 'full_name' ] }).then(function(user) {
        if (user) {
          row.submitter = user.full_name;
        }
      }));
      subqueries.push(familyFeatureModel.findAll({
        where: { family_id: row.id },
        include: [
          { model: featureAttributeModel, as: 'feature_attributes' }
        ] }).then(function(features) { row.features = features; }));
      subqueries.push(codingSequenceModel.findAll({
        where: { family_id: row.id }
      }).then(function(coding_sequences) { row.coding_sequences = coding_sequences; }));
    }

    return Promise.all(subqueries).then(() => row);
  }));
}

function familyQueryRowToObject(row, format) {
  const obj = mapFields(row, {}, {
    "accession": "accession",
    "name": "name",
    "title": "title",
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
    obj["clades"] = row.clades.map(cl => cl.lineage);
  }

  if (format == "summary") {
    return obj;
  }

  mapFields(row, obj, {
    "consensus": "consensus_sequence",
    "author": "author",
    "submitter": "submitter",
    "date_created": "date_created",
    "date_modified": "date_modified",
    "target_site_cons": "target_site_cons",
    "refineable": "refineable",
    "disabled": "disabled",
    "model_mask": "model_mask",
    "hmm_general_threshold": "hmm_general_threshold",
  });

  if (obj.refineable !== undefined) {
    obj.refineable = Boolean(obj.refineable);
  }

  if (obj.disabled !== undefined) {
    obj.disabled = Boolean(obj.disabled);
  }

  if (row.curation_state) {
    obj.curation_state_name = row.curation_state.name;
    obj.curation_state_description = row.curation_state.description;
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

  const features = obj["features"] = [];
  if (row.features) {
    row.features.forEach(function(f) {
      const feature = mapFields(f, {}, {
        "feature_type": "type",
        "description": "description",
        "model_start_pos": "model_start_pos",
        "model_end_pos": "model_end_pos",
        "label": "label",
      });
      feature.attributes = [];
      f.feature_attributes.forEach(function(a) {
        feature.attributes.push(mapFields(a, {}, {
          "attribute": "attribute",
          "value": "value",
        }));
      });
      features.push(feature);
    });
  }

  const coding_seqs = obj["coding_seqs"] = [];
  if (row.coding_sequences) {
    row.coding_sequences.forEach(function(cs) {
      const cds = mapFields(cs, {}, {
        "product": "product",
        "translation": "translation",
        "cds_start": "start",
        "cds_end": "end",
        "exon_count": "exon_count",
        "external_reference": "external_reference",
        "reverse": "reverse",
        "stop_codons": "stop_codons",
        "frameshifts": "frameshifts",
        "gaps": "gaps",
        "percent_identity": "percent_identity",
        "left_unaligned": "left_unaligned",
        "right_unaligned": "right_unaligned",
        "classification_id": "classification_id",
        "align_data": "align_data",
        "description": "description",
        "protein_type": "protein_type",
      });

      // 'reverse' is stored as an integer
      cds.reverse = !!cds.reverse;

      // Coordinates are stored 0-based half open, but the API needs to return
      // 1-based closed. To accomplish this, 1 is added to start and exon_starts.
      // TODO: When the database becomes 1-based closed, remove the adjusting code.
      if (cds.start !== undefined && cds.start !== null) {
        cds.start += 1;
      }

      if (cs.exon_starts) {
        cds.exon_starts = cs.exon_starts.toString().split(",").map(x => parseInt(x) + 1);
      }
      if (cs.exon_ends) {
        cds.exon_ends = cs.exon_ends.toString().split(",").map(x => parseInt(x));
      }

      coding_seqs.push(cds);
    });
  }

  return obj;
}

// Helper function for collecting ancestor/descendant clade information
// Returns a promise.
// If the specified clade is not present, the result is null.
// Otherwise, result.ids is a list of IDs (self + ancestors) and
// result.lineage is a lineage string (useful for searching descendants).
// result.ids will only contain ancestors if clade_relatives is "ancestors" or "both"
async function collectClades(clade, clade_relatives) {
  const result = { ids: [], lineage: null };

  // Try clade by ID first
  const id = parseInt(clade);
  let record;
  if (!isNaN(id)) {
    record = await ncbiTaxdbNamesModel.findOne({
      where: { tax_id: id, name_class: 'scientific name' },
      attributes: [ 'tax_id', 'name_txt' ],
      include: [
        { model: ncbiTaxdbNodesModel, attributes: [ "parent_id" ] },
      ],
    });
  }

  // Then try by scientific name
  if (!record) {
    record = await ncbiTaxdbNamesModel.findOne({
      where: { name_class: 'scientific name', name_txt: clade },
      attributes: [ 'tax_id', 'name_txt' ],
      include: [
        { model: ncbiTaxdbNodesModel, attributes: [ "parent_id" ] },
      ],
    });
  }

  if (!record) {
    return null;
  }

  // Primary results: the given ID and its lineage
  result.ids.push(record.tax_id);
  result.lineage = record.name_txt;

  // Secondary query: parent IDs
  const recurseParents = async function(parent_id) {
    const parent = await ncbiTaxdbNodesModel.findOne({
      attributes: [ 'tax_id', 'parent_id' ],
      where: { tax_id: parent_id },
      include: [
        { model: ncbiTaxdbNamesModel, where: { name_class: 'scientific name' }, attributes: [ 'name_txt' ] },
      ]
    });

    if (parent) {
      if (clade_relatives === "ancestors" || clade_relatives === "both") {
        result.ids.push(parent.tax_id);
      }

      let parent_name = "";
      if (parent.ncbi_taxdb_names.length) {
        parent_name = parent.ncbi_taxdb_names[0].name_txt;
      }
      result.lineage = parent_name + ";" + result.lineage;

      if (parent_id !== 1) {
        return recurseParents(parent.parent_id);
      }
    }
  };

  let recurseParentsPromise;
  if (record.tax_id !== 1) {
    recurseParentsPromise = recurseParents(record.ncbi_taxdb_node.parent_id);
  } else {
    recurseParentsPromise = Promise.resolve();
  }

  await recurseParentsPromise;
  return result;
}

/**
 * Returns a list of Dfam families optionally filtered and sorted.
 *
 * format String Desired output format (optional)
 * sort String A string containing the ordered sort columns (optional)
 * name String Search term for repeat identifier (optional)
 * name_prefix String Search term for repeat name prefix ( overriden by \"name\" search ) (optional)
 * name_accession String Search term for repeat name or accession (optional)
 * classification String Search term for repeat classification (optional)
 * clade String Search term for repeat clade (optional)
 * clade_relatives String Relatives of the requested clade to include: 'ancestors', 'descendants', or 'both' (optional)
 * type String Search term for repeat type (optional)
 * subtype String Search term for repeat subtype (optional)
 * updated_after date Filter by \"updated on or after\" date (optional)
 * updated_before date Filter by \"updated on or before\" date (optional)
 * desc String Search term for repeat description (optional)
 * keywords String Keywords to search in text fields (optional)
 * start Integer Start index ( for range queries ) (optional)
 * limit Integer Records to return ( for range queries ) (optional)
 * returns familiesResponse
 **/
exports.readFamilies = async function(format,sort,name,name_prefix,name_accession,classification,clade,clade_relatives,type,subtype,updated_after,updated_before,desc,keywords,start,limit) {

  if (!format) {
    format = "summary";
  }

  if (format !== "summary" && format !== "full") {
    return Promise.resolve(new APIResponse({ message: "Unrecognized format: " + format}, 400));
  }

  const clade_info = await collectClades(clade, clade_relatives);

  const replacements = {};

  var selects = [ "family.id AS id", "family.accession", "family.name AS name", "family.title AS title", "length", "family.description AS description", "classification.id AS classification_id", "classification.lineage as classification_lineage", "repeatmasker_type.name AS type", "repeatmasker_subtype.name AS subtype" ];
  let from = "family LEFT JOIN classification ON family.classification_id = classification.id" +
" LEFT JOIN repeatmasker_type ON classification.repeatmasker_type_id = repeatmasker_type.id" +
" LEFT JOIN repeatmasker_subtype ON classification.repeatmasker_subtype_id = repeatmasker_subtype.id ";
  const where = ["1"];

  if (format != "summary") {
    from += " LEFT JOIN curation_state ON family.curation_state_id = curation_state.id ";
    selects = selects.concat([
      "consensus", "author", "deposited_by_id", "date_created", "date_modified",
      "target_site_cons", "refineable", "disabled", "model_mask", "hmm_general_threshold",
      "curation_state.name AS curation_state_name",
      "curation_state.description AS curation_state_description"
    ]);
  }

  if (name) {
    where.push("family.name LIKE :where_name ESCAPE '#'");
    replacements.where_name = "%" + escape.escape_sql_like(name, '#') + "%";
  } else if (name_prefix) {
    where.push("family.name LIKE :where_name ESCAPE '#'");
    replacements.where_name = escape.escape_sql_like(name_prefix, '#') + "%";
  } else if (name_accession) {
    where.push("(family.name LIKE :where_name_acc ESCAPE '#' OR family.accession LIKE :where_name_acc ESCAPE '#')");
    replacements.where_name_acc = "%" + escape.escape_sql_like(name_accession, '#') + "%";
  }

  if (classification) {
    where.push("(classification.lineage = :where_classification OR classification.lineage LIKE :where_classification_descendants ESCAPE '#')");
    replacements.where_classification = classification;
    replacements.where_classification_descendants = escape.escape_sql_like(classification, '#') + ";%";
  }

  if (clade_info) {
    const clade_where = [];

    clade_where.push("family_clade.dfam_taxdb_tax_id IN (:where_ancestors)");
    from += "LEFT JOIN family_clade ON family_clade.family_id = family.id ";
    replacements.where_ancestors = clade_info.ids;

    if (clade_relatives === "descendants" || clade_relatives === "both") {
      clade_where.push("dfam_taxdb.lineage LIKE :where_lineage ESCAPE '#'");
      from += "LEFT JOIN dfam_taxdb ON dfam_taxdb.tax_id = family_clade.dfam_taxdb_tax_id ";
      replacements.where_lineage = escape.escape_sql_like(clade_info.lineage, '#') + ";%";
    }

    where.push("( " + clade_where.join(" OR ") + " )");
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

  // TODO: new Date(...) is full of surprises.

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

      where.push(`((family.name LIKE :${key} ESCAPE '#') OR (family.title LIKE :${key} ESCAPE '#') OR (family.description LIKE :${key} ESCAPE '#') OR (accession LIKE :${key} ESCAPE '#') OR (author LIKE :${key} ESCAPE '#'))`);
      replacements[key] = "%" + escape.escape_sql_like(word, '#') + "%";
    });
  }

  var count_sql = "SELECT COUNT(DISTINCT family.id) as total_count FROM " + from + " WHERE " + where.join(" AND ");
  var sql = "SELECT DISTINCT " + selects.join(",") + " FROM " + from + " WHERE " + where.join(" AND ");

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
  }

  if (orderBy.length) {
    sql += " ORDER BY " + orderBy.join(",");
  } else {
    sql += " ORDER BY accession";
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

    return familySubqueries(rows, format).then(function(rows) {
      return rows.map(function(row) {
        row.classification = {
          id: row.classification_id,
          lineage: row.classification_lineage,
          rm_type: { name: row.type },
          rm_subtype: { name: row.subtype }
        };
        row.curation_state = {
          name: row.curation_state_name,
          description: row.curation_state_description,
        };
        return row;
      });
    }).then(function(rows) {
      const objs = rows.map(row => familyQueryRowToObject(row, format));
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
exports.readFamilyById = async function(id) {
  const row = await familyModel.findOne({
    where: { accession: id },
    include: [
      { model: classificationModel, as: 'classification', include: [ 'rm_type', 'rm_subtype' ] },
      { model: curationStateModel, as: 'curation_state' },
    ],
  });

  if (row) {
    const full_rows = await familySubqueries([row], "full");
    return familyQueryRowToObject(full_rows[0], "full");
  } else {
    return null;
  }
};


/**
 * Retrieve an individual Dfam family's HMM data
 *
 * id String The Dfam family name
 * format String The desired output format, \"hmm\" or \"logo\" or \"image\"
 * returns String
 **/
exports.readFamilyHmm = async function(id, format) {
  var field;
  var content_type;
  if (format == "hmm") {
    const hmm = await runWorkerAsync(["hmm", id]);
    if (hmm && hmm.length) {
      return {
        data: hmm,
        content_type: "text/plain",
        encoding: "gzip",
      };
    } else {
      return null;
    }
  } else if (format == "logo") {
    field = "hmm_logo";
    content_type = "application/json";
  } else if (format == "image") {
    field = "hmm";
    content_type = "image/png";
  } else {
    return Promise.resolve(new APIResponse("Unrecognized format: " + format, 400));
  }

  const model = await hmmModelDataModel.findOne({
    attributes: [ field ],
    include: [ { model: familyModel, where: { accession: id }, attributes: [] } ],
  });

  if (!model || !model[field]) {
    return null;
  }

  if (format == "logo") {
    return { data: model[field], content_type, encoding: 'gzip' };
  }

  // format == "image"
  const unzippedHmm = await new Promise(function(resolve, reject) {
    zlib.gunzip(model[field], function(err, data) {
      if (err) { reject(err); }
      else { resolve(data); }
    });
  });

  const image = await new Promise(function(resolve, reject) {
    const webGenLogoImage = path.join(config.hmm_logos_dir, 'webGenLogoImage.pl');
    const proc = child_process.spawn(webGenLogoImage,
      { stdio: ['pipe', 'pipe', 'inherit'] }
    );
    proc.on('error', err => reject(err));

    const chunks = [];
    proc.stdout.on('data', chunk => chunks.push(chunk));
    proc.on('close', function(code) {
      if (code == 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error("Error converting HMM to PNG image."));
      }
    });

    proc.stdin.end(unzippedHmm);
  });

  return { data: image, content_type };
};


/**
 * Retrieve an individual Dfam family's relationship information
 *
 * id String The Dfam family name
 * returns String
 **/
exports.readFamilyRelationships = function(id) {
  return familyOverlapModel.findAll({
    include: [
      {
        model: familyModel, as: 'family1', attributes: ["name", "accession", "length"],
        where: { 'accession': id },
      },
      { model: familyModel, as: 'family2', attributes: ["name", "accession", "length"] },
      overlapSegmentModel,
    ],
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

/**
 * Retrieve an individual Dfam family's seed alignment data
 *
 * id String The Dfam family name
 * returns String
 **/
exports.readFamilySeed = function(id,format) {
  if (format == "stockholm") {
    return runWorkerAsync(["stockholm", id]).then(function(stockholm) {
      if (stockholm && stockholm.length) {
        return {
          data: stockholm,
          content_type: "text/plain",
          encoding: "gzip",
        };
      } else {
        return null;
      }
    });
  } else if (format == "alignment_summary") {
    return familyModel.findOne({
      attributes: [ "id", "name" ],
      where: { accession: id },
    }).then(function(family) {
      return seedAlignDataModel.findOne({
        attributes: ["graph_json"],
        where: { family_id: family.id },
      }).then(function(seedAlignData) {
        if (seedAlignData) {
          return {
            data: seedAlignData.graph_json,
            content_type: "application/json",
            encoding: 'gzip',
          };
        } else {
          return null;
        }
      });
    });
  } else {
    return Promise.resolve(new APIResponse({ message: "Unrecognized format: " + format}, 400));
  }
};

/**
 * Retrieve an individual Dfam family sequence
 *
 * id String The Dfam family name
 * format String The desired output format, currently only \"embl\" is supported
 * returns String
 **/
exports.readFamilySequence = function(id, format) {
  if (format == "embl") {
    return runWorkerAsync(["embl", id]).then(function(embl) {
      if (embl && embl.length) {
        return {
          data: embl,
          content_type: "text/plain",
        };
      } else {
        return null;
      }
    });
  } else {
    return Promise.resolve(new APIResponse({ message: "Unrecognized format: " + format}, 400));
  }
};
