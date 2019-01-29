'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Assemblies = require('../service/AssembliesService');

module.exports.readAssemblies = function readAssemblies (req, res, next) {
  Assemblies.readAssemblies()
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
