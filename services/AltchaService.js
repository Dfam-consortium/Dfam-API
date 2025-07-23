const Service = require('./Service');
const { createChallenge } = require('altcha-lib');
const crypto = require('node:crypto');
const logger = require('../logger');

// Use environment variable or default random key (not persistent)
const ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || crypto.randomBytes(16).toString('hex');

const getChallenge = () => new Promise(
  async (resolve, reject) => {
      try {
        // Generate a new random challenge with a specified complexity
        const challenge = await createChallenge({
          hmacKey: ALTCHA_HMAC_KEY,
          maxNumber: 50_000
        })

        resolve(Service.successResponse(challenge));

    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  getChallenge,
};

