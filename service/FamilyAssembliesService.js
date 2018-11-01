'use strict';

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const conn = require("../databases.js").dfam;
const getAssembly = require("../databases.js").getAssembly;
const winston = require("winston");
const zlib = require("zlib");

const familyModel = require("../models/family.js")(conn, Sequelize);
const familyAssemblyDataModel = require("../models/family_assembly_data.js")(conn, Sequelize);
const assemblyModel = require("../models/assembly.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const writer = require("../utils/writer.js");
const mapFields = require("../utils/mapFields.js");

familyAssemblyDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });
familyAssemblyDataModel.belongsTo(assemblyModel, { foreignKey: 'assembly_id' });
assemblyModel.belongsTo(dfamTaxdbModel, { foreignKey: 'dfam_taxdb_tax_id' });

const assemblyModels = {};
function getAssemblyModels(schema_name) {
  if (!assemblyModels[schema_name]) {
    const models = assemblyModels[schema_name] = {};
    const conn = models.conn = getAssembly(schema_name);
    models.modelFileModel = require("../models/assembly/model_file.js")(conn, Sequelize);
    models.karyotypeModel = require("../models/assembly/karyotype.js")(conn, Sequelize);
    models.coverageDataModel = require("../models/assembly/coverage_data.js")(conn, Sequelize);
    models.percentageIdModel = require("../models/assembly/percentage_id.js")(conn, Sequelize);
  }

  return assemblyModels[schema_name];
}

/**
 * Retrieve an individual Dfam family's list of linked annotated assemblies
 *
 * id String The Dfam family name
 * no response value expected for this operation
 **/
exports.readFamilyAssemblies = function(id) {
  return familyAssemblyDataModel.findAll({
    attributes: [],
    include: [
      { model: familyModel, where: { 'accession': id }, attributes: [] },
      { model: assemblyModel, include: [ dfamTaxdbModel ], attributes: ["name"] },
    ],
  }).then(function(data) {
    return data.map(function(family_assembly) {
      return {
        id: family_assembly.assembly.name,
        name: family_assembly.assembly.dfam_taxdb.scientific_name,
      };
    });
  });
}


/**
 * Retrieve a family's annotation statistics for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyAnnotationStats = function(id,assembly_id) {
  return familyAssemblyDataModel.findOne({
    include: [
      { model: familyModel, where: { 'accession': id }, attributes: [] },
      { model: assemblyModel, where: { 'name': assembly_id }, attributes: [] },
    ],
  }).then(function(family_assembly) {
    if (!family_assembly) {
      return null;
    }

    let obj = { };

    if (family_assembly.hmm_GA_nrph_hit_count !== null) {
      obj.hmm = {
        divergence: family_assembly.hmm_genome_avg_kimura_div,
        gathering_nonredundant: family_assembly.hmm_GA_nrph_hit_count,
        gathering_all: family_assembly.hmm_GA_hit_count,
        trusted_nonredundant: family_assembly.hmm_TC_nrph_hit_count,
        trusted_all: family_assembly.hmm_TC_hit_count,
      };
    }

    if (family_assembly.cons_GA_nrph_hit_count !== null) {
      obj.cons = {
        divergence: family_assembly.cons_genome_avg_kimura_div,
        gathering_nonredundant: family_assembly.cons_GA_nrph_hit_count,
        gathering_all: family_assembly.cons_GA_hit_count,
        trusted_nonredundant: family_assembly.cons_TC_nrph_hit_count,
        trusted_all: family_assembly.cons_TC_hit_count,
      };
    };

    return obj;
  });
}


/**
 * Retrieve a family's annotation data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * nrph Boolean \\\"true\\\" to include only non-redundant profile hits
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyAnnotations = function(id,assembly_id,nrph) {
  return assemblyModel.findOne({
    attributes: ["schema_name"],
    where: { 'name': assembly_id }
  }).then(function(assembly) {
    if (!assembly) {
      return null;
    }

    const models = getAssemblyModels(assembly.schema_name);

    var column;
    if (nrph === true) {
      column = "nrph_hit_list";
    } else  {
      column = "hit_list";
    }

    return models.modelFileModel.findOne({
      attributes: [ column ],
      where: { "model_accession": id }
    }).then(function(files) {
      return new Promise(function(resolve, reject) {
        if (!files || !files[column]) {
          return resolve(null);
        }

        zlib.gunzip(files[column], function(err, data) {
          if (err) { reject(err); }
          else { resolve(data); }
        });
      }).then(function(data) {
        if (data) {
          return { data, content_type: "text/plain" };
        } else {
          return null;
        }
      });
    });
  });
}


/**
 * Retrieve a family's karyotype image data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyKaryoImage = function(id,assembly_id,nrph,part) {
  return assemblyModel.findOne({
    attributes: ["schema_name"],
    where: { 'name': assembly_id }
  }).then(function(assembly) {
    if (!assembly) {
      return null;
    }

    const models = getAssemblyModels(assembly.schema_name);

    const parts = {
      "heatmap": ["heatmap", "image/png"],
      "html_map": ["html_map", "text/plain"],
      "img_key": ["img_key", "text/plain"],
    };

    if (!parts[part]) {
      return null;
    }

    var column = parts[part][0];

    if (nrph === true) {
      column = "nrph_" + column;
    }

    return models.karyotypeModel.findOne({
      attributes: [ column ],
      where: { "model_accession": id }
    }).then(function(karyotype) {
      if (karyotype && karyotype[column]) {
        return { data: karyotype[column], content_type: parts[part][1] };
      } else {
        return null;
      }
    });
  });
}


/**
 * Retrieve a family's coverage data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * model String Model type, \"cons\" or \"hmm\"
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyModelCoverage = function(id,assembly_id,model) {
  return assemblyModel.findOne({
    attributes: ["schema_name"],
    where: { 'name': assembly_id }
  }).then(function(assembly) {
    if (!assembly) {
      return null;
    }

    const models = getAssemblyModels(assembly.schema_name);

    return models.coverageDataModel.findOne({
      attributes: [ "reversed", "forward", "nrph" ],
      where: { "model_accession": id }
    }).then(function(coverage) {
      if (coverage) {
        return {
          "nrph": JSON.parse(coverage.nrph),
          "all": JSON.parse(coverage.forward),
          "false": JSON.parse(coverage.reversed),
        };
      } else {
        return writer.respondWithCode(404, "");
      }
    });
  });
}

/**
 * Retrieve a family's conservation data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * model String Model type, \"cons\" or \"hmm\"
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyModelConservation = function(id,assembly_id,model) {
  return assemblyModel.findOne({
    attributes: ["schema_name"],
    where: { 'name': assembly_id }
  }).then(function(assembly) {
    if (!assembly) {
      return null;
    }

    const models = getAssemblyModels(assembly.schema_name);

    return models.percentageIdModel.findAll({
      where: { "model_accession": id }
    }).then(function(conservations) {
      return conservations.map(function(cons) {
        const obj = mapFields(cons, {}, {
          "threshold": "threshold",
          "max_insert": "max_insert",
          "num_seqs": "num_seqs",
        });
        obj.graph = JSON.parse(cons.graph_json);

        return obj;
      });
    });
  });
}

