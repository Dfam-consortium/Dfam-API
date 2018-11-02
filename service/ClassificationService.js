'use strict';

const winston = require('winston');

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;


/**
 * Get generalized repeat classification heirarchy
 *
 * returns classesResponse
 **/
exports.readClassification = function() {
  return conn.query(
    "SELECT c.id AS id, c.parent_id AS parent_id, c.name AS name, tooltip, c.description AS description, hyperlink, repbase_equiv, wicker_equiv, curcio_derbyshire_equiv, piegu_equiv, lineage, type.name AS repeatmasker_type, subtype.name AS repeatmasker_subtype, (SELECT COUNT(*) FROM family WHERE classification_id = c.id) AS count FROM classification AS c LEFT JOIN repeatmasker_type AS type ON type.id = repeatmasker_type_id LEFT JOIN repeatmasker_subtype AS subtype ON subtype.id = repeatmasker_subtype_id", { type: Sequelize.QueryTypes.SELECT }
  ).then(function(classifications) {
    const objs = {};

    // Pull out main classification data
    classifications.forEach(function(cls) {
      const obj = objs[cls.id] = {};

      [
        "name", "tooltip", "description", "hyperlink", "repbase_equiv",
        "wicker_equiv", "curcio_derbyshire_equiv", "piegu_equiv",
        "repeatmasker_type", "repeatmasker_subtype", "count"
      ].forEach(function(attr) {
        if (cls[attr]) {
          obj[attr] = cls[attr];
        }
      });

      obj.full_name = cls.lineage;
      obj.parent = cls.parent_id;
    });

    // Turn the dictionary into a tree object
    var roots = [];
    Object.keys(objs).forEach(function(id) {
      const obj = objs[id];
      const parent_id = obj.parent;
      if (parent_id) {
        const parent = objs[parent_id];
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(obj);
      } else {
        roots.push(id);
      }

      delete obj.parent;
    });

    if (roots.length != 1) {
      winston.warn("Expected a single root classification node");
    }

    const root_id = roots[0];
    winston.silly(`Using root node ${root_id}`);

    return objs[root_id];
  });
};

