'use strict';

const winston = require('winston');

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;

const escape = require("../utils/escape");


/**
 * Get generalized repeat classification heirarchy
 *
 * returns classesResponse
 **/
exports.readClassification = function(name) {
  let sql = "SELECT c.id AS id, c.parent_id AS parent_id, c.name AS name, tooltip, c.description AS description, hyperlink, repbase_equiv, wicker_equiv, curcio_derbyshire_equiv, piegu_equiv, lineage, type.name AS repeatmasker_type, subtype.name AS repeatmasker_subtype, (SELECT COUNT(*) FROM family WHERE classification_id = c.id) AS count FROM classification AS c LEFT JOIN repeatmasker_type AS type ON type.id = repeatmasker_type_id LEFT JOIN repeatmasker_subtype AS subtype ON subtype.id = repeatmasker_subtype_id";
  const replacements = {};

  if (name) {
    sql += " WHERE c.name LIKE :where_name ESCAPE '#'";
    replacements.where_name = "%" + escape.escape_sql_like(name, '#') + "%";
  }

  return conn.query(sql, { type: Sequelize.QueryTypes.SELECT, replacements }
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

    if (name) {
      // Name-based search: return as a flat array

      return Object.keys(objs).map(k => {
        delete objs[k].parent;
        return objs[k];
      });
    } else {
      // Full list: turn the dictionary into a tree object
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

      Object.keys(objs).forEach(function(id) {
        const obj = objs[id];
        if (obj.children) {
          obj.children.sort(function(a, b) {
            if (a.sort_order < b.sort_order) { return -1; }
            else if (a.sort_order > b.sort_order) { return 1; }
            else if (a.name < b.name) { return -1; }
            else if (a.name > b.name) { return 1; }
            else { return 0; }
          });
        }
      });

      if (roots.length != 1) {
        winston.warn("Expected a single root classification node");
      }

      const root_id = roots[0];
      winston.silly(`Using root node ${root_id}`);

      return objs[root_id];
    }
  });
};

