'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Alignment = require('../service/AlignmentService');

module.exports.readAlignment = function readAlignment (req, res, next) {
  var assembly = req.swagger.params['assembly'].value;
  var chrom = req.swagger.params['chrom'].value;
  var start = req.swagger.params['start'].value;
  var end = req.swagger.params['end'].value;
  var family = req.swagger.params['family'].value;
  Alignment.readAlignment(assembly,chrom,start,end,family)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
