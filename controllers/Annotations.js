'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Annotations = require('../service/AnnotationsService');

module.exports.readAnnotations = function readAnnotations (req, res, next) {
  var assembly = req.swagger.params['assembly'].value;
  var chrom = req.swagger.params['chrom'].value;
  var start = req.swagger.params['start'].value;
  var end = req.swagger.params['end'].value;
  var family = req.swagger.params['family'].value;
  var nrph = req.swagger.params['nrph'].value;
  Annotations.readAnnotations(assembly,chrom,start,end,family,nrph)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
