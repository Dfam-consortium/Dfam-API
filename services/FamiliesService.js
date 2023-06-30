/* eslint-disable no-unused-vars */
const Service = require('./Service');
const path = require('path');
const config = require('../config');
const child_process = require('child_process');


const Sequelize = require("sequelize");
const dfam = require("../databases").getModels_Dfam();
const zlib = require("zlib");
const wrap = require('word-wrap');
//const logger = require('../logger');

//const family = require("../utils/family");
const WorkerPool = require('../worker-pool');


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
      resolve(Service.successResponse({
        id,
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
      resolve(Service.successResponse({
        id,
        include,
        includeUnderscoreraw,
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
      resolve(Service.successResponse({
        id,
        format,
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
