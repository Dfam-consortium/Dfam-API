'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
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
  var include_raw = req.swagger.params['include_raw'].value;
  var start = req.swagger.params['start'].value;
  var limit = req.swagger.params['limit'].value;
  var download = req.swagger.params['download'].value;
  Families.readFamilies(format,sort,name,name_prefix,name_accession,classification,clade,clade_relatives,type,subtype,updated_after,updated_before,desc,keywords,include_raw,start,limit)
    .then(function (response) {
      if (response instanceof APIResponse) {
        return response.respond(req, res);
      } else if (response) {
        const headers = {};
        if (download) {
          const extensions = { 'hmm': '.hmm', 'embl': '.embl', 'fasta': '.fa', 'summary': '.json', 'full': '.json' };
          const filename = "families" + extensions[format];
          headers["Content-Disposition"] = 'attachment; filename="' + filename + '"';
        }

        return new APIResponse(response.data, {
          headers,
          contentType: response.content_type,
          encoding: response.encoding,
        }).respond(req, res);
      } else {
        return new APIResponse().respond(req, res);
      }
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyById = function readFamilyById (req, res, next) {
  var id = req.swagger.params['id'].value;
  Families.readFamilyById(id)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
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
      if (response instanceof APIResponse) {
        return response.respond(req, res);
      } else if (response) {
        const headers = {};
        if (download) {
          const extensions = { 'hmm': '.hmm', 'logo': '.json', 'image': '.png' };
          const filename = id + extensions[format];
          headers["Content-Disposition"] = 'attachment; filename="' + filename + '"';
        }

        return new APIResponse(response.data, {
          headers,
          contentType: response.content_type,
          encoding: response.encoding,
        }).respond(req, res);
      } else {
        return new APIResponse().respond(req, res);
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
      return new APIResponse(response).respond(req, res);
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
      if (response instanceof APIResponse) {
        return response.respond(req, res);
      } else if (response) {
        const headers = {};
        if (download) {
          const extensions = { 'stockholm': '.stk', 'alignment_summary': '.json' };
          const filename = id + extensions[format];
          res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
        }

        return new APIResponse(response.data, {
          headers,
          contentType: response.content_type,
          encoding: response.encoding,
        }).respond(req, res);
      } else {
        return new APIResponse().respond(req, res);
      }
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilySequence = function readFamilySequence (req, res, next) {
  var id = req.swagger.params['id'].value;
  var format = req.swagger.params['format'].value;
  var download = req.swagger.params['download'].value;
  Families.readFamilySequence(id,format)
    .then(function (response) {
      if (response instanceof APIResponse) {
        return response.respond(req, res);
      } else if (response) {
        const headers = {};
        if (download) {
          const extensions = { 'embl': '.embl', 'fasta': '.fa', };
          const filename = id + extensions[format];
          headers["Content-Disposition"] = 'attachment; filename="' + filename + '"';
        }

        return new APIResponse(response.data, {
          headers,
          contentType: response.content_type,
          encoding: response.encoding,
        }).respond(req, res);
      } else {
        return new APIResponse().respond(req, res);
      }
    })
    .catch(function (err) {
      next(err);
    });
};
