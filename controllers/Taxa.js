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
