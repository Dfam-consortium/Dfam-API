/* eslint-disable no-unused-vars */
const Service = require('./Service');
// const winston = require('winston');
// const getModels_Assembly = require("../databases.js").getModels_Assembly;
const dfam = require("../databases").getModels_Dfam();
const Sequelize = require("sequelize");
const mapFields = require("../utils/mapFields.js");
const {IDX_DIR} = require('../config');
const fs = require("fs");
const child_process = require('child_process');
const logger = require('../logger.js');

// const tmp = require('tmp');
// tmp.setGracefulCleanup();

/**
* Retrieve annotations for a given genome assembly in a given range.
* Retrieve annotations for a given genome assembly in a given range.
*
* assembly String Genome assembly to search. A list of assemblies is available at `/assemblies`.
* chrom String Chromosome to search. Assembly dependent, but normally in the \"chrN\" format.
* start Integer Start of the sequence range (one based).
* end Integer End of the sequence range (one based, fully-closed).
* family String An optional family to restrict results to. (optional)
* nrph Boolean `true` to exclude redundant profile hits. (optional)
* returns annotationsResponse
* */
const readAnnotations = ({ assembly, chrom, start, end, family, nrph }) => new Promise(
  async (resolve, reject) => {
    try {
      family_accession = family;
      if (start > end) {
        const swap = start;
        start = end;
        end = swap;
      }

      if (Math.abs(end-start) > 1000000) {
          reject(Service.rejectResponse({ message: "Requested range is too long." }, 400));
      }
      
      let assembly_dir = `${IDX_DIR}/data/${assembly}/assembly_alignments`
      if (!fs.existsSync(assembly_dir)) {
        reject(Service.rejectResponse(`Assembly ${assembly} Not Found`, 404));
      }

      // TODO DRY this section
      let seq_args = ["seq-query","--assembly", assembly, "--chrom", chrom]
      const seq = await new Promise((resolve, reject) => {
        let runner = child_process.spawn(`${IDX_DIR}/target/release/te_idx`, seq_args);
        let data=[];
        runner.on('error', err => { reject(err) });
        runner.stdout.on('data', d => { data.push(d) });
        runner.on('close', (code) => {
          if (code !== 0) { reject(code) }
          else { resolve(JSON.parse(data.toString())) }
        })
      })

      let trf_args = ["trf-query","--assembly", assembly, "--start", start, "--end", end, "--chrom", seq]
      const trfResults = await new Promise((resolve, reject) => {
        let runner = child_process.spawn(`${IDX_DIR}/target/release/te_idx`, trf_args);
        let trf_data=[];
        runner.on('error', err => { reject(err) });
        runner.stdout.on('data', d => { trf_data.push(d) });
        runner.on('close', (code) => {
          if (code !== 0) { reject(code) }
          else { resolve(JSON.parse(trf_data.join('').toString())) }
        })
      })

      let nhmmer_args = ["nhmmer-query","--assembly", assembly, "--start", start, "--end", end, "--chrom", seq]
      if ( family_accession ) { 
        nhmmer_args.push("--family");
        nhmmer_args.push(family_accession);
      }
      if (nrph === true) {
        nhmmer_args.push("--nrph");
      }
      const nhmmerResults = await new Promise((resolve, reject) => {
        let runner = child_process.spawn(`${IDX_DIR}/target/release/te_idx`, nhmmer_args);
        let nhmmer_data=[];
        runner.on('error', err => { reject(err) });
        runner.stdout.on('data', d => { nhmmer_data.push(d) });
        runner.on('close', (code) => {
          if (code !== 0) { reject(code) }
          else { resolve(JSON.parse(nhmmer_data.join('').toString())) }
        })
      })

      var family_name_mappings = {};
      for (hit in nhmmerResults) {
        // Accumulate accessions whose names and types we need to retrieve
        if (!family_name_mappings[hit.accession]) {
          family_name_mappings[hit.accession] = [];
        }
        family_name_mappings[hit.accession].push(hit);
      }

      // Retrieve the names and types of all matched families
      const families = await dfam.familyModel.findAll({
        where: { accession: { [Sequelize.Op.in]: Object.keys(family_name_mappings) } },
        attributes: ["name", "accession"],
        include: [ { model: dfam.classificationModel, as: 'classification', include: [
          { model: dfam.rmTypeModel, as: 'rm_type', attributes: ["name"] }
        ] } ],
      })

      // TODO fix this
      families.forEach(function(family) {
        nhmmerResults[family.accession].forEach((hit) => {
          hit.query = family.name;
          hit.type = null;
          if (family.classification) {
            if (family.classification.rm_type) {
              hit.type = family.classification.rm_type.name;
            }
          }
        });
      });

      resolve(Service.successResponse({
        offset: start,
        length: Math.abs(end - start),
        query: `${chrom}:${start}-${end}`,
        hits: nhmmerResults,
        tandem_repeats: trfResults,
        families: families
      }, 200 ));
      
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  readAnnotations,
};
