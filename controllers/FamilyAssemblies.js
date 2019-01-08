'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var FamilyAssemblies = require('../service/FamilyAssembliesService');

module.exports.readFamilyAssemblies = function readFamilyAssemblies (req, res, next) {
  var id = req.swagger.params['id'].value;
  FamilyAssemblies.readFamilyAssemblies(id)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyAssemblyAnnotationStats = function readFamilyAssemblyAnnotationStats (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  FamilyAssemblies.readFamilyAssemblyAnnotationStats(id,assembly_id)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyAssemblyAnnotations = function readFamilyAssemblyAnnotations (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  var nrph = req.swagger.params['nrph'].value;
  var download = req.swagger.params['download'].value;
  FamilyAssemblies.readFamilyAssemblyAnnotations(id,assembly_id,nrph)
    .then(function (response) {
      if (response) {
        const headers = {};
        if (download) {
          const filename = id + '.' + assembly_id + (nrph ? '.nr-hits' : '.hits') + '.tsv';
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

module.exports.readFamilyAssemblyKaryotype = function readFamilyAssemblyKaryotype (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  FamilyAssemblies.readFamilyAssemblyKaryotype(id,assembly_id)
    .then(function (response) {
      return new APIResponse(response, { contentType: "application/json" }).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyAssemblyModelCoverage = function readFamilyAssemblyModelCoverage (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  var model = req.swagger.params['model'].value;
  FamilyAssemblies.readFamilyAssemblyModelCoverage(id,assembly_id,model)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyAssemblyModelConservation = function readFamilyAssemblyModelConservation (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  var model = req.swagger.params['model'].value;
  FamilyAssemblies.readFamilyAssemblyModelConservation(id,assembly_id,model)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
