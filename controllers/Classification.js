'use strict';

var utils = require('../utils/writer.js');
var Classification = require('../service/ClassificationService');

module.exports.readClassification = function readClassification (req, res, next) {
  Classification.readClassification()
    .then(function (response) {
      utils.writeJson(res, response);
    })
//    .catch(function (response) {
//      utils.writeJson(res, response);
//    });
};
