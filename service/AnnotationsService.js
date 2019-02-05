'use strict';

const APIResponse = require('../utils/response.js').APIResponse;

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const conn = require("../databases.js").dfam;
const getAssemblyModels = require("../databases.js").getAssemblyModels;
const mapFields = require("../utils/mapFields.js");

const familyModel = require("../models/family.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const assemblyModel = require("../models/assembly.js")(conn, Sequelize);

familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id' });
classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id' });

/**
 * Retrieve annotations for a given assembly in a given range.
 *
 * assembly String Assembly to search
 * chrom String Chromosome to search
 * start Integer Start of the sequence range.
 * end Integer End of the sequence range.
 * family String An optional family to restrict results to (optional)
 * nrph Boolean \"true\" to exclude redundant profile hits (optional)
 * no response value expected for this operation
 **/
exports.readAnnotations = function(assembly,chrom,start,end,family,nrph) {
  if (Math.abs(end-start) > 50000) {
    return Promise.resolve(new APIResponse(
      { message: "Requested range is too long." },
      400
    ));
  }

  return assemblyModel.findOne({
    attributes: ["schema_name"],
    where: { "name": assembly },
  }).then(function(assembly) {
    const models = getAssemblyModels(assembly.schema_name);

    const query_hmm = {
      attributes: ["family_accession", "seq_start", "seq_end", "strand", "ali_start", "ali_end", "model_start", "model_end", "hit_bit_score", "hit_evalue_score", "nrph_hit"],
      include: { model: models.sequenceModel, where: { "id": chrom }, attributes: ["id"] },
      where: {
        seq_start: { [Op.gte]: start },
        seq_end: { [Op.lte]: end },
      }
    };

    const query_trf = {
      include: { model: models.sequenceModel, where: { "id": chrom }, attributes: ["id"] },
      where: {
        seq_start: { [Op.gte]: start },
        seq_end: { [Op.lte]: end },
      }
    };

    if (nrph === true) {
      query_hmm.where.nrph_hit = true;
    }

    const nhmmerResults = models.hmmFullRegionModel.findAll(query_hmm).then(function(regions) {

      var family_name_mappings = {};

      var nhmmer = regions.map(function(region) {
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
      return familyModel.findAll({
        where: { accession: { [Op.in]: Object.keys(family_name_mappings) } },
        attributes: ["name", "accession"],
        include: [ { model: classificationModel, include: [
          { model: rmTypeModel, attributes: ["name"] }
        ] } ],
      }).then(function(families) {
        families.forEach(function(family) {
          family_name_mappings[family.accession].forEach(function(hit) {
            hit.query = family.name;
            hit.type = null;
            if (family.classification) {
              if (family.classification.repeatmasker_type) {
                hit.type = family.classification.repeatmasker_type.name;
              }
            }
          });
        });

        if (family) {
          nhmmer = nhmmer.filter(function(hit) {
            return hit.query === family || hit.accession === family;
          });
        }

        return nhmmer;
      });
    });

    const trfResults = models.maskModel.findAll(query_trf).then(function(regions) {
      var trf = regions.map(function(region) {
        var hit = mapFields(region, {}, {
          "seq_start": "start",
          "seq_end": "end",
          "repeat_str": "type",
          "repeat_length": "repeat_length",
        });
        hit.sequence = region.sequence.id;

        return hit;
      });

      return trf;
    });

    return Promise.all([nhmmerResults, trfResults]).then(function([nhmmer, trf]) {
      return {
        offset: start,
        length: Math.abs(end - start),
        query: `${chrom}:${start}-${end}`,
        hits: nhmmer,
        tandem_repeats: trf,
      };
    });
  });
};

