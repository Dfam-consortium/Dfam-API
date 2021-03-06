'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Search = require('../service/SearchesService');

module.exports.readSearchResults = function readSearchResults (req, res, next) {
  var id = req.swagger.params['id'].value;
  Search.readSearchResults(id)
    .then(function (response) {
      return new APIResponse(response, {
        headers: {
          "Expires": "0",
        }
      }).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.readSearchResultAlignment = function readSearchResultAlignment (req, res, next) {
  var id = req.swagger.params['id'].value;
  var sequence = req.swagger.params['sequence'].value;
  var start = req.swagger.params['start'].value;
  var end = req.swagger.params['end'].value;
  var family = req.swagger.params['family'].value;
  Search.readSearchResultAlignment(id,sequence,start,end,family)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.submitSearch = function submitSearch (req, res, next) {
  var sequence = req.swagger.params['sequence'].value;
  var organism = req.swagger.params['organism'].value;
  var cutoff = req.swagger.params['cutoff'].value;
  var evalue = req.swagger.params['evalue'].value;
  Search.submitSearch(sequence,organism,cutoff,evalue)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
