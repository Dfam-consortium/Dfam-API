/* eslint-disable no-unused-vars */
const Service = require('./Service');
const winston = require('winston');
const getModels_Assembly = require("../databases.js").getModels_Assembly;
const dfam = require("../databases").getModels_Dfam();
const Sequelize = require("sequelize");
const mapFields = require("../utils/mapFields.js");

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

      const assembly_model = await dfam.assemblyModel.findOne({
        attributes: ["schema_name"],
        where: { "name": assembly },
      })
      if (!assembly_model) {
        reject(Service.rejectResponse({}, 404));
      }

      const models = await getModels_Assembly(assembly_model.schema_name);

      let query_hmm = {
        attributes: ["family_accession", "seq_start", "seq_end", "strand", "ali_start", "ali_end", "model_start", "model_end", "hit_bit_score", "hit_evalue_score", "nrph_hit"],
        include: {
          model: models.sequenceModel,
          attributes: ["id"],
          where: {
            [Sequelize.Op.or]: [
              { "id": chrom },
              { "id": "chr" + chrom },
            ]
          },
        },
        where: [
               // We want to find all annotations where either the start or end point
               // is in between the 'start' and 'end' of the window.
                 { [Sequelize.Op.or]: [
                     { seq_start: { [Sequelize.Op.between]: [start, end] } },
                     { seq_end: { [Sequelize.Op.between]: [start, end] } },
                     ] 
                 },
               ],
      };

      if ( family_accession ) { 
        query_hmm.where.push({ '$family_accession$': family_accession });
      }

      if (nrph === true) {
        query_hmm.where.push({ nrph_hit: 1 });
      }

   
      // nhmmerResults
      const regions = await models.hmmFullRegionModel.findAll(query_hmm)
      var family_name_mappings = {};
      var nhmmerResults = regions.map((region) => {
        var hit = mapFields(region, {}, {
          "family_accession": "accession",
          "hit_bit_score": "bit_score",
          "hit_evalue_score": "e_value",
          "model_start": "model_start",
          "model_end": "model_end",
          "strand": "strand",
          "ali_start": "ali_start",
          "ali_end": "ali_end",
          "seq_start": "seq_start",
          "seq_end": "seq_end",
        });
        hit.sequence = region.sequence.id;

        // Accumulate accessions whose names and types we need to retrieve
        if (!family_name_mappings[hit.accession]) {
          family_name_mappings[hit.accession] = [];
        }
        family_name_mappings[hit.accession].push(hit);

        return hit;
      });

      // Retrieve the names and types of all matched families
      const families = await dfam.familyModel.findAll({
        where: { accession: { [Sequelize.Op.in]: Object.keys(family_name_mappings) } },
        attributes: ["name", "accession"],
        include: [ { model: dfam.classificationModel, as: 'classification', include: [
          { model: dfam.rmTypeModel, as: 'rm_type', attributes: ["name"] }
        ] } ],
      })
      families.forEach(function(family) {
        family_name_mappings[family.accession].forEach((hit) => {
          hit.query = family.name;
          hit.type = null;
          if (family.classification) {
            if (family.classification.rm_type) {
              hit.type = family.classification.rm_type.name;
            }
          }
        });

        return nhmmerResults;
      });

      const query_trf = {
        include: {
          model: models.sequenceModel,
          attributes: ["id"],
          where: {
            [Sequelize.Op.or]: [
              { "id": chrom },
              { "id": "chr" + chrom },
            ]
          },
        },
        where: {
          [Sequelize.Op.or]: [
            { seq_start: { [Sequelize.Op.between]: [start, end] } },
            { seq_end: { [Sequelize.Op.between]: [start, end] } },
          ],
        }
      };
 
      const mask_regions = await models.maskModel.findAll(query_trf)
      var trfResults = mask_regions.map((region) => {
        var hit = mapFields(region, {}, {
          "seq_start": "start",
          "seq_end": "end",
          "repeat_str": "type",
          "repeat_length": "repeat_length",
        });
        hit.sequence = region.sequence.id;
  
        return hit;
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
