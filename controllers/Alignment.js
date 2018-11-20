'use strict';

var utils = require('../utils/writer.js');
var Alignment = require('../service/AlignmentService');

module.exports.readAlignment = function readAlignment (req, res, next) {
  var assembly = req.swagger.params['assembly'].value;
  var chrom = req.swagger.params['chrom'].value;
  var start = req.swagger.params['start'].value;
  var end = req.swagger.params['end'].value;
  var family = req.swagger.params['family'].value;
  Alignment.readAlignment(assembly,chrom,start,end,family)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};
