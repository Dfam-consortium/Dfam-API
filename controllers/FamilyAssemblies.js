'use strict';

var utils = require('../utils/writer.js');
var FamilyAssemblies = require('../service/FamilyAssembliesService');

module.exports.readFamilyAssemblies = function readFamilyAssemblies (req, res, next) {
  var id = req.swagger.params['id'].value;
  FamilyAssemblies.readFamilyAssemblies(id)
    .then(function (response) {
      utils.writeJson(res, response);
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
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyAssemblyAnnotations = function readFamilyAssemblyAnnotations (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  var nrph = req.swagger.params['nrph'].value;
  FamilyAssemblies.readFamilyAssemblyAnnotations(id,assembly_id,nrph)
    .then(function (response) {
      if (response) {
        res.writeHead(200, { 'Content-Type': response.content_type });
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

module.exports.readFamilyAssemblyKaryoImage = function readFamilyAssemblyKaryoImage (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  var nrph = req.swagger.params['nrph'].value;
  var part = req.swagger.params['part'].value;
  FamilyAssemblies.readFamilyAssemblyKaryoImage(id,assembly_id,nrph,part)
    .then(function (response) {
      if (response) {
        res.writeHead(200, { 'Content-Type': response.content_type });
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

module.exports.readFamilyAssemblyModelCoverage = function readFamilyAssemblyModelCoverage (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  var model = req.swagger.params['model'].value;
  FamilyAssemblies.readFamilyAssemblyModelCoverage(id,assembly_id,model)
    .then(function (response) {
      utils.writeJson(res, response);
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
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};
