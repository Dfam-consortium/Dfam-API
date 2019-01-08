'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Register = require('../service/RegisterService');

module.exports.register = function register (req, res, next) {
  var email = req.swagger.params['email'].value;
  var name = req.swagger.params['name'].value;
  var password = req.swagger.params['password'].value;
  Register.register(email,name,password)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.verifyEmail = function verifyEmail (req, res, next) {
  var token = req.swagger.params['token'].value;
  Register.verifyEmail(token)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
