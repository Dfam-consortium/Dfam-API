const Sequelize = require("sequelize");

exports.getDfamModels = function(conn) {
  const models = {};

  models.familyModel = require("./models/family.js")(conn, Sequelize);
  models.aliasModel = require("./models/family_database_alias.js")(conn, Sequelize);
  models.classificationModel = require("./models/classification.js")(conn, Sequelize);
  models.rmTypeModel = require("./models/repeatmasker_type.js")(conn, Sequelize);
  models.rmSubTypeModel = require("./models/repeatmasker_subtype.js")(conn, Sequelize);
  models.rmStageModel = require("./models/repeatmasker_stage.js")(conn, Sequelize);
  models.familyHasCitationModel = require("./models/family_has_citation.js")(conn, Sequelize);
  models.familyHasSearchStageModel = require("./models/family_has_search_stage.js")(conn, Sequelize);
  models.familyHasBufferStageModel = require("./models/family_has_buffer_stage.js")(conn, Sequelize);
  models.citationModel = require("./models/citation.js")(conn, Sequelize);
  models.dfamTaxdbModel = require("./models/dfam_taxdb.js")(conn, Sequelize);
  models.ncbiTaxdbNamesModel = require("./models/ncbi_taxdb_names.js")(conn, Sequelize);
  models.ncbiTaxdbNodesModel = require("./models/ncbi_taxdb_nodes.js")(conn, Sequelize);
  models.hmmModelDataModel = require("./models/hmm_model_data.js")(conn, Sequelize);
  models.seedAlignDataModel = require("./models/seed_align_data.js")(conn, Sequelize);
  models.overlapSegmentModel = require("./models/overlap_segment.js")(conn, Sequelize);
  models.curationStateModel = require("./models/curation_state.js")(conn, Sequelize);
  models.familyFeatureModel = require("./models/family_feature.js")(conn, Sequelize);
  models.featureAttributeModel = require("./models/feature_attribute.js")(conn, Sequelize);
  models.codingSequenceModel = require("./models/coding_sequence.js")(conn, Sequelize);
  models.familyCladeModel = require("./models/family_clade.js")(conn, Sequelize);
  models.familyDatabaseAliasModel = require("./models/family_database_alias.js")(conn, Sequelize);
  models.familyAssemblyDataModel = require("./models/family_assembly_data.js")(conn, Sequelize);
  models.assemblyModel = require("./models/assembly.js")(conn, Sequelize);
  models.percentageIDModel = require("./models/percentage_id.js")(conn, Sequelize);
  models.sourceMethodModel = require("./models/source_method.js")(conn, Sequelize);

  models.familyModel.hasMany(models.aliasModel, { foreignKey: 'family_id', as: 'aliases' });
  models.familyModel.belongsTo(models.curationStateModel, { foreignKey: 'curation_state_id', as: 'curation_state' });
  models.familyModel.belongsTo(models.classificationModel, { foreignKey: 'classification_id', as: 'classification' });
  models.familyModel.belongsToMany(models.rmStageModel, { as: 'search_stages', through: 'family_has_search_stage', foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
  models.familyModel.belongsToMany(models.rmStageModel, { as: 'buffer_stages', through: models.familyHasBufferStageModel, foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
  models.familyModel.belongsToMany(models.citationModel, { as: 'citations', through: 'family_has_citation', foreignKey: 'family_id', otherKey: 'citation_pmid' });
  models.familyModel.belongsToMany(models.dfamTaxdbModel, { as: 'clades', through: 'family_clade', foreignKey: 'family_id', otherKey: 'dfam_taxdb_tax_id' });
  models.familyModel.hasMany(models.familyFeatureModel, { foreignKey: 'family_id', as: 'features' });
  models.familyFeatureModel.hasMany(models.featureAttributeModel, { foreignKey: 'family_feature_id', as: 'feature_attributes' });
  models.familyModel.hasMany(models.familyAssemblyDataModel, { foreignKey: 'family_id', as: 'family_assembly_data' });
  models.familyModel.hasMany(models.codingSequenceModel, { foreignKey: 'family_id', as: 'coding_sequences' });
  models.familyModel.belongsTo(models.sourceMethodModel, { foreignKey: 'source_method_id', as: 'source_method' });
  models.familyModel.belongsTo(models.assemblyModel, { foreignKey: 'source_assembly_id', as: 'source_assembly' });
  models.familyModel.belongsToMany(models.percentageIDModel, { foreignKey: 'family_id' });

  models.familyHasCitationModel.belongsTo(models.citationModel, { as: 'citation', foreignKey: 'citation_pmid' });

  models.familyHasSearchStageModel.belongsTo(models.rmStageModel, { as: 'repeatmasker_stage', foreignKey: 'repeatmasker_stage_id' });
  models.familyHasBufferStageModel.belongsTo(models.rmStageModel, { as: 'repeatmasker_stage', foreignKey: 'repeatmasker_stage_id' });
  models.familyCladeModel.belongsTo(models.dfamTaxdbModel, { foreignKey: 'dfam_taxdb_tax_id', as: 'dfam_taxdb' });

  models.ncbiTaxdbNamesModel.belongsTo(models.ncbiTaxdbNodesModel, { foreignKey: 'tax_id' });
  models.ncbiTaxdbNamesModel.belongsTo(models.dfamTaxdbModel, { foreignKey: 'tax_id' });
  models.ncbiTaxdbNamesModel.belongsTo(models.assemblyModel, { foreignKey: 'tax_id', targetKey: 'dfam_taxdb_tax_id' });

  models.ncbiTaxdbNodesModel.hasMany(models.ncbiTaxdbNamesModel, { foreignKey: 'tax_id' });

  models.classificationModel.belongsTo(models.rmTypeModel, { foreignKey: 'repeatmasker_type_id', as: 'rm_type' });
  models.classificationModel.belongsTo(models.rmSubTypeModel, { foreignKey: 'repeatmasker_subtype_id', as: 'rm_subtype' });

  models.hmmModelDataModel.belongsTo(models.familyModel, { foreignKey: 'family_id' });

  models.overlapSegmentModel.belongsTo(models.familyModel, { foreignKey: 'family1_id', as: 'family1' });
  models.overlapSegmentModel.belongsTo(models.familyModel, { foreignKey: 'family2_id', as: 'family2' });

  models.familyAssemblyDataModel.belongsTo(models.familyModel, { foreignKey: 'family_id' });
  models.familyAssemblyDataModel.belongsTo(models.assemblyModel, { foreignKey: 'assembly_id' });
  models.assemblyModel.belongsTo(models.dfamTaxdbModel, { foreignKey: 'dfam_taxdb_tax_id' });
  models.assemblyModel.belongsToMany(models.percentageIDModel, { foreignKey: 'assembly_id' });

  return models;
};

exports.getDfamUserModels = function(conn) {
  const models = {};

  models.userModel = require('./models/auth/user')(conn, Sequelize);
  models.streamModel = require('./models/auth/stream.js')(conn, Sequelize);
  models.jobModel = require('./models/auth/job.js')(conn, Sequelize);
  models.searchModel = require('./models/auth/search.js')(conn, Sequelize);

  models.searchModel.belongsTo(models.jobModel, { as: 'job', foreignKey: 'job_id' });

  return models;
};
