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
const fs = require('fs');

/**
* Retrieve a list of families in Dfam, optionally filtered and sorted.
* Retrieve a list of families in Dfam, optionally filtered and sorted.
*
* format String Desired output format. Supported formats include \"summary\", \"full\", \"embl\", \"fasta\", and \"hmm\". Defaults to \"summary\". (optional)
* sort String A string containing sort columns, for example \"name:asc,length:desc\". Sorting by any of \"accession\", \"name\", \"length\", \"type\", \"subtype\", \"date_created\", and \"date_modified\" are supported. If unspecified, \"accession:asc\" will be used. (optional)
* name String Search term for any part of the family name. Takes precedence over \"name_prefix\" if both are specified. (optional)
* name_prefix String Search term for a prefix of the family name. (optional)
* name_accession String Search term for any part of the family name or accession (optional)
* classification String Search term for family classification. Sub-classifications are included. A full classification lineage is expected for this search term; such as \"root;Interspersed_Repeat\". (optional)
* clade String Search term for family clade. Can be either an NCBI Taxonomy ID or scientific name. If the scientific name is ambiguous (e.g. \"Drosophila\"), the taxonomy ID should be used instead. (optional)
* clade_relatives String Relatives of the requested clade to include: 'ancestors', 'descendants', or 'both' (optional)
* type String Search term for TE type, as understood by RepeatMasker. (optional)
* subtype String Search term for TE subtype, as understood by RepeatMasker. (optional)
* updated_after date Filter by \"updated on or after\" date. (optional)
* updated_before date Filter by \"updated on or before\" date. (optional)
* desc String Search term for family description. (optional)
* keywords String Keywords to search in text fields (currently name, title, description, accession, author). (optional)
* include_raw Boolean Whether to include raw (\"DR\") families in the results. Default is false. (optional)
* start Integer Index of first record to return. Commonly used along with `limit` to implement paging. (optional)
* limit Integer Maxium number of records to return. (optional)
* download Boolean If true, adds headers to trigger a browser download. (optional)
* returns familiesResponse
* */
const readFamilies = ({...args} = {}, { format, sort, name, name_prefix, name_accession, classification, clade, clade_relatives, type, subtype, updated_after, updated_before, desc, keywords, include_raw, start, limit, download } = args) => new Promise(
  async (resolve, reject) => {
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
    async function workerFormatAccessions(total_count, rows, format, copyright, download) {
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
        obj.body = await workerPool.piscina.run({accessions: accs, include_copyright: 0}, { name: 'embl_command' });
      } else if (format == "fasta") {
        obj.body = await workerPool.piscina.run({accessions: accs}, { name: 'fasta_command' });
      } else if (format == "hmm") {
        obj.body = await workerPool.piscina.run({accessions: accs, include_copyright: 0}, { name: 'hmm_command' });
      } 

      return obj;
    }
    try {

      if (!format) {
        format = "summary";
      }

      const cache_dir = config.dfamdequeuer.result_store + "/browse-cache/"
      const cache_name = md5(JSON.stringify(args)) + ".cache" 
      const cache_file = cache_dir + cache_name
      const working_file = cache_file + '.working'

      // If cache exists, return cache file
      if ( download && fs.existsSync(cache_file) ) {
        // read base64 file, convert back to ASCII, parse into object and return
        const file = fs.readFileSync(cache_file, {encoding: 'utf8', flag: 'r'})
        // const str = Buffer.from(file, "base64").toString()
        const res = JSON.parse(file)
        resolve(Service.successResponse(res, 200));
        return

      // If cache is being built, return message
      } else if ( download && fs.existsSync(working_file)) {
        resolve(Service.successResponse({body: "Working..."}, 202));
        return
      
      // Write blank working file so client knows it's in process before query is returned
      } else if (download) {
        fs.writeFileSync(working_file, "")
      }

      // TODO: Consider making these configurable in Dfam.conf
      // TODO: add "count" format that doesn't fill in the summary data and doesn't necessaryily join the classification tables for faster default counts
      const HARD_LIMIT = 5000, HMM_LIMIT = 2000;
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
        let class_decode = decodeURIComponent(classification)
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

      const count_result = await dfam.familyModel.findAndCountAll(query);
      const total_count = count_result.count;

      // Return message if query is too large to be sent
      if (total_count > format_rules.limit && (limit === undefined || limit > format_rules.limit)) {
        const message = `Result size of ${total_count} is above the per-query limit of ${format_rules.limit}. Please narrow your search terms or use the limit and start parameters.`;
        resolve(Service.successResponse( { payload: {message} }, 400 ));
      }

      // process rows into file
      let rows = count_result.rows;
      rows = await family.familySubqueries(rows, format);
      let formatted = await format_rules.mapper(total_count, rows, format, copyright=null, download)

      // If large request write data to working file and rename to finished file
      if (total_count > config.CACHE_CUTOFF && download && fs.existsSync(working_file)) {
        // compress response body
        let compressed = zlib.gzipSync(formatted.body);
        // base64 encode body
        let b64 = Buffer.from(compressed).toString('base64')
        formatted.body = b64

        // set headers
        // formatted.encoding = 'gzip'
        // formatted.isBase64Encoded = true

        // write object to string
        let str = JSON.stringify(formatted)
        //write and rename file
        fs.writeFileSync(working_file, str)
        fs.renameSync(working_file, cache_file)

      // otherwise, remove placeholder working file
      } else if (download && fs.existsSync(working_file) ){
        fs.unlinkSync(working_file)
      }
    
      resolve(Service.successResponse(formatted, 200));

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
        const full_rows = await family.familySubqueries([row], "full");
        resolve(Service.successResponse({ payload: family.familyQueryRowToObject(full_rows[0], "full") }));
      } else {
        resolve(Service.successResponse({ payload: {} }, 404));
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
      const extensions = { 'hmm': '.hmm', 'logo': '.logo', 'image': '.png' };
      if ( ! (format in extensions) ) {
        resolve(Service.rejectResponse( "Unrecognized format: " + format, 400 ));
      }

      var obj = {};
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
* include_raw Boolean Whether to include matches to raw (\"DR\") families. Default is false. (optional)
* returns List
* */
const readFamilyRelationships = ({ id, include, include_raw }) => new Promise(
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
      const extensions = { 'stockholm': '.stk', 'alignment_summary': '.json' };
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

        // low_priority TODO: Include values for graphData.publicSequences and
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
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },

);

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

module.exports = {
  readFamilies,
  readFamilyById,
  readFamilyHmm,
  readFamilyRelationships,
  readFamilySeed,
  readFamilySequence,
};
