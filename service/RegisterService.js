'use strict';

const crypto = require('crypto');

const Sequelize = require('sequelize');
const auth = require('../auth');
const conn = require('../databases').users;
const userModel = require('../models/auth/user')(conn, Sequelize);
const APIResponse = require('../utils/response.js').APIResponse;

const transporter = require('nodemailer').createTransport({
  sendmail: true,
});

/**
 * Register a new account with the API.
 *
 * email String User's email address
 * name String User's full name
 * password String User's password for obtaining API access token
 * no response value expected for this operation
 **/
exports.register = function(email,name,password) {
  if (email.indexOf("@") == -1) {
    return Promise.resolve(new APIResponse({ message: "Email must contain an @ sign." }, 400));
  }

  const { salt, hash } = auth.hashPassword(password);
  const emailToken = crypto.randomBytes(16).toString('hex');

  return userModel.count({ where: { email } }).then(function(count) {
    if (count) {
      return new APIResponse({ message: "Email is already registered." }, 400);
    }

    return userModel.create({
      full_name: name,
      email,
      email_verify_token: emailToken,
      pw_hash: hash,
      salt,
      api_role: "reader",
      registration_date: new Date(),
    }).then(function(user) {
      return new Promise(function(resolve, reject) {
        transporter.sendMail({
          from: "dfam@repeatmasker.org",
          to: email,
          subject: "Dfam API registration",
          // TODO: Build hyperlink properly
          // TODO: Prettier (HTML) email
          text: "To verify your email address, please visit: http://localhost:9925/verify?token=" + emailToken,
        }, function(err, info) {
          if (err) {
            reject(err);
          } else {
            resolve({ message: "Verification email sent." });
          }
        });
      });
    });
  });
};


/**
 * Verify a user's email address.
 *
 * token String User's email verification token
 * no response value expected for this operation
 **/
exports.verifyEmail = function(token) {
  // TODO: Should respond with text or HTML, not JSON (also fix in swagger.yaml)

  return userModel.findOne({
    where: { email_verify_token: token }
  }).then(function(user) {
    if(user) {
      return user.update({
        email_verify_token: null,
        email_verified_date: new Date(),
      }).then(function() {
        return { message: "Verification succeeded." };
      });
    } else {
      return new APIResponse({ message: "Invalid verification token." }, 400);
    }
  });
};

