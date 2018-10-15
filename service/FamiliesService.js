'use strict';

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const familyModel = require("../models/family.js")(conn, Sequelize);
const aliasModel = require("../models/family_database_alias.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const rmSubTypeModel = require("../models/repeatmasker_subtype.js")(conn, Sequelize);
const rmStageModel = require("../models/repeatmasker_stage.js")(conn, Sequelize);
const familyHasBufferStageModel = require("../models/family_has_buffer_stage.js")(conn, Sequelize);
const citationModel = require("../models/citation.js")(conn, Sequelize);
const dfamTaxdbModel = require("../models/dfam_taxdb.js")(conn, Sequelize);
const writer = require("../utils/writer.js");


familyModel.hasMany(aliasModel, { foreignKey: 'family_id', as: 'aliases' });
familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id', as: 'classification' });
familyModel.belongsToMany(rmStageModel, { as: 'search_stages', through: 'family_has_search_stage', foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(rmStageModel, { as: 'buffer_stages', through: familyHasBufferStageModel, foreignKey: 'family_id', otherKey: 'repeatmasker_stage_id' });
familyModel.belongsToMany(citationModel, { as: 'citations', through: 'family_has_citation', foreignKey: 'family_id', otherKey: 'citation_pmid' });
familyModel.belongsToMany(dfamTaxdbModel, { as: 'clades', through: 'family_clade', foreignKey: 'family_id', otherKey: 'dfam_taxdb_tax_id' });
classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id', as: 'rm_type' });
classificationModel.belongsTo(rmSubTypeModel, { foreignKey: 'repeatmasker_subtype_id', as: 'rm_subtype' });

function mapFields(source, mapping) {
  const obj = {};

  Object.keys(mapping).forEach(function(key) {
    const newKey = mapping[key];
    if (source[key]) {
      obj[newKey] = source[key];
    }
  });

  return obj;
}

/**
 * Returns a list of Dfam families optionally filtered and sorted.
 *
 * format String Desired output format (optional)
 * sort String A string containing the ordered sort columns (optional)
 * name String Search term for repeat identifier (optional)
 * name_prefix String Search term for repeat name prefix ( overriden by \"name\" search ) (optional)
 * clade String Search term for repeat clade (optional)
 * type String Search term for repeat type (optional)
 * subtype String Search term for repeat subtype (optional)
 * updated_after date Filter by \"updated on or after\" date (optional)
 * updated_before date Filter by \"updated on or before\" date (optional)
 * desc String Search term for repeat description (optional)
 * start Integer Start index ( for range queries ) (optional)
 * limit Integer Records to return ( for range queries ) (optional)
 * returns familiesResponse
 **/
exports.readFamilies = function(format,sort,name,name_prefix,clade,type,subtype,updated_after,updated_before,desc,start,limit) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "totalHits" : 0,
  "results" : [ {
    "aliases" : [ {
      "database" : "database",
      "alias" : "alias"
    }, {
      "database" : "database",
      "alias" : "alias"
    } ],
    "repeat_subtype_confidence" : "",
    "date_modified" : "date_modified",
    "source_species_name" : "source_species_name",
    "date_created" : "date_created",
    "name" : "name",
    "description" : "description",
    "repeat_type_confidence" : "",
    "repeat_disabled" : "repeat_disabled",
    "repeat_subtype_name" : "repeat_subtype_name",
    "clade_names" : "clade_names",
    "repeat_type_name" : "repeat_type_name"
  }, {
    "aliases" : [ {
      "database" : "database",
      "alias" : "alias"
    }, {
      "database" : "database",
      "alias" : "alias"
    } ],
    "repeat_subtype_confidence" : "",
    "date_modified" : "date_modified",
    "source_species_name" : "source_species_name",
    "date_created" : "date_created",
    "name" : "name",
    "description" : "description",
    "repeat_type_confidence" : "",
    "repeat_disabled" : "repeat_disabled",
    "repeat_subtype_name" : "repeat_subtype_name",
    "clade_names" : "clade_names",
    "repeat_type_name" : "repeat_type_name"
  } ]
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Retrieve an individual Dfam family.
 *
 * id String The Dfam family name
 * returns familyResponse
 **/
exports.readFamilyById = function(id) {
  return familyModel.findOne({
    where: { name: id },
    include: [
      'aliases',
      { model: classificationModel, as: 'classification', include: [ 'rm_type', 'rm_subtype' ] },
      { model: rmStageModel, as: 'search_stages' },
      { model: rmStageModel, as: 'buffer_stages', through: {
        attributes: [ 'start_pos', 'end_pos'],
      } },
      { model: citationModel, as: 'citations' },
      { model: dfamTaxdbModel, as: 'clades' },
    ]
  }).then(function(family) {
    if (!family) {
      return writer.respondWithCode(404, "");
    }

    const obj = mapFields(family, {
      "id": "id",
      "name": "name",
      "description": "description",
      "author": "author",
      "date_created": "date_created",
      "date_modified": "date_modified",
      "target_site_cons": "target_site_cons",
      "refineable": "refineable",
      "disabled": "disabled",
      "model_consensus": "consensus_sequence",
    });

    const aliases = obj["aliases"] = [];
    family.aliases.forEach(function(alias) {
      aliases.push(mapFields(alias, { "db_id": "database", "db_link": "alias" }));
    });

    // TODO: Recursive full classification name
    obj.classification = family.classification.name;
    obj.repeat_type_name = family.classification.rm_type.name;
    obj.repeat_subtype_name = family.classification.rm_subtype.name;

    // TODO: Can this be flattened into an Array<String>?
    const search_stages = obj["search_stages"] = [];
    family.search_stages.forEach(function(ss) {
      search_stages.push({ name: ss.name });
    });

    const buffer_stages = obj["buffer_stages"] = [];
    family.buffer_stages.forEach(function(bs) {
      buffer_stages.push({
        name: bs.name,
        start: bs.family_has_buffer_stage.start_pos,
        end: bs.family_has_buffer_stage.end_pos,
      });
    });

    const citations = obj["citations"] = [];
    family.citations.forEach(function(c) {
      citations.push(mapFields(c, {
        "pmid": "pmid",
        "title": "title",
        "authors": "authors",
        "journal": "journal",
        "pubdate": "pubdate",
      }));
    });

    // TODO: Can this be flattened into an Array<String>?
    const clades = obj["clades"] = [];
    family.clades.forEach(function(cl) {
      clades.push(mapFields(cl, { "scientific_name": "name" }));
    });

    // TODO: assembly_annots

    return obj;
  });
}

