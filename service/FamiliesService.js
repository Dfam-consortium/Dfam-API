'use strict';

const Sequelize = require("sequelize");
const zlib = require("zlib");
const mapFields = require("../utils/mapFields.js");
const child_process = require('child_process');
const config = require("../config");
const path = require("path");
const runWorkerAsync = require('../utils/async').runWorkerAsync;
const APIResponse = require('../utils/response').APIResponse;

const dfam = require("../databases").dfam_models;
const dfam_user = require('../databases').dfam_user_models;

const escape = require("../utils/escape.js");

function familySubqueries(rows, format) {
  return Promise.all(rows.map(function(row) {
    const family_id = row.id;

    const subqueries = [];

    subqueries.push(dfam.familyCladeModel.findAll({
      where: { family_id },
      include: { model: dfam.dfamTaxdbModel, as: 'dfam_taxdb', attributes: ["lineage"], }
    }).then(fcs => row.clades = fcs.map(fc => {
      return { lineage: fc.dfam_taxdb.lineage };
    })));

    if (format == "full") {
      subqueries.push(dfam.familyDatabaseAliasModel.findAll({
        attributes: ["db_id", "db_link"],
        where: { family_id },
      }).then(as => row.aliases = as));

      subqueries.push(dfam.familyHasSearchStageModel.findAll({
        where: { family_id },
        include: { model: dfam.rmStageModel, as: 'repeatmasker_stage', attributes: ["name"] }
      }).then(fss => row.search_stages = fss.map(fs => {
        return { name: fs.repeatmasker_stage.name };
      })));

      subqueries.push(dfam.familyHasBufferStageModel.findAll({
        attributes: ["start_pos", "end_pos"],
        where: { family_id },
        include: { model: dfam.rmStageModel, as: 'repeatmasker_stage', attributes: ["name"] }
      }).then(fbs => row.buffer_stages = fbs.map(fs => {
        return { name: fs.repeatmasker_stage.name, family_has_buffer_stage: {
          start_pos: fs.start_pos,
          end_pos: fs.end_pos,
        } };
      })));

      subqueries.push(dfam.familyHasCitationModel.findAll({
        where: { family_id },
        include: { model: dfam.citationModel, as: 'citation', attributes: [
          "pmid", "title", "authors", "journal", "pubdate",
        ] },
        order: [ ['order_added', 'ASC'] ],
      }).then(fhcs => row.citations = fhcs.map(fhc => {
        return {
          pmid: fhc.citation.pmid,
          title: fhc.citation.title,
          authors: fhc.citation.authors,
          journal: fhc.citation.journal,
          pubdate: fhc.citation.pubdate,
        };
      })));

      subqueries.push(dfam_user.userModel.findOne({ where: { id: row.deposited_by_id }, attributes: [ 'full_name' ] }).then(function(user) {
        if (user) {
          row.submitter = user.full_name;
        }
      }));

      subqueries.push(dfam.familyFeatureModel.findAll({
        where: { family_id: row.id },
        include: [
          { model: dfam.featureAttributeModel, as: 'feature_attributes' }
        ] }).then(function(features) { row.features = features; }));
      subqueries.push(dfam.codingSequenceModel.findAll({
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
    "version": "version",
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
  if (!clade) {
    return null;
  }

  const result = { ids: [], lineage: null };

  // Try clade by ID first
  const id = parseInt(clade);
  let record;
  if (!isNaN(id)) {
    record = await dfam.ncbiTaxdbNamesModel.findOne({
      where: { tax_id: id, name_class: 'scientific name' },
      attributes: [ 'tax_id', 'name_txt' ],
      include: [
        { model: dfam.ncbiTaxdbNodesModel, attributes: [ "parent_id" ] },
      ],
    });
  }

  // Then try by scientific name
  if (!record) {
    record = await dfam.ncbiTaxdbNamesModel.findOne({
      where: { name_class: 'scientific name', name_txt: clade },
      attributes: [ 'tax_id', 'name_txt' ],
      include: [
        { model: dfam.ncbiTaxdbNodesModel, attributes: [ "parent_id" ] },
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
    const parent = await dfam.ncbiTaxdbNodesModel.findOne({
      attributes: [ 'tax_id', 'parent_id' ],
      where: { tax_id: parent_id },
      include: [
        { model: dfam.ncbiTaxdbNamesModel, where: { name_class: 'scientific name' }, attributes: [ 'name_txt' ] },
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

  async function familyRowsToObjects(total_count, rows, format_rules) {
    const objs = rows.map(row => familyQueryRowToObject(row, format));
    const data = { total_count, results: objs };
    return {
      data,
      content_type: 'application/json',
      encoding: 'identity',
    };
  }

  async function familyAccessionsToWorker(total_count, rows, format_rules) {
    let accessions = "";
    rows.forEach(row => accessions += row.accession + "\n");

    const data = await runWorkerAsync([format, "--copyright"], accessions);
    if (!data) {
      // An error occurred.
      // TODO: This returns 404. Throw an exception instead?
      return null;
    }

    return {
      data,
      content_type: format_rules.content_type,
      encoding: 'identity',
    };
  }

  // TODO: Consider making these configurable in Dfam.conf
  const HARD_LIMIT = 5000, HMM_LIMIT = 2000;
  const export_formats = {
    "summary": { metadata: 1, mapper: familyRowsToObjects,      limit: HARD_LIMIT },
    "full":    { metadata: 2, mapper: familyRowsToObjects,      limit: HARD_LIMIT },
    "fasta":   { metadata: 0, mapper: familyAccessionsToWorker, limit: HARD_LIMIT, content_type: 'text/plain' },
    "embl":    { metadata: 0, mapper: familyAccessionsToWorker, limit: HARD_LIMIT, content_type: 'text/plain' },
    "hmm":     { metadata: 0, mapper: familyAccessionsToWorker, limit: HMM_LIMIT, content_type: 'text/plain' },
  };

  const format_rules = export_formats[format];

  if (!format_rules) {
    return Promise.resolve(new APIResponse({ message: "Unrecognized format: " + format}, 400));
  }

  const clade_info = await collectClades(clade, clade_relatives);

  const query = { };
  query.attributes = ["id", "accession"];
  query.where = [];
  query.include = [
    { model: dfam.classificationModel, as: 'classification', include: [
      { model: dfam.rmTypeModel, as: 'rm_type' },
      { model: dfam.rmSubTypeModel, as: 'rm_subtype' },
    ] },
  ];
  query.order = [];

  // See sequelize/sequelize#11617
  query.subQuery = false;

  if (format_rules.metadata >= 1) {
    query.attributes = query.attributes.concat(["name", "version", "title", "length", "description"]);
  }

  if (format_rules.metadata >= 2) {
    query.attributes = query.attributes.concat([
      "consensus", "author", "deposited_by_id", "date_created", "date_modified",
      "target_site_cons", "refineable", "disabled", "model_mask", "hmm_general_threshold",
    ]);
    query.include.push({ model: dfam.curationStateModel, as: 'curation_state' });
  }

  if (name) {
    query.where.push({ name: { [Sequelize.Op.like]: escape.escape_sql_like(name, '\\') + "%" } });
  } else if (name_prefix) {
    query.where.push({ name: { [Sequelize.Op.like]: escape.escape_sql_like(name_prefix, '\\') + "%" } });
  } else if (name_accession) {
    const where_name_acc = "%" + escape.escape_sql_like(name_accession, '\\') + "%";
    query.where.push({ [Sequelize.Op.or]: [
      { name: { [Sequelize.Op.like]: where_name_acc } },
      { accession: { [Sequelize.Op.like]: where_name_acc } },
    ] });
  }

  if (classification) {
    query.where.push({ [Sequelize.Op.or]: [
      { "$classification.lineage$": classification },
      { "$classification.lineage$": { [Sequelize.Op.like]: escape.escape_sql_like(classification, '\\') + ";%" } },
    ] });
  }

  if (clade_info) {
    const cladeInclude = {
      model: dfam.dfamTaxdbModel,
      as: 'clades',
      include: [],
    };
    query.include.push(cladeInclude);

    const clade_where_query = [];
    clade_where_query.push({
      "tax_id": { [Sequelize.Op.in]: clade_info.ids },
    });

    if (clade_relatives === "descendants" || clade_relatives === "both") {
      clade_where_query.push({
        "lineage": { [Sequelize.Op.like]: escape.escape_sql_like(clade_info.lineage, '\\') + ";%" }
      });
    }

    cladeInclude.where = { [Sequelize.Op.or]: clade_where_query };
  }

  if (desc) {
    query.where.push({
      description: { [Sequelize.Op.like]: escape.escape_sql_like(desc, '#') + "%" }
    });
  }

  if (type) {
    query.where.push({ '$classification.rm_type.name$': type });
  }

  if (subtype) {
    query.where.push({ '$classification.rm_subtype.name$': subtype });
  }

  // TODO: new Date(...) is full of surprises.

  if (updated_after) {
    query.where.push({ [Sequelize.Op.or]: [
      { date_modified: { [Sequelize.Op.gt]: new Date(updated_after) } },
      { date_created: { [Sequelize.Op.gt]: new Date(updated_after) } },
    ] });
  }

  if (updated_before) {
    query.where.push({ [Sequelize.Op.or]: [
      { date_modified: { [Sequelize.Op.lt]: new Date(updated_before) } },
      { date_created: { [Sequelize.Op.lt]: new Date(updated_before) } },
    ] });
  }

  if (keywords) {
    keywords.split(" ").forEach(function(word) {
      const word_esc = "%" + escape.escape_sql_like(word, '\\') + "%";
      query.where.push({ [Sequelize.Op.or]: [
        { name:        { [Sequelize.Op.like]: word_esc } },
        { title:       { [Sequelize.Op.like]: word_esc } },
        { description: { [Sequelize.Op.like]: word_esc } },
        { accession:   { [Sequelize.Op.like]: word_esc } },
        { author:      { [Sequelize.Op.like]: word_esc } },
      ] });
    });
  }

  // TODO: Implement more complex sort keys
  const sortKeys = [ "accession", "name", "length", "type", "subtype", "date_created", "date_modified" ];

  if (sort) {
    sort.split(",").forEach(function(term) {
      const match = /(\S+):(asc|desc)/.exec(term);
      if (match && sortKeys.find(sk => sk == match[1])) {
        query.order.push([match[1], match[2]]);
      }
    });
  }

  if (!query.order.length) {
    query.order.push(["accession", "ASC"]);
  }

  if (limit !== undefined) {
    query.limit = limit;
  }

  if (start !== undefined) {
    query.offset = start;
  }

  const count_result = await dfam.familyModel.findAndCountAll(query);
  const total_count = count_result.count;

  if (total_count > format_rules.limit && (limit === undefined || limit > format_rules.limit)) {
    const message = `Result size of ${total_count} is above the per-query limit of ${format_rules.limit}. Please narrow your search terms or use the limit and start parameters.`;
    return Promise.resolve(new APIResponse({ message }, 400));
  }


  let rows = await dfam.familyModel.findAll(query);
  rows = await familySubqueries(rows, format);
  return format_rules.mapper(total_count, rows, format_rules);
};


/**
 * Retrieve an individual Dfam family.
 *
 * id String The Dfam family name
 * returns familyResponse
 **/
exports.readFamilyById = async function(id) {
  const row = await dfam.familyModel.findOne({
    where: { accession: id },
    include: [
      { model: dfam.classificationModel, as: 'classification', include: [ 'rm_type', 'rm_subtype' ] },
      { model: dfam.curationStateModel, as: 'curation_state' },
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
    const hmm = await runWorkerAsync(["hmm"], id);
    if (hmm && hmm.length) {
      return {
        data: hmm,
        content_type: "text/plain",
        encoding: "identity",
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

  const model = await dfam.hmmModelDataModel.findOne({
    attributes: [ field ],
    include: [ { model: dfam.familyModel, where: { accession: id }, attributes: [] } ],
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
  return dfam.familyOverlapModel.findAll({
    include: [
      {
        model: dfam.familyModel, as: 'family1', attributes: ["name", "accession", "length"],
        where: { 'accession': id },
      },
      { model: dfam.familyModel, as: 'family2', attributes: ["name", "accession", "length"] },
      dfam.overlapSegmentModel,
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
    return runWorkerAsync(["stockholm"], id).then(function(stockholm) {
      if (stockholm && stockholm.length) {
        return {
          data: stockholm,
          content_type: "text/plain",
          encoding: "identity",
        };
      } else {
        return null;
      }
    });
  } else if (format == "alignment_summary") {
    return dfam.familyModel.findOne({
      attributes: [ "id", "name" ],
      where: { accession: id },
    }).then(function(family) {
      return dfam.seedAlignDataModel.findOne({
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
  if (format === "embl" || format === "fasta") {
    return runWorkerAsync([format], id).then(function(data) {
      if (data && data.length) {
        return { data, content_type: "text/plain" };
      } else {
        return null;
      }
    });
  } else {
    return Promise.resolve(new APIResponse({ message: "Unrecognized format: " + format}, 400));
  }
};
