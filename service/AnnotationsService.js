'use strict';

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const conn = require("../databases.js").dfam;
const getAssemblyModels = require("../databases.js").getAssemblyModels;
const winston = require("winston");
const mapFields = require("../utils/mapFields.js");

const assemblyModel = require("../models/assembly.js")(conn, Sequelize);
const writer = require("../utils/writer.js");

/**
 * Retrieve annotations for a given assembly in a given range.
 *
 * assembly String Assembly to search
 * chrom String Chromosome to search
 * start Integer Start of the sequence range.
 * end Integer End of the sequence range.
 * family String An optional family to restrict results to (optional)
 * nrph Boolean \\\"true\\\" to exclude redundant profile hits (optional)
 * no response value expected for this operation
 **/
exports.readAnnotations = function(assembly,chrom,start,end,family,nrph) {
  return assemblyModel.findOne({
    attributes: ["schema_name"],
    where: { "name": assembly },
  }).then(function(assembly) {
    const models = getAssemblyModels(assembly.schema_name);

    const query = {
      attributes: ["seq_start", "seq_end", "strand", "model_start", "model_end"],
      include: { model: models.sequenceModel, where: { "id": chrom }, attributes: [] },
      where: {
        seq_start: { [Op.gt]: start },
        seq_end: { [Op.lt]: end },
      }
    };

    if (family) {
      query.where.accession = family;
    }
    if (nrph !== null) {
      query.where.nrph_hit = nrph;
    }

    return models.hmmFullRegionModel.findAll(query).then(function(regions) {
      return regions.map(function(region) {
        mapFields(region, {}, {
          "seq_start": "seq_start",
          "seq_end": "seq_end",
          "strand": "strand",
          "model_start": "model_start",
          "model_end": "model_end",
        });
      });
    });
  });
}

