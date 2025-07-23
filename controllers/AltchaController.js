/*
 * Provide a controller for Altcha PoW challenge requests
 */
const Controller = require('./Controller');
const service = require('../services/AltchaService');

const getAltchaChallenge = async(request, response) => {
  await Controller.handleRequest(request, response, service.getChallenge);
  };

module.exports = {
  getAltchaChallenge,
  };
