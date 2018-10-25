'use strict';

var utils = require('../utils/writer.js');
var Version = require('../service/VersionService');

module.exports.getVersion = function getVersion (req, res, next) {
  Version.getVersion()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (err) {
      next(err);
    });
};
