'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Classification = require('../service/ClassificationService');

module.exports.readClassification = function readClassification (req, res, next) {
  var name = req.swagger.params['name'].value;
  Classification.readClassification(name)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
