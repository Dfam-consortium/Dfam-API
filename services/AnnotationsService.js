/* eslint-disable no-unused-vars */
const Service = require('./Service');
const dfam = require("../databases").getModels_Dfam();
const Sequelize = require("sequelize");
const {te_idx_dir} = require('../config');
const fs = require("fs");
const te_idx = require("../utils/te_idx.js");
const logger = require('../logger');
/**
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
      //Useful for tagging related log messages together
      let rtoken = Math.random();
      logger.info(`readAnnotations(${rtoken}): assembly=${assembly}, chrom=${chrom}, start=${start}, end=${end}, family=${family}, nrph=${nrph}`);
      
      // Fixed: This was defined as implicitly global (e.g. not 'let', 'const' or 'var').  
      let family_accession = family;
      if (start > end) {
        const swap = start;
        start = end;
        end = swap;
      }

      if (Math.abs(end-start) > 1000000) {
        reject(Service.rejectResponse({ message: "Requested range is too long." }, 400));
      }
      let full_assembly = await dfam.assemblyModel.findOne({
        where: {"name": assembly},
        attributes:["schema_name"]
      });

      if (! full_assembly) {
        reject(Service.rejectResponse(`Assembly ${assembly} Not Found`, 404));
      } else {
        full_assembly = full_assembly.schema_name;
      }

      let assembly_dir = `${te_idx_dir}/${full_assembly}/`;
      if (!fs.existsSync(assembly_dir)) {
        reject(Service.rejectResponse(`Assembly ${assembly} Not Found`, 404));
      }

      let chrom_in_assem =  await te_idx.chromInAssembly(full_assembly, chrom);
      if (! chrom_in_assem) {
        reject(Service.rejectResponse(`Sequence ${chrom} Not Found In Assembly ${assembly}`, 404));
      }

      // Obtain simple/tandem annotations from the TE_Idx
      let teidx_args = ["--assembly", full_assembly, "idx-query", "--data-type", "masks", "--chrom", chrom, "--start", start, "--end", end];
      let tandem_annots = await te_idx.query(teidx_args);
      // RMH: 20251121: Added normalization step to convert strings to integers and remove whitespace.
      //      The API requires that these fields be integers and this wasn't caught by our unit tests.
      //      In addition there is a bug in a version of the te_idx tool (v0.1.1) which reports a 
      //      line feed in the repeat_length field:
      //           {
      //             "repeat_length": "5\n",
      //             "repeat_str": "GAGGG",
      //             "seq_acc": "chr1",
      //             "seq_end": "168146209",
      //             "seq_start": "168146103"
      //           },
      // Normalize the results
      tandem_annots = tandem_annots.map(entry => ({
        ...entry,
        repeat_length: parseInt(entry.repeat_length.replace(/\s+/g, ''), 10),
        seq_start: parseInt(entry.seq_start, 10),
        seq_end: parseInt(entry.seq_end, 10),
      }));

      // Obtain the TE annotations from the TE_Idx
      teidx_args = ["--assembly", full_assembly, "idx-query", "--data-type", "assembly_alignments",  "--chrom", chrom, "--start", start, "--end", end];

      if (family_accession) { 
        teidx_args.push("--family");
        teidx_args.push(family_accession);
      }

      if (nrph) {
        teidx_args.push("--nrph");
      }

      let teResults = await te_idx.query(teidx_args);

      // RMH: 20251121: Added normalization step to convert strings to integers and remove whitespace.
      //      The API requires that these fields be integers and this wasn't caught by our unit tests.
      //      Also the bit_score field may be a float.
      // Normalize the results
      teResults = teResults.map(entry => ({
        ...entry,
        bit_score: parseFloat(entry.bit_score),
        ali_start: parseInt(entry.ali_start, 10),
        ali_end: parseInt(entry.ali_end, 10),
        model_start: parseInt(entry.model_start, 10),
        model_end: parseInt(entry.model_end, 10),
        seq_start: parseInt(entry.seq_start, 10),
        seq_end: parseInt(entry.seq_end, 10),
      }));

      // Collect all accessions found, as well as thier positions in the list of results
      // Fixed: This was defined as implicitly global (e.g. not 'let', 'const' or 'var').  
      let accession_idxs = {};
      teResults.forEach((hit, i) => {
        if (!accession_idxs[hit.accession]) {accession_idxs[hit.accession] = [];}
        accession_idxs[hit.accession].push(i);
      });
  
      // Retrieve the names and types of all matched families
      const families = await dfam.familyModel.findAll({
        where: { accession: { [Sequelize.Op.in]: Object.keys(accession_idxs) } },
        attributes: ["name", "accession"],
        include: [ { model: dfam.classificationModel, as: 'classification', include: [
          { model: dfam.rmTypeModel, as: 'rm_type', attributes: ["name"] }
        ] } ],
      });
      if (Object.keys(accession_idxs).length != families.length ){
        logger.error(`token=${rtoken}: ${Object.keys(accession_idxs).length} != ${families.length}`);
      }

      // Add names and types to list of hits
      families.forEach(function(family) {
        accession_idxs[family.accession].forEach((i) => {
          teResults[i].query = family.name;
          teResults[i].type = null;
          if (family.classification) {
            if (family.classification.rm_type) {
              teResults[i].type = family.classification.rm_type.name;
            }
          }
        });
      });

      //logger.info(`readAnnotations(${rtoken}): complete`);
      resolve(Service.successResponse({
        offset: start,
        length: Math.abs(end - start),
        query: `${chrom}:${start}-${end}`,
        hits: teResults,
        tandem_repeats: tandem_annots,
      }, 200 ));

      
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || `Invalid Input - ${e} - ${e.message}`,
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  readAnnotations,
};
