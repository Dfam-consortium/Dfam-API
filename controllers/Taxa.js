'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Taxa = require('../service/TaxaService');

module.exports.readTaxa = function readTaxa (req, res, next) {
  var name = req.swagger.params['name'].value;
  var limit = req.swagger.params['limit'].value;
  var annotated = req.swagger.params['annotated'].value;
  Taxa.readTaxa(name,limit,annotated)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readTaxaById = function readTaxaById (req, res, next) {
  var id = req.swagger.params['id'].value;
  Taxa.readTaxaById(id)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
}
