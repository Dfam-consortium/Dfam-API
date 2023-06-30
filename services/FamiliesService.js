/* eslint-disable no-unused-vars */
const Service = require('./Service');
const path = require('path');
const child_process = require('child_process');
const Sequelize = require("sequelize");
const zlib = require("zlib");
const wrap = require('word-wrap');
const { promisify } = require("util");

const config = require('../config');
const dfam = require("../databases").getModels_Dfam();
const dfam_user = require("../databases").getModels_User();
const WorkerPool = require('../worker-pool');
const mapFields = require("../utils/mapFields.js");
//const logger = require('../logger');



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
    "source_method_desc": "source_method_description",
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

  if (row.source_method) {
    obj.source_method = row.source_method.name;
  }

  if (row.source_assembly) {
    obj.source_assembly = {
      label: `${row.source_assembly.name}: ${row.source_assembly.description}`,
      hyperlink: row.source_assembly.uri,
    };
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
// result.ids will contain ancestors only if clade_relatives is "ancestors" or "both"
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
* Retrieve a list of families in Dfam, optionally filtered and sorted.
* Retrieve a list of families in Dfam, optionally filtered and sorted.
*
* format String Desired output format. Supported formats include \"summary\", \"full\", \"embl\", \"fasta\", and \"hmm\". Defaults to \"summary\". (optional)
* sort String A string containing sort columns, for example \"name:asc,length:desc\". Sorting by any of \"accession\", \"name\", \"length\", \"type\", \"subtype\", \"date_created\", and \"date_modified\" are supported. If unspecified, \"accession:asc\" will be used. (optional)
* name String Search term for any part of the family name. Takes precedence over \"name_prefix\" if both are specified. (optional)
* nameUnderscoreprefix String Search term for a prefix of the family name. (optional)
* nameUnderscoreaccession String Search term for any part of the family name or accession (optional)
* classification String Search term for family classification. Sub-classifications are included. A full classification lineage is expected for this search term; such as \"root;Interspersed_Repeat\". (optional)
* clade String Search term for family clade. Can be either an NCBI Taxonomy ID or scientific name. If the scientific name is ambiguous (e.g. \"Drosophila\"), the taxonomy ID should be used instead. (optional)
* cladeUnderscorerelatives String Relatives of the requested clade to include: 'ancestors', 'descendants', or 'both' (optional)
* type String Search term for TE type, as understood by RepeatMasker. (optional)
* subtype String Search term for TE subtype, as understood by RepeatMasker. (optional)
* updatedUnderscoreafter date Filter by \"updated on or after\" date. (optional)
* updatedUnderscorebefore date Filter by \"updated on or before\" date. (optional)
* desc String Search term for family description. (optional)
* keywords String Keywords to search in text fields (currently name, title, description, accession, author). (optional)
* includeUnderscoreraw Boolean Whether to include raw (\"DR\") families in the results. Default is false. (optional)
* start Integer Index of first record to return. Commonly used along with `limit` to implement paging. (optional)
* limit Integer Maxium number of records to return. (optional)
* download Boolean If true, adds headers to trigger a browser download. (optional)
* returns familiesResponse
* */
const readFamilies = ({ format, sort, name, nameUnderscoreprefix, nameUnderscoreaccession, classification, clade, cladeUnderscorerelatives, type, subtype, updatedUnderscoreafter, updatedUnderscorebefore, desc, keywords, includeUnderscoreraw, start, limit, download }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        format,
        sort,
        name,
        nameUnderscoreprefix,
        nameUnderscoreaccession,
        classification,
        clade,
        cladeUnderscorerelatives,
        type,
        subtype,
        updatedUnderscoreafter,
        updatedUnderscorebefore,
        desc,
        keywords,
        includeUnderscoreraw,
        start,
        limit,
        download,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Retrieve full details of an individual Dfam family.
* Retrieve full details of an individual Dfam family.
*
* id String The Dfam family accession.
* returns familyResponse
* */
const readFamilyById = ({ id }) => new Promise(
  async (resolve, reject) => {
    try {

  const row = await dfam.familyModel.findOne({
    where: { accession: id },
    include: [
      { model: dfam.classificationModel, as: 'classification', include: [ 'rm_type', 'rm_subtype' ] },
      { model: dfam.curationStateModel, as: 'curation_state' },
      { model: dfam.sourceMethodModel, as: 'source_method' },
      { model: dfam.assemblyModel, as: 'source_assembly' },
    ],
  });

  if (row) {
    const full_rows = await familySubqueries([row], "full");
resolve(Service.successResponse({ payload: familyQueryRowToObject(full_rows[0], "full") }));
  } else {
resolve(Service.successResponse({ payload: {} }));
  }
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Retrieve an individual Dfam family's annotated HMM.
* Retrieve an individual Dfam family's annotated HMM.
*
* id String The Dfam family accession.
* format String The desired output format: \"hmm\", \"logo\", or \"image\".
* download Boolean If true, adds headers to trigger a browser download. (optional)
* returns String
* */
const readFamilyHmm = ({ id, format, download }) => new Promise(
  async (resolve, reject) => {
    try {
      obj = {};
      if (download) {
        const extensions = { 'hmm': '.hmm', 'logo': '.logo', 'image': '.png' };
        obj.attachment = id + extensions[format];
      }

      const types = { 'hmm': 'text/plain', 'logo': 'application/json', 'image': 'image/png' };
      if ( format in types ) {
        obj.content_type = types[format];
      }else {
        throw new Error("Unrecognized format: " + format);
      }

      if (format == "logo") {
        const model = await dfam.hmmModelDataModel.findOne({
          attributes: [ "hmm_logo" ],
          include: [ { model: dfam.familyModel, where: { accession: id }, attributes: [] } ],
        });

        if (!model || !model["hmm_logo"]) {
          return null;
        }
        obj.payload = model["hmm_logo"];
        obj.encoding = "gzip";
      }else if (format == "image") {

        const model = await dfam.hmmModelDataModel.findOne({
          attributes: [ "hmm" ],
          include: [ { model: dfam.familyModel, where: { accession: id }, attributes: [] } ],
        });

        if (!model || !model["hmm"]) {
          return null;
        }
 
        const unzippedHmm = await new Promise(function(resolve, reject) {
          zlib.gunzip(model["hmm"], function(err, data) {
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

        obj.payload = image;
        obj.content_type = "image/png";
        obj.encoding = "identity";

      }else if (format == "hmm") {
        obj.payload = await WorkerPool.piscina.run({accessions: [id], include_copyright: 0}, { name: 'hmm_command' });
      }

      resolve(Service.successResponse(obj));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Retrieve an individual Dfam family's relationship information.
* Retrieve an individual Dfam family's relationship information.
*
* id String The Dfam family accession.
* include String Which families to include. \"all\" searches all of Dfam, and \"related\" searches only families that are found in ancestor or descendant clades of the one this family belongs to. Default is \"all\". (optional)
* includeUnderscoreraw Boolean Whether to include matches to raw (\"DR\") families. Default is false. (optional)
* returns List
* */
const readFamilyRelationships = ({ id, include, includeUnderscoreraw }) => new Promise(
  async (resolve, reject) => {
    try {

  const clade_infos = [];

  // Retrieve lineage + IDs for all clades associated to the family
  if (include === "related") {
    const family = await dfam.familyModel.findOne({
      where: { accession: id },
      include: [{
        model: dfam.dfamTaxdbModel,
        as: "clades",
        attributes: ["tax_id"],
      }],
    });

    for (const cl of family.clades) {
      clade_infos.push(await collectClades(cl.tax_id, "both"));
    }
  }

  // Set up the query for the overlap table
  const query = {
    include: [
      { 
        model: dfam.familyModel, as: 'family1', attributes: ["name", "accession", "length"],
        where: { 'accession': id },
      },
    ],
    subQuery: false,
  };

  // Set up the inclusion / where clauses for family2
  const include_f2 = {
    model: dfam.familyModel,
    as: 'family2',
    attributes: ["name", "accession", "length"],
    include: [],
    where: [],
  };
  query.include.push(include_f2);

  // If a clade was specified, add corresponding criteria
  if (clade_infos.length) {
    const cladeInclude = {
      model: dfam.dfamTaxdbModel,
      as: 'clades',
      include: [],
    };
    include_f2.include.push(cladeInclude);

    const clade_where_query = [];
    clade_infos.forEach(ci => {
      clade_where_query.push({ "tax_id": { [Sequelize.Op.in]: ci.ids } });
      clade_where_query.push({
        "lineage": { [Sequelize.Op.like]: escape.escape_sql_like(ci.lineage, '\\') + ";%" }
      });
    });
    cladeInclude.where = { [Sequelize.Op.or]: clade_where_query };
  }

  // Add filter for family2 being DF*, if requested
  if (!includeUnderscoreraw) {
    include_f2.where.push({
      accession: { [Sequelize.Op.like]: "DF%" },
    });
  }

  // Finally, run the query
  const overlap_segments = await dfam.overlapSegmentModel.findAll(query);

  const all_overlaps = overlap_segments.map(function(overlap) {
    const family_map = {
      "name": "id",
      "accession": "accession",
      "length": "length",
    };
    const model_info = mapFields(overlap.family1, {}, family_map);
    if (!overlap.family1.name) {
      model_info.id = overlap.family1.accession;
    }
    const target_info = mapFields(overlap.family2, {}, family_map);
    if (!overlap.family2.name) {
      target_info.id = overlap.family2.accession;
    }

    const seg = mapFields(overlap, {}, {
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
  });

  // Large numbers of hits quickly become cumbersome in all aspects
  // (serialization/deserialization, display, usability). Until we have more
  // useful pre- and post-filters in place, we return only the most significant
  // hits (by e-value).
  //
  // TODO: Allow for other sort options in the query and/or a "limit" parameter.
  all_overlaps.sort((a, b) => a.evalue - b.evalue);
  all_overlaps.splice(300);


  // TODO: The stored coverage values are incorrect as of Dfam 3.5. This
  // recalculation can be removed in a future release after data has been
  // rebuilt.
  all_overlaps.forEach(seg => {
    let match_count = 0;
    let count = 0;
    for (let i = 0; i < seg.cigar.length; i++) {
      if (seg.cigar[i] >= '0' && seg.cigar[i] <= '9') {
        count *= 10;
        count += seg.cigar[i] - '0';
      } else {
        if (seg.cigar[i] === "M") {
          match_count += count;
        }
        count = 0;
      }
    }
    seg.coverage = match_count / seg.auto_overlap.model.length;
  });

    resolve(Service.successResponse({ payload: all_overlaps }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Retrieve an individual Dfam family's seed alignment data.
* Retrieve an individual Dfam family's seed alignment data.
*
* id String The Dfam family accession.
* format String The format to return, one of 'stockholm' or 'alignment_summary'.
* download Boolean If true, adds headers to trigger a browser download. (optional)
* returns String
* */
const readFamilySeed = ({ id, format, download }) => new Promise(
  async (resolve, reject) => {
    try {
      obj = {};
      if (download) {
        const extensions = { 'stockholm': '.stk', 'alignment_summary': '.json' };
        if ( format in extensions ) {
          obj.attachment = id + extensions[format];
        }else {
          throw new Error("Unrecognized format: " + format);
        }
      }

      if (format == "stockholm") {
        obj.payload = await WorkerPool.piscina.run({accessions: [id]}, { name: 'stockholm_command' });
        obj.content_type = "text/plain";
        obj.encoding = "identity";
      }else if (format == "alignment_summary") {
        const family = await dfam.familyModel.findOne({
          attributes: [ "id", "name" ],
          where: { accession: id },
        });

        const seedAlignData = await dfam.seedAlignDataModel.findOne({
          attributes: ["graph_json", "avg_kimura_divergence"],
          where: { family_id: family.id },
        });

        let graphData = {};
        if (seedAlignData && seedAlignData.graph_json && seedAlignData.graph_json.length > 0) {
          graphData = JSON.parse(await promisify(zlib.gunzip)(seedAlignData.graph_json));
        } else {
          logger.warn(`Family with accession ${id} has no seed alignment graph data.`);
        }

        // TODO: Include values for graphData.publicSequences and
        // graphData.representedAssemblies, once we are confident we
        // can calculate them correctly

        graphData.averageKimuraDivergence = seedAlignData.avg_kimura_divergence;
        obj.payload = graphData;
        obj.content_type = "application/json";
        obj.encoding = "identity";
      }
      resolve(Service.successResponse(obj));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Retrieve an individual Dfam family's annotated consensus sequence.
* Retrieve an individual Dfam family's annotated consensus sequence. If only the raw sequence is needed, use the `consensus_sequence` property from the `/families/{id}` endpoint instead.
*
* id String The Dfam family accession.
* format String The desired output format. \"embl\" and \"fasta\" are the currently supported formats.
* download Boolean If true, adds headers to trigger a browser download. (optional)
* returns String
* */
const readFamilySequence = ({ id, format, download }) => new Promise(

  async (resolve, reject) => {
    try {
      obj = {};
      if (download) {
        const extensions = { 'embl': '.embl', 'fasta': '.fa' };
        obj.attachment = id + extensions[format];
      }
      obj.content_type = "text/plain";

      if (format == "embl") {
        obj.payload = await WorkerPool.piscina.run({accessions: [id]}, { name: 'embl_command' });
      }else if (format == "fasta") {
        obj.payload = await WorkerPool.piscina.run({accessions: [id]}, { name: 'fasta_command' });
      }
      resolve(Service.successResponse(obj));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },

);

module.exports = {
  readFamilies,
  readFamilyById,
  readFamilyHmm,
  readFamilyRelationships,
  readFamilySeed,
  readFamilySequence,
};
