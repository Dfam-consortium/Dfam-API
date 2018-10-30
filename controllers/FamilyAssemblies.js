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
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyAssemblyKaryoImage = function readFamilyAssemblyKaryoImage (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  FamilyAssemblies.readFamilyAssemblyKaryoImage(id,assembly_id)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readFamilyAssemblyModelCoverage = function readFamilyAssemblyModelCoverage (req, res, next) {
  var id = req.swagger.params['id'].value;
  var assembly_id = req.swagger.params['assembly_id'].value;
  var model = req.swagger.params['model'].value;
  var threshold = req.swagger.params['threshold'].value;
  FamilyAssemblies.readFamilyAssemblyModelCoverage(id,assembly_id,model,threshold)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};
