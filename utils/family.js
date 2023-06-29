const Sequelize = require("sequelize");
//const conn = require("../databases.js").dfam;
const conn = require("../databases.js").getConn_Dfam();

const familyModel = require("../models/family.js")(conn, Sequelize);
const aliasModel = require("../models/family_database_alias.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const rmSubTypeModel = require("../models/repeatmasker_subtype.js")(conn, Sequelize);
const rmStageModel = require("../models/repeatmasker_stage.js")(conn, Sequelize);
const familyHasBufferStageModel = require("../models/family_has_buffer_stage.js")(conn, Sequelize);
const familyHasCitationModel = require("../models/family_has_citation.js")(conn, Sequelize);
const citationModel = require("../models/citation.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const curationStateModel = require("../models/curation_state.js")(conn, Sequelize);
const familyAssemblyDataModel = require("../models/family_assembly_data.js")(conn, Sequelize);
const assemblyModel = require("../models/assembly.js")(conn, Sequelize);
const codingSequenceModel = require("../models/coding_sequence.js")(conn, Sequelize);

familyModel.hasMany(aliasModel, { foreignKey: 'family_id', as: 'aliases' });
familyModel.belongsTo(curationStateModel, { foreignKey: 'curation_state_id', as: 'curation_state' });
familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id', as: 'classification' });
familyModel.belongsToMany(rmStageModel, { as: 'search_stages', through: 'family_has_search_stage', foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(rmStageModel, { as: 'buffer_stages', through: familyHasBufferStageModel, foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(citationModel, { as: 'citations', through: familyHasCitationModel, foreignKey: 'family_id', otherKey: 'citation_pmid' });
familyModel.belongsToMany(dfamTaxdbModel, { as: 'clades', through: 'family_clade', foreignKey: 'family_id', otherKey: 'dfam_taxdb_tax_id' });
familyModel.hasMany(familyAssemblyDataModel, { as: 'family_assembly_data', foreignKey: 'family_id' });
familyModel.hasMany(codingSequenceModel, { foreignKey: 'family_id', as: 'coding_sequences' });

familyAssemblyDataModel.belongsTo(assemblyModel, { foreignKey: 'assembly_id' });

assemblyModel.belongsTo(dfamTaxdbModel, { foreignKey: 'dfam_taxdb_tax_id' });

classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id', as: 'rm_type' });
classificationModel.belongsTo(rmSubTypeModel, { foreignKey: 'repeatmasker_subtype_id', as: 'rm_subtype' });

function getFamilyForAnnotation(accession) {
  return familyModel.findOne({
    attributes: [ "id", "name", "accession", "version", "length", "title", "description", "author", "refineable", "consensus", "hmm_general_threshold" ],
    where: { accession },
    include: [
      'aliases',
      { model: classificationModel, as: 'classification', include: [ 'rm_type', 'rm_subtype' ] },
      'curation_state',
      { model: rmStageModel, as: 'search_stages' },
      { model: rmStageModel, as: 'buffer_stages', through: {
        attributes: [ 'start_pos', 'end_pos'],
      } },
      { model: citationModel, as: 'citations', through: { attributes: [ 'order_added', 'comment' ] } },
      'clades',
      { model: familyAssemblyDataModel, as: 'family_assembly_data',
        attributes: ['hmm_hit_GA', 'hmm_hit_TC', 'hmm_hit_NC', 'hmm_fdr'],
        include: [
          { model: assemblyModel, include: [
            { model: dfamTaxdbModel, attributes: ['tax_id', 'sanitized_name', 'scientific_name'] }
          ] },
        ],
      },
      'coding_sequences',
    ],
  }).then(function(family) {
    if (family) {
      if (family.classification.rm_type) {
        family.rmTypeName = family.classification.rm_type.name;
      } else {
        family.rmTypeName = "";
      }
      if (family.classification.rm_subtype) {
        family.rmSubTypeName = family.classification.rm_subtype.name;
      } else {
        family.rmSubTypeName = "";
      }

      family.accessionAndVersion = family.accession + "." + (family.version || 0);
    }

    return family;
  });
};

function getFamilyWithConsensus(accession) {
  return familyModel.findOne({
    attributes: [ "id", "name", "accession", "version", "consensus" ],
    where: { accession },
  }).then(function(family) {
    if (family) {
      family.accessionAndVersion = family.accession + "." + (family.version || 0);
    }

    return family;
  });
};


module.exports = {
  getFamilyForAnnotation,
  getFamilyWithConsensus
};
