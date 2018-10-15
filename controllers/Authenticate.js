'use strict';

var utils = require('../utils/writer.js');
var Authenticate = require('../service/AuthenticateService');

module.exports.authenticate = function authenticate (req, res, next) {
  var email = req.swagger.params['email'].value;
  var password = req.swagger.params['password'].value;
  Authenticate.authenticate(email,password)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
