'use strict';

var utils = require('../utils/writer.js');
var Classification = require('../service/ClassificationService');

module.exports.readClassification = function readClassification (req, res, next) {
  var name = req.swagger.params['name'].value;
  Classification.readClassification(name)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};
