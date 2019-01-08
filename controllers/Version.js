'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Version = require('../service/VersionService');

module.exports.getVersion = function getVersion (req, res, next) {
  Version.getVersion()
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
