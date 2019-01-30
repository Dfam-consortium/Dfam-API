'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const getAssemblyModels = require("../databases.js").getAssemblyModels;

const familyModel = require("../models/family.js")(conn, Sequelize);
const familyAssemblyDataModel = require("../models/family_assembly_data.js")(conn, Sequelize);
const assemblyModel = require("../models/assembly.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const mapFields = require("../utils/mapFields.js");

familyAssemblyDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });
familyAssemblyDataModel.belongsTo(assemblyModel, { foreignKey: 'assembly_id' });
assemblyModel.belongsTo(dfamTaxdbModel, { foreignKey: 'dfam_taxdb_tax_id' });

/**
 * Retrieve an individual Dfam family's list of linked annotated assemblies
 *
 * id String The Dfam family name
 * returns familyAssembliesResponse
 **/
exports.readFamilyAssemblies = function(id) {
  return familyAssemblyDataModel.findAll({
    attributes: ["hmm_hit_GA", "hmm_hit_TC", "hmm_fdr"],
    include: [
      { model: familyModel, where: { 'accession': id }, attributes: [] },
      { model: assemblyModel, include: [ dfamTaxdbModel ], attributes: ["name"] },
    ],
  }).then(function(data) {
    return data.map(function(family_assembly) {
      return {
        id: family_assembly.assembly.name,
        name: family_assembly.assembly.dfam_taxdb.scientific_name,
        hmm_hit_ga: family_assembly.hmm_hit_GA,
        hmm_hit_tc: family_assembly.hmm_hit_TC,
        hmm_fdr: family_assembly.hmm_fdr,
      };
    });
  });
};


/**
 * Retrieve a family's annotation statistics for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * returns familyAssemblyAnnotationStatsResponse
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
        avg_hit_length: family_assembly.hmm_avg_hit_length,
        gathering_nonredundant: family_assembly.hmm_GA_nrph_hit_count,
        gathering_all: family_assembly.hmm_GA_hit_count,
        gathering_divergence: family_assembly.hmm_genome_avg_kimura_div_GA,
        trusted_nonredundant: family_assembly.hmm_TC_nrph_hit_count,
        trusted_all: family_assembly.hmm_TC_hit_count,
        trusted_divergence: family_assembly.hmm_genome_avg_kimura_div_TC,
      };
    }

    if (family_assembly.cons_GA_nrph_hit_count !== null) {
      obj.cons = {
        avg_hit_length: family_assembly.cons_avg_hit_length,
        gathering_nonredundant: family_assembly.cons_GA_nrph_hit_count,
        gathering_all: family_assembly.cons_GA_hit_count,
        gathering_divergence: family_assembly.cons_genome_avg_kimura_div_GA,
        trusted_nonredundant: family_assembly.cons_TC_nrph_hit_count,
        trusted_all: family_assembly.cons_TC_hit_count,
        trusted_divergence: family_assembly.cons_genome_avg_kimura_div_TC,
      };
    }

    return obj;
  });
};


/**
 * Retrieve a family's annotation data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * nrph Boolean \"true\" to include only non-redundant profile hits
 * returns String
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
      where: { "family_accession": id }
    }).then(function(files) {
      if (!files || !files[column]) {
        return null;
      }

      return { data: files[column], content_type: "text/plain", encoding: "gzip" };
    });
  });
};


/**
 * Retrieve a family's karyotype data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * returns File
 **/
exports.readFamilyAssemblyKaryotype = function(id,assembly_id) {
  return assemblyModel.findOne({
    attributes: ["schema_name"],
    where: { 'name': assembly_id }
  }).then(function(assembly) {
    if (!assembly) {
      return null;
    }

    const models = getAssemblyModels(assembly.schema_name);

    return models.coverageDataModel.findOne({
      attributes: [ "karyotype" ],
      where: { "family_accession": id }
    }).then(function(data) {
      if (data && data.karyotype) {
        return data.karyotype.toString();
      } else {
        return null;
      }
    });
  });
};


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
    if (!assembly || model != "hmm") {
      return null;
    }

    const models = getAssemblyModels(assembly.schema_name);

    return models.coverageDataModel.findOne({
      attributes: [ "reversed", "forward", "nrph", "num_rev", "num_full", "num_full_nrph" ],
      where: { "family_accession": id }
    }).then(function(coverage) {
      if (coverage) {
        return {
          "nrph": coverage.nrph.toString(),
          "nrph_hits": coverage.num_full_nrph,
          "all": coverage.forward.toString(),
          "all_hits": coverage.num_full,
          "false": coverage.reversed.toString(),
          "false_hits": coverage.num_rev,
        };
      } else {
        return null;
      }
    });
  });
};

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
    if (!assembly || model != "hmm") {
      return null;
    }

    const models = getAssemblyModels(assembly.schema_name);

    return models.percentageIdModel.findAll({
      where: { "family_accession": id }
    }).then(function(conservations) {
      return conservations.map(function(cons) {
        const obj = mapFields(cons, {}, {
          "threshold": "threshold",
          "max_insert": "max_insert",
          "num_seqs": "num_seqs",
        });
        obj.graph = cons.graph_json.toString();

        return obj;
      });
    });
  });
};

