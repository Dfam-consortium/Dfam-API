'use strict';

var utils = require('../utils/writer.js');
var Families = require('../service/FamiliesService');

module.exports.readFamilies = function readFamilies (req, res, next) {
  var format = req.swagger.params['format'].value;
  var sort = req.swagger.params['sort'].value;
  var name = req.swagger.params['name'].value;
  var name_prefix = req.swagger.params['name_prefix'].value;
  var name_accession = req.swagger.params['name_accession'].value;
  var classification = req.swagger.params['classification'].value;
  var clade = req.swagger.params['clade'].value;
  var clade_relatives = req.swagger.params['clade_relatives'].value;
  var type = req.swagger.params['type'].value;
  var subtype = req.swagger.params['subtype'].value;
  var updated_after = req.swagger.params['updated_after'].value;
  var updated_before = req.swagger.params['updated_before'].value;
  var desc = req.swagger.params['desc'].value;
  var keywords = req.swagger.params['keywords'].value;
  var start = req.swagger.params['start'].value;
  var limit = req.swagger.params['limit'].value;
  Families.readFamilies(format,sort,name,name_prefix,name_accession,classification,clade,clade_relatives,type,subtype,updated_after,updated_before,desc,keywords,start,limit)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyById = function readFamilyById (req, res, next) {
  var id = req.swagger.params['id'].value;
  Families.readFamilyById(id)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyHmm = function readFamilyHmm (req, res, next) {
  var id = req.swagger.params['id'].value;
  var format = req.swagger.params['format'].value;
  var download = req.swagger.params['download'].value;
  Families.readFamilyHmm(id,format)
    .then(function (response) {
      if (response) {
        if (download) {
          const extensions = { 'hmm': '.hmm', 'logo': '.json', 'image': '.png' };
          const filename = id + extensions[format];
          res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
        }
        res.writeHead(200, {
          'Content-Type': response.content_type,
          'Content-Length': Buffer.byteLength(response.data),
        });
        res.end(response.data);
      } else {
        res.statusCode = 404;
        res.end();
      }
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyRelationships = function readFamilyRelationships (req, res, next) {
  var id = req.swagger.params['id'].value;
  Families.readFamilyRelationships(id)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilySeed = function readFamilySeed (req, res, next) {
  var id = req.swagger.params['id'].value;
  var format = req.swagger.params['format'].value;
  var download = req.swagger.params['download'].value;
  Families.readFamilySeed(id,format)
    .then(function (response) {
      if (response) {
        if (download) {
          const extensions = { 'stockholm': '.stk', 'alignment_summary': '.json' };
          const filename = id + extensions[format];
          res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
        }
        res.writeHead(200, {
          'Content-Type': response.content_type,
          'Content-Length': Buffer.byteLength(response.data),
        });
        res.end(response.data);
      } else {
        res.statusCode = 404;
        res.end();
      }
    })
    .catch(function (err) {
      next(err);
    });
};
