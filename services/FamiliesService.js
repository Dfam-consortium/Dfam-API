const Service = require('./Service');
const path = require('path');
const child_process = require('child_process');
const Sequelize = require("sequelize");
const zlib = require("zlib");
const { promisify } = require("util");
const md5 = require("md5");

const config = require('../config');
const dfam = require("../databases").getModels_Dfam();
const workerPool = require('../workerPool');
const mapFields = require("../utils/mapFields");
const escape = require("../utils/escape");
const family = require("../utils/family");
const logger = require('../logger');
const fs = require('fs/promises');

/**
 * Retrieve related Dfam families based on sequence similarity.
 *
 * @param {Object} params - The input parameters.
 * @param {string} params.id - The Dfam family accession.
 * @returns {Promise<ServiceResponse>} - A service response with related families.
 */
const readDfamRelationships = ({ id }) => new Promise(async (resolve, reject) => {
  try {
    const result = await workerPool.piscina.run({ accession: id }, { name: 'dfam_relationships_command' });
    resolve(Service.successResponse({
      payload: result,
      content_type: "application/json",
      encoding: "identity"
    }, 200));
  } catch (e) {
    reject(Service.rejectResponse(e.message || 'Unable to retrieve Dfam relationships.', e.status || 500));
  }
});


/**
 * Retrieve protein alignments to the family consensus sequence.
 *
 * @param {Object} params
 * @param {string} params.id - Dfam family accession.
 * @returns {Promise<ServiceResponse>} - A response with protein alignments.
 */
const readProteinAlignments = ({ id }) => new Promise(async (resolve, reject) => {
  try {
    const result = await workerPool.piscina.run({ accession: id }, { name: 'protein_alignment_command' });
    resolve(Service.successResponse({
      payload: result,
      content_type: "application/json",
      encoding: "identity"
    }, 200));
  } catch (e) {
    reject(Service.rejectResponse(e.message || 'Unable to retrieve protein alignments.', e.status || 500));
  }
});


/**
 * Retrieve self-alignment results (internal alignments) of the family's consensus sequence.
 *
 * @param {Object} params
 * @param {string} params.id - Dfam family accession.
 * @returns {Promise<ServiceResponse>} - A response with self-alignment data.
 */
const readSelfAlignments = ({ id }) => new Promise(async (resolve, reject) => {
  try {
    const result = await workerPool.piscina.run({ accession: id }, { name: 'self_alignment_command' });
    resolve(Service.successResponse({
      payload: result,
      content_type: "application/json",
      encoding: "identity"
    }, 200));
  } catch (e) {
    reject(Service.rejectResponse(e.message || 'Unable to retrieve self-alignments.', e.status || 500));
  }
});


/**
 * Retrieve tandem repeat annotations (ULTRA) for this family.
 *
 * @param {Object} params
 * @param {string} params.id - The Dfam family accession.
 * @returns {Promise<ServiceResponse>} - JSON payload of ULTRA tandem repeats.
 */
const readTandemRepeats = ({ id }) => new Promise(async (resolve, reject) => {
  try {
    const result = await workerPool.piscina.run({ accession: id }, { name: 'tandem_repeats_command' });
    resolve(Service.successResponse({
      payload: result,
      content_type: "application/json",
      encoding: "identity"
    }, 200));
  } catch (e) {
    reject(Service.rejectResponse(e.message || 'Unable to retrieve tandem repeats.', e.status || 500));
  }
});




/**
 * Converts raw Sequelize family rows into a standardized payload format.
 *
 * Intended for use with export formats like `"summary"` or `"full"` that return
 * structured metadata (JSON objects) rather than text-based representations.
 *
 * @param {number} total_count - Total number of families matching the query (may exceed page size).
 * @param {Object[]} rows - Array of Sequelize family model instances.
 * @param {string} format - Export format: "summary" or "full".
 * @param {boolean} copyright - Whether copyright information should be included (currently unused).
 * @param {boolean} download - Whether this is a download request (currently unused).
 *
 * @returns {Object} An object containing:
 *   @property {Object} payload
 *   @property {number} payload.total_count - Total matching rows across all pages.
 *   @property {Object[]} payload.results - Array of mapped family objects.
 */

// TODO Move these functions to utils/family.js
async function familyRowsToObjects(total_count, rows, format, copyright, download) {
  // Download isn't applicable here yet?
  // Copyright isn't applicable on these formats
  const objs = rows.map(row => family.familyQueryRowToObject(row, format));
  const data = { total_count, results: objs };
  return {
    payload: data
  };
}


/**
 * Export a set of families in HMM, FASTA, or EMBL format using worker threads.
 *
 * @param {number} total_count - Number of families.
 * @param {Object[]} rows - Family rows.
 * @param {string} format - Format type ("hmm", "fasta", or "embl").
 * @param {boolean} download - If true, prepares for browser download.
 * @param {string|null} write_file - Optional file to write output to.
 * @returns {Promise<Object>} - The export object with payload or written file reference.
 */
async function workerFormatAccessions(total_count, rows, format, copyright, download, write_file=null) {

  const extensions = { 'embl': '.embl', 'fasta': '.fa', 'hmm': '.hmm' };
  if ( ! (format in extensions) ) {
    resolve(Service.rejectResponse( "Unrecognized format: " + format, 400 ));
  }

  var obj = {};
  if (download) {
    obj.attachment = "families" + extensions[format];
  }
  obj.content_type = "text/plain";
  obj.encoding = "identity";

  var accs = [];
  for (const row of rows) {
    accs.push(row.accession);
  }

  // TODO: Consider compressing the results
  // TODO: Consider pagination for large queries
  // TODO: Consider copyright for bulk and download only     
  if (format == "embl") {
    obj.body = await workerPool.piscina.run({accessions: accs, include_copyright: 0, write_file: write_file}, { name: 'embl_command' });
  } else if (format == "fasta") {
    obj.body = await workerPool.piscina.run({accessions: accs, write_file: write_file}, { name: 'fasta_command' });
  } else if (format == "hmm") {
    obj.body = await workerPool.piscina.run({accessions: accs, include_copyright: 0, write_file: write_file}, { name: 'hmm_command' });
  } 

  return obj;
}


/**
 * Constructs a Sequelize query object to retrieve Dfam families
 * with optional filtering, sorting, and metadata configuration.
 *
 * Used by the `/families` endpoint to support flexible querying of the
 * family dataset, including format-specific attributes, classification
 * metadata, clade constraints, and more.
 *
 * @param {Object} format_rules - Rules controlling metadata level.
 * @param {number} format_rules.metadata - Level of metadata to include (0, 1, 2).
 *
 * @param {string} [name] - Exact or prefix match on family name.
 * @param {string} [name_accession] - Match on name or accession (partial match).
 * @param {string} [name_prefix] - Match on name prefix (mutually exclusive with `name`).
 * @param {string} [classification] - Classification lineage string (e.g. "root;LTR").
 * @param {Object|null} [clade_info] - Clade search context returned from `collectClades()`.
 * @param {string} [clade_info.lineage] - Lineage string of target clade.
 * @param {number[]} [clade_info.ids] - Array of tax IDs for clade + ancestors.
 * @param {string} [clade_relatives] - "ancestors", "descendants", or "both".
 *
 * @param {string} [desc] - Substring to match in the description field.
 * @param {string} [type] - RepeatMasker type name (e.g. "DNA", "SINE").
 * @param {string} [subtype] - RepeatMasker subtype name (e.g. "Tc1", "Alu").
 *
 * @param {string} [updated_after] - Minimum date_created or date_modified (ISO format).
 * @param {string} [updated_before] - Maximum date_created or date_modified (ISO format).
 * @param {string} [keywords] - Space-separated keywords to search in text fields.
 *
 * @param {boolean} [include_raw=false] - If false, restricts to accessions starting with "DF".
 *
 * @param {string} [sort] - Sort instructions like "name:asc,length:desc".
 *                          Supported keys: "accession", "name", "length", "type", "subtype",
 *                          "date_created", "date_modified".
 *
 * @param {number} [limit] - Max number of records to return.
 * @param {number} [start] - Offset of first record to return (pagination).
 *
 * @returns {Object} Sequelize-compatible query object with `where`, `include`,
 *                   `order`, `attributes`, and `distinct` fields.
 */
function buildFamQuery (format_rules, name, name_accession, name_prefix, classification, clade_info, clade_relatives, desc, type, subtype, updated_after, updated_before, keywords, include_raw, sort, limit, start) {
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
      "source_method_desc",
    ]);
    query.include.push({ model: dfam.curationStateModel, as: 'curation_state' });
    query.include.push({ model: dfam.sourceMethodModel, as: 'source_method' });
    query.include.push({ model: dfam.assemblyModel, as: 'source_assembly' });
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
    let class_decode = decodeURIComponent(classification);
    query.where.push({ [Sequelize.Op.or]: [
      { "$classification.lineage$": class_decode },
      { "$classification.lineage$": { [Sequelize.Op.like]: escape.escape_sql_like(class_decode, '\\') + ";%" } },
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
      description: { [Sequelize.Op.like]: "%" + escape.escape_sql_like(desc, '#') + "%" }
    });
  }

  if (type) {
    query.where.push({ '$classification.rm_type.name$': type });
  }

  if (subtype) {
    query.where.push({ '$classification.rm_subtype.name$': subtype });
  }

  // TODO: new Date(...) is full of surprises.

  /*
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
  */
  // RMH: 8/2025 - Fixed a bug with querying date ranges
  if (updated_after && updated_before) {
    query.where.push({
      [Sequelize.Op.or]: [
        {
          date_modified: {
            [Sequelize.Op.gte]: new Date(updated_after),
            [Sequelize.Op.lte]: new Date(updated_before)
          }
        },
        {
          date_created: {
            [Sequelize.Op.gte]: new Date(updated_after),
            [Sequelize.Op.lte]: new Date(updated_before)
          }
        }
      ]
    });
  } else if (updated_after) {
    query.where.push({
      [Sequelize.Op.or]: [
        { date_modified: { [Sequelize.Op.gte]: new Date(updated_after) } },
        { date_created: { [Sequelize.Op.gte]: new Date(updated_after) } }
      ]
    });
  } else if (updated_before) {
    query.where.push({
      [Sequelize.Op.or]: [
        { date_modified: { [Sequelize.Op.lte]: new Date(updated_before) } },
        { date_created: { [Sequelize.Op.lte]: new Date(updated_before) } }
      ]
    });
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

  if (!include_raw) {
    query.where.push({ accession: { [Sequelize.Op.like]: "DF%" } });
  }

  const simpleSortKeys = [ "accession", "name", "length", "date_created", "date_modified" ];

  if (sort) {
    sort.split(",").forEach(function(term) {
      const match = /(\S+):(asc|desc)/.exec(term);
      if (match) {
        if (simpleSortKeys.includes(match[1])) {
          query.order.push([match[1], match[2]]);
        } else if (match[1] == "type") {
          query.order.push(["classification", "rm_type", "name", match[2]]);
        } else if (match[1] == "subtype") {
          query.order.push(["classification", "rm_subtype", "name", match[2]]);
        }
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

  // To log the queries for debugging
  //query.logging = console.log;

  // The query can produce N rows for a given family if the family has more than one
  // taxonomic label *and* the user asks for all families descendant from a clade 
  // higher than both labels.  Anthony round that a simple query.distinct here fixes
  // the problem. 6/27/23
  query.distinct = true;

  return query;
}


/**
 * Retrieve a list of families in Dfam, optionally filtered and sorted.
 *
 * Supports multiple export formats and advanced search filters including classification,
 * clade membership, update time, and keyword searches.
 *
 * @param {Object} args - Parameters from the request body.
 * @param {string} args.format - Output format: "summary", "full", "embl", "fasta", or "hmm".
 * @param {string} args.sort - Sorting key (e.g. "accession:asc").
 * @param {string} args.name - Exact match or partial match on family name.
 * @param {string} args.name_prefix - Prefix match on family name.
 * @param {string} args.name_accession - Match on family name or accession.
 * @param {string} args.classification - Full lineage string to match.
 * @param {string} args.clade - NCBI taxonomic ID or name.
 * @param {string} args.clade_relatives - "ancestors", "descendants", or "both".
 * @param {string} args.type - RepeatMasker type filter.
 * @param {string} args.subtype - RepeatMasker subtype filter.
 * @param {string} args.updated_after - Minimum date_created or date_modified.
 * @param {string} args.updated_before - Maximum date_created or date_modified.
 * @param {string} args.desc - Substring match on description.
 * @param {string} args.keywords - Space-separated keyword search.
 * @param {boolean} args.include_raw - Whether to include raw ("DR") families.
 * @param {number} args.start - Offset into results (for pagination).
 * @param {number} args.limit - Max number of results to return.
 * @param {boolean} args.download - If true, prepares content for download.
 * @returns {Promise<ServiceResponse>} - A paginated and/or formatted response.
 */
const readFamilies = ({...args} = {}, { format, sort, name, name_prefix, name_accession, classification, clade, clade_relatives, type, subtype, updated_after, updated_before, desc, keywords, include_raw, start, limit, download } = args) => new Promise(
  async (resolve, reject) => {
    const args_hash = md5(JSON.stringify(args));
    const cache_dir = config.apiserver.cache_dir;
    const cache_name = args_hash + ".cache"; 
    const cache_file = path.join(cache_dir, cache_name);
    const working_file = cache_file + '.working';
    const extensions = { 'embl': '.embl', 'fasta': '.fa', 'hmm': '.hmm' };

    try {

      if (!format) {
        format = "summary";
      }
      else if ( format !== 'full' && format !== 'summary' && !(format in extensions) ) {
        resolve(Service.rejectResponse( "Unrecognized format: " + format, 400 ));
      }

      // If cache is being built, return message
      if ( download && await fs.access(working_file).then(()=> true).catch(()=> false)) {
        logger.info(`Waiting on ${args_hash}`);
        resolve(Service.successResponse({body: "Working..."}, 202));
        return;
      } 
      // If cache exists, return cache file
      else if ( download && await fs.access(cache_file).then(()=> true).catch(()=> false)) {
        // update access time for cache
        await fs.utimes(cache_file, new Date(), new Date());
        
        // read base64 file, parse into object and return
        const file = await fs.readFile(cache_file, {encoding: 'utf8', flag: 'r'});
        const res = JSON.parse(file);
        logger.info(`Using Cached File ${cache_file}`);
        resolve(Service.successResponse(res, 200));
        return;

      // Write blank working file so client knows it's in process before query is returned
      } else if (download) {
        logger.info(`Download Request ${args_hash} Recieved - ${JSON.stringify(args).replaceAll('"', "'")}`);
        await fs.writeFile(working_file, "");
        logger.info(`Created Working file ${working_file}`);
      }

      // TODO: Consider making these configurable in Dfam.conf
      // TODO: add "count" format that doesn't fill in the summary data and doesn't necessaryily join the classification tables for faster default counts
      const HARD_LIMIT = 10000;
      const HMM_LIMIT = HARD_LIMIT;
      // const HARD_LIMIT = 5000, HMM_LIMIT = 2000;
      const export_formats = {
        "summary": { metadata: 1, mapper: familyRowsToObjects,      limit: HARD_LIMIT },
        "full":    { metadata: 2, mapper: familyRowsToObjects,      limit: HARD_LIMIT },
        "fasta":   { metadata: 0, mapper: workerFormatAccessions, limit: HARD_LIMIT, content_type: 'text/plain' },
        "embl":    { metadata: 0, mapper: workerFormatAccessions, limit: HARD_LIMIT, content_type: 'text/plain' },
        "hmm":     { metadata: 0, mapper: workerFormatAccessions, limit: HMM_LIMIT, content_type: 'text/plain' },
      };

      const format_rules = export_formats[format];

      if (!format_rules) {
        reject(Service.rejectResponse("Unrecognized format: " + format, 400));
      }

      const clade_info = await collectClades(clade, clade_relatives);

      const query = buildFamQuery(format_rules, name, name_accession, name_prefix, classification, clade_info, clade_relatives, desc, type, subtype, updated_after, updated_before, keywords, include_raw, sort, limit, start);
      const count_result = await dfam.familyModel.findAndCountAll(query);
      const total_count = count_result.count;

      if (download) {
        logger.info(`Retrieved ${total_count} Families for ${args_hash}`);
      }

      // Return message if query is too large to be sent
      if (
        (!limit && total_count > format_rules.limit) || 
        (limit && limit > format_rules.limit)
      ) {
        const message = `Result size of ${total_count} is above the per-query limit of ${format_rules.limit}. Please narrow your search terms or use the limit and start parameters.`;
        resolve(Service.rejectResponse( message, 405 ));
        if (download && await fs.access(working_file).then(()=> true).catch(()=> false)) {
          // cleanup working file
          await fs.unlink(working_file);
          logger.info(`Removed Working File ${working_file}`);
        }
        return;
      }
      let caching = download && total_count > config.CACHE_CUTOFF;

      // process rows into file
      let rows = count_result.rows;
      rows = await family.familySubqueries(rows, format);
      if (download) {
        logger.info(`Retrieved subqueries completed for ${args_hash}`);
      }
      
      // if caching, a working file will be written to instead of formatted.body 
      let formatted = await format_rules.mapper(total_count, rows, format, copyright=null, download, write_file = caching ? working_file : null);
      //let write_file = caching ? working_file : null;
      //let formatted = await format_rules.mapper(total_count, rows, format, null, download, write_file);

      if (download && !formatted) {
        let message = `Formatting Failed for ${args_hash}`;
        logger.error(message);
        resolve(Service.rejectResponse( { payload: {message} }, 500 ));
        if (await fs.access(working_file).then(()=> true).catch(()=> false)) {
          // cleanup working file
          await fs.unlink(working_file);
          logger.info(`Removed Working File ${working_file}`);
        }
        return;
      } 
      else if (
        download && (
          (!caching && !formatted.body) && // failing to build response body when not caching
          (await fs.access(working_file).then(()=> true).catch(()=> false) && ! await fs.stat(working_file).size > 0) // cache file exists and is empty
        )
      ) {
        let message = `Formatted body does not exist for ${args_hash}`;
        logger.error(message);
        resolve(Service.rejectResponse( { payload: {message} }, 500 ));
        if (await fs.access(working_file).then(()=> true).catch(()=> false)) {
          // cleanup working file
          await fs.unlink(working_file);
          logger.info(`Removed Working File ${working_file}`);
        }
        return;
      }
      else if (download){
        logger.info(`Successfully Formatted ${args_hash}`);
      }

      if (download) {
        if (!caching) {
          logger.info(`Returning ${args_hash} Without Caching`);
          // compress response body
          let compressed = await promisify(zlib.gzip)(formatted.body);
          // base64 encode body
          let b64 = Buffer.from(compressed).toString('base64');
          formatted.body = b64;
          // cleanup working file
          await fs.unlink(working_file);
          logger.info(`Removed Working File ${working_file}`);
          // return data directly
          resolve(Service.successResponse(formatted, 200));
          return;
        }
        // If large file,  compress, encode, and wrap saved working file in JSON to complete cache file
        if (caching && await fs.access(working_file).then(()=> true).catch(()=> false)) {
          logger.info(`Caching ${args_hash}`);
          // build JSON header
          await fs.writeFile(cache_file, `{"attachment": "families${extensions[format]}", "content_type": "text/plain", "encoding": "identity", "body": "`);
          // compress and encode working data into cache file
          await new Promise((resolve, reject) => {
            let zipper = child_process.spawn("sh", ["-c", `cat ${working_file} | gzip | base64 -w 0 >> ${cache_file}`]);
            zipper.on('error', err => reject(err));
            zipper.on('close', (code) => {
              if (code == 0) {resolve(code);}
              else {reject(code);}
            });
          });
          // finish JSON
          await fs.appendFile(cache_file, '"}');
          // Log and remove working file
          logger.info(`Wrote Cache File ${cache_file}`);
          await fs.unlink(working_file);
          logger.info(`Removed Working File ${working_file}`);
          // delay returning to allow caching system to open file and return data
          resolve(Service.successResponse({body: "Working..."}, 202));
        } 
      } else {
        // without dowload, return data directly
        resolve(Service.successResponse(formatted, 200));
      }

    } catch (e) {
      if (download){
        logger.error(`Caching Request Failed: ${args_hash} - ${e}`);
        if (await fs.access(working_file).then(()=> true).catch(()=> false)){
          await fs.unlink(working_file);
          logger.info(`Removed Working File ${working_file}`);
        }
      } else {
        logger.error(`Error - ${e}`);
      }
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 500,
      ));
    }
  },
);


/**
 * Retrieve full details of a single Dfam family by accession.
 *
 * TODO: Describe what is meant by "full details" here
 *
 * @param {Object} params
 * @param {string} params.id - The Dfam family accession.
 * @returns {Promise<ServiceResponse>} - The complete metadata of the family or 404.
 */
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
        const full_rows = await family.familySubqueries([row], "full");
        resolve(Service.successResponse({ payload: family.familyQueryRowToObject(full_rows[0], "full") }));
      } else {
        resolve(Service.successResponse({ payload: {} }, 404));
      }

    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Unable to retrieve family by ID.',
        e.status || 500,
      ));
    }
  },
);

/**
 * Retrieve the annotated HMM for a Dfam family in one of several formats.
 *
 * @param {Object} params
 * @param {string} params.id - The Dfam family accession.
 * @param {string} params.format - One of "hmm", "logo", or "image".
 * @param {boolean} params.download - If true, prepares content as a file to trigger a browser download.
 * @returns {Promise<ServiceResponse>} - The HMM content or visualization.
 */
const readFamilyHmm = ({ id, format, download }) => new Promise(
  async (resolve, reject) => {
    try {
      const extensions = { 'hmm': '.hmm', 'logo': '.logo', 'image': '.png' };
      if ( ! (format in extensions) ) {
        resolve(Service.rejectResponse( "Unrecognized format: " + format, 400 ));
      }

      const obj = {};
      if (download) {
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
          resolve(Service.rejectResponse( "Logo not found", 400 ));
        }
        obj.payload = model["hmm_logo"];
        obj.encoding = "gzip";
      } else if (format == "image") {

        const model = await dfam.hmmModelDataModel.findOne({
          attributes: [ "hmm" ],
          include: [ { model: dfam.familyModel, where: { accession: id }, attributes: [] } ],
        });

        if (!model || !model["hmm"]) {
          resolve(Service.rejectResponse( "Model not found", 400 ));
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

      } else if (format == "hmm") {
        obj.payload = await workerPool.piscina.run({accessions: [id], include_copyright: 0}, { name: 'hmm_command' });
      }

      resolve(Service.successResponse(obj));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 500,
      ));
    }
  },
);


/**
 * Retrieve similarity relationships between a Dfam family and others.
 *
 * @param {Object} params
 * @param {string} params.id - The Dfam family accession.
 * @param {string} [params.include="all"] - "all" or "related" (limits scope to related clades).
 * @param {boolean} [params.include_raw=false] - Whether to include matches to raw (DR) families.
 * @returns {Promise<ServiceResponse>} - JSON array of overlap segment annotations.
 */
const readFamilyRelationships = ({ id, include, include_raw }) => new Promise(
  async (resolve, reject) => {
    try {

      const clade_infos = [];

      // Retrieve lineage + IDs for all clades associated to the family
      if (include === "related") {
        const fam = await dfam.familyModel.findOne({
          where: { accession: id },
          include: [{
            model: dfam.dfamTaxdbModel,
            as: "clades",
            attributes: ["tax_id"],
          }],
        });

        for (const cl of fam?.clades || []) {
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
      if (!include_raw) {
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
        e.message || 'Unable to retrieve family relationships.',
        e.status || 500,
      ));
    }
  },
);

/**
 * Retrieve seed alignment for a Dfam family in various formats.
 *
 * @param {Object} params
 * @param {string} params.id - The Dfam family accession.
 * @param {string} params.format - One of "stockholm", "alignment_summary", or "sam".
 * @param {boolean} params.download - Whether to prepare the file for browser download.
 * @returns {Promise<ServiceResponse>}
 */
const readFamilySeed = ({ id, format, download }) => new Promise(
  async (resolve, reject) => {
    try {
      const extensions = { 'stockholm': '.stk', 'alignment_summary': '.json', 'sam': '.sam' };
      if ( ! (format in extensions) ) {
        resolve(Service.rejectResponse( "Unrecognized format: " + format, 400 ));
      }

      var obj = {};
      if (download) {
        obj.attachment = id + extensions[format];
      }

      if (format == "stockholm") {
        obj.payload = await workerPool.piscina.run({accessions: [id]}, { name: 'stockholm_command' });
        obj.content_type = "text/plain";
        obj.encoding = "identity";
      } else if (format == "sam" ) {
        // RMH: This is a somewhat special case, as it does not honor the download flag and
        // the function call only expects a single accession.
        obj.payload = await workerPool.piscina.run({accession: id}, { name: 'sam_command' });
        obj.content_type = "text/plain";
        obj.encoding = "identity";
      } else if (format == "alignment_summary") {
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
          reject(Service.rejectResponse(`Family with accession ${id} has no seed alignment graph data.`, 404));
        }

        // low_priority TODO: Include values for graphData.publicSequences and
        // graphData.representedAssemblies, once we are confident we
        // can calculate them correctly

        graphData.averageKimuraDivergence = seedAlignData.avg_kimura_divergence;
        obj.payload = graphData;
        obj.content_type = "application/json";
        obj.encoding = "identity";
      }
      if (obj.payload) {
        resolve(Service.successResponse(obj));
      } else {
        reject(Service.rejectResponse(`Error Recovering Seed For ${id}`, 404));
      }
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Unable to retrieve seed alignment.',
        e.status || 500,
      ));
    }
  },
);


/**
 * Retrieve the annotated consensus sequence for a Dfam family.
 *
 * NOTE: If only the raw sequence is needed, use the 'consensus_sequence' property
 * from the `/families/{id}` endpoint instead.
 *
 * @param {Object} params
 * @param {string} params.id - The Dfam family accession.
 * @param {string} params.format - "embl" or "fasta".
 * @param {boolean} params.download - Whether to trigger a browser download.
 * @returns {Promise<ServiceResponse>}
 */
const readFamilySequence = ({ id, format, download }) => new Promise(
  async (resolve, reject) => {
    try {
      const extensions = { 'embl': '.embl', 'fasta': '.fa' };
      if ( ! (format in extensions) ) {
        resolve(Service.rejectResponse( "Unrecognized format: " + format, 400 ));
      }

      var obj = {};
      if (download) {
        obj.attachment = id + extensions[format];
      }
      obj.content_type = "text/plain";
      obj.encoding = "identity";

      if (format == "embl") {
        obj.payload = await workerPool.piscina.run({accessions: [id]}, { name: 'embl_command' });
      }else {
        obj.payload = await workerPool.piscina.run({accessions: [id]}, { name: 'fasta_command' });
      }

      resolve(Service.successResponse(obj));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Unable to retrieve consensus sequence.',
        e.status || 500,
      ));
    }
  },

);

/**
 * Recursively collect taxonomic clade information by tax ID or name.
 *
 * NOTE: If the clade is not found, this function returns null.
 *
 * @param {string|number} clade - Taxonomic ID or scientific name.
 * @param {string} clade_relatives - "ancestors", "descendants", or "both".
 * @returns {Promise<{ ids: number[], lineage: string } | null>} - Clade info for filtering.
 */
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

module.exports = {
  readDfamRelationships,
  readProteinAlignments,
  readSelfAlignments,
  readTandemRepeats,
  readFamilies,
  readFamilyById,
  readFamilyHmm,
  readFamilyRelationships,
  readFamilySeed,
  readFamilySequence,
};
