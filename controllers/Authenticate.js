'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Authenticate = require('../service/AuthenticateService');

module.exports.authenticate = function authenticate (req, res, next) {
  var email = req.swagger.params['email'].value;
  var password = req.swagger.params['password'].value;
  Authenticate.authenticate(email,password)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
