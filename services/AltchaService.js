const Service = require('./Service');
const { createChallenge } = require('altcha-lib');
const logger = require('../logger');
const config = require('../config');

const getChallenge = () => new Promise(
  async (resolve, reject) => {
      try {
        // Generate a new random challenge with a specified complexity
        const challenge = await createChallenge({
          hmacKey: config.ALTCHA_HMAC_KEY,
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

