'use strict';

var utils = require('../utils/writer.js');
var Assemblies = require('../service/AssembliesService');

module.exports.readAssemblies = function readAssemblies (req, res, next) {
  Assemblies.readAssemblies()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      next(err);
    });
};
