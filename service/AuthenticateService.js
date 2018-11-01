'use strict';

const winston = require('winston');

const Sequelize = require('sequelize');
const auth = require('../auth');
const conn = require('../databases').users;
const userModel = require('../models/auth/user')(conn, Sequelize);

/**
 * Obtain API access token for previously registered user.
 *
 * email String User's email address as username
 * password String User's password for obtaining API access token
 * returns loginResponse
 **/
exports.authenticate = function(email,password) {
  return userModel.findOne({ where: { email } }).then(function(user) {
    if (user) {
      if (auth.validatePassword(password, user.salt, user.pw_hash)) {
        winston.info("Authentication success: ", { email });
        var token = auth.generateJwt(user.id, user.email, user.name);
        return { token };
      } else {
        winston.debug("Authentication failed (password): ", { email });
      }
    } else {
      winston.debug("Authentication failed (email): ", { email });
    }

    throw new Error("Invalid username or password.");
  });
};

