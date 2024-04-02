/* eslint-disable no-unused-vars */
const Service = require('./Service');
const dfam = require("../databases").getModels_Dfam();
const Sequelize = require("sequelize");
const {IDX_DIR} = require('../config');
const fs = require("fs");
const te_idx = require("../utils/te_idx.js");


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

      let seq_args = ["seq-query","--assembly", assembly, "--chrom", chrom]
      let seq = await te_idx(seq_args, join=false)

      let trf_args = ["trf-query","--assembly", assembly, "--start", start, "--end", end, "--chrom", seq]
      const trfResults = await te_idx(trf_args)

      let nhmmer_args = ["nhmmer-query","--assembly", assembly, "--start", start, "--end", end, "--chrom", seq]
      if ( family_accession ) { 
        nhmmer_args.push("--family");
        nhmmer_args.push(family_accession);
      }
      if (nrph === true) {
        nhmmer_args.push("--nrph");
      }
      const nhmmerResults = await te_idx(nhmmer_args)

      // collect all accessions found, as well as thier positions in the list of results
      accession_idxs = {}
      nhmmerResults.forEach((hit, i) => {
        if (!accession_idxs[hit.accession]) {accession_idxs[hit.accession] = []}
        accession_idxs[hit.accession].push(i)
      })

      // Retrieve the names and types of all matched families
      const families = await dfam.familyModel.findAll({
        where: { accession: { [Sequelize.Op.in]: Object.keys(accession_idxs) } },
        attributes: ["name", "accession"],
        include: [ { model: dfam.classificationModel, as: 'classification', include: [
          { model: dfam.rmTypeModel, as: 'rm_type', attributes: ["name"] }
        ] } ],
      })

      // add names and types to list of hits
      families.forEach(function(family) {
        accession_idxs[family.accession].forEach((i) => {
            nhmmerResults[i].query = family.name;
            nhmmerResults[i].type = null;
            if (family.classification) {
              if (family.classification.rm_type) {
                nhmmerResults[i].type = family.classification.rm_type.name;
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
