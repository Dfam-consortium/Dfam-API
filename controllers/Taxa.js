'use strict';

var utils = require('../utils/writer.js');
var Taxa = require('../service/TaxaService');

module.exports.readTaxa = function readTaxa (req, res, next) {
  var name = req.swagger.params['name'].value;
  var limit = req.swagger.params['limit'].value;
  Taxa.readTaxa(name,limit)
    .then(function (response) {
      utils.writeJson(res, response);
    })
//    .catch(function (response) {
//      utils.writeJson(res, response);
//    });
};
