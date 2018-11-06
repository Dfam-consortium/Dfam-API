'use strict';

const winston = require('winston');

const Sequelize = require('sequelize');
const auth = require('../auth');
const conn = require('../databases').users;
const userModel = require('../models/auth/user')(conn, Sequelize);
const writer = require('../utils/writer');

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
        if (!user.email_verified_date) {
          winston.debug("Authentication failed (unverified): ", { email });
          return writer.respondWithCode(400, { message: "Please verify your email address." });
        }

        winston.debug("Authentication success: ", { email });
        var token = auth.generateJwt(user.id, user.email, user.name);
        return { token };
      } else {
        winston.debug("Authentication failed (password): ", { email });
      }
    } else {
      winston.debug("Authentication failed (email): ", { email });
    }

    return writer.respondWithCode(400, { message: "Invalid username or password." });
  });
};

