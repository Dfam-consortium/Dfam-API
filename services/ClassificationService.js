/* eslint-disable no-unused-vars */
const Service = require('./Service');
const escape = require("../utils/escape");
const { Sequelize } = require('sequelize');
const conn = require("../databases.js").getConn_Dfam();
const winston = require('winston');

/**
* Retrieve the entire TE classification hierarchy used by Dfam.
*
* name String Classification name to search for. If given, the results will be returned as an array instead of the default hierarchical format. (optional)
* returns classesResponse
* */
const readClassification = ({ name }) => new Promise(
  async (resolve, reject) => {
    try {
      let sql = "SELECT c.id AS id, c.parent_id AS parent_id, c.name AS name, tooltip, c.description AS description, hyperlink, repbase_equiv, wicker_equiv, curcio_derbyshire_equiv, piegu_equiv, aliases, lineage, type.name AS repeatmasker_type, subtype.name AS repeatmasker_subtype, (SELECT COUNT(*) FROM family WHERE classification_id = c.id) AS count FROM classification AS c LEFT JOIN repeatmasker_type AS type ON type.id = repeatmasker_type_id LEFT JOIN repeatmasker_subtype AS subtype ON subtype.id = repeatmasker_subtype_id";
      const replacements = {};

      if (name) {
        sql += " WHERE (c.name LIKE :where_name ESCAPE '#' OR c.aliases LIKE :where_name ESCAPE '#')";
        replacements.where_name = "%" + escape.escape_sql_like(name, '#') + "%";
      }

      let classifications = await conn.query(sql, {type: Sequelize.QueryTypes.SELECT, replacements});

      if (classifications.length < 1) {
        // return 404 if empty query response
        resolve(Service.successResponse({ payload: {} }, 404));
      }

      let objs = {};
      classifications.forEach((cls) => {
        const obj = objs[cls.id] = {};
        [
          'name', 'tooltip', 'description', 'hyperlink', 'repbase_equiv', 'wicker_equiv', 
          'curcio_derbyshire_equiv', 'piegu_equiv', 'aliases', 'repeatmasker_type',
          'repeatmasker_subtype', 'count'
        ].forEach( (attr)=> {
          if (cls[attr]) {
            obj[attr] = cls[attr];
          }
        });
        obj.full_name = cls.lineage;
        obj.parent = cls.parent_id;
      });

      if (name && classifications) {
        // Name-based search: return as a flat array
        resolve(Service.successResponse(
          Object.keys(objs).map(
            (k)=>{
              delete objs[k].parent;
              return objs[k];
            }
          ), 200
        ));
      } else if (!name && classifications) {
        // Full list: turn the dictionary into a tree object
        let roots = [];
        Object.keys(objs).forEach( (id)=> {
          const obj = objs[id];
          const parent_id = obj.parent;
          if (parent_id){
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
        
        Object.keys(objs).forEach((id)=>{
          const obj = objs[id];
          if (obj.children){
            obj.children.sort( (a,b)=> {
              if (a.sort_order < b.sort_order) {return -1;}
              else if (a.sort_order > b.sort_order) {return 1;}
              else if (a.name < b.name) {return -1;}
              else if (a.name > b.name) {return 1;}
              else {return 0;}
            });
          }
        });

        if (roots.length != 1){
          winston.warn("Expected a single root classification node");
        }

        const root_id = roots[0];
        winston.silly(`Using root node ${root_id}`);

        resolve(Service.successResponse(objs[root_id], 200));

      } 
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  readClassification,
};
