/**
 * The FamiliesController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/FamiliesService');
const logger = require('../logger');
const config = require('../config');
const { verifySolution } = require('altcha-lib');

const readDfamRelationships = async (request, response) => {
  try {
    const id = request.params.id;
    if ( config.REQUIRE_ALTCHA ) {
      const altcha_payload = request.body?.altcha_payload;

      if (!altcha_payload) {
        return response.status(400).json({
                message: 'Private endpoint (status: 1)',
        });
      }

      const verified = await verifySolution(String(altcha_payload), config.ALTCHA_HMAC_KEY)

      if (!verified) {
        return response.status(403).json({
               message: 'Private endpoint (status: 2)',
        });
      }
    }
    const result = await service.readDfamRelationships({ id });
    response.status(200).json(result);
  } catch (e) {
    response.status(e.code || 500);
    if (e.error instanceof Object) {
      response.json(e.error);
    } else {
      response.end(e.error || e.message);
    }

  }
  //await Controller.handleRequest(request, response, service.readDfamRelationships);
  //
//      let client_ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
//      const serviceResponse = await serviceOperation(this.collectRequestParams(request));
//      Controller.sendResponse(response, serviceResponse);
//      const time = new Date() - start;
//      let urls = request.url.split("?");
//      let endpoint = urls[0];
//      let params = "";
//      if (urls.length > 1) {
//      params = urls[1];
//      }
//      logger.verbose({"method": request.method, "endpoint": endpoint, "params": params, "code": response.statusCode, "res_time": time, "client_ip": client_ip });
//
};

const readFamilies = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilies);
};

const readFamilyById = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyById);
};

const readFamilyHmm = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyHmm);
};

const readFamilyRelationships = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyRelationships);
};

const readFamilySeed = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilySeed);
};

const readFamilySequence = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilySequence);
};

const readProteinAlignments = async (request, response) => {
  await Controller.handleRequest(request, response, service.readProteinAlignments);
};

const readSelfAlignments = async (request, response) => {
  await Controller.handleRequest(request, response, service.readSelfAlignments);
};

const readTandemRepeats = async (request, response) => {
  await Controller.handleRequest(request, response, service.readTandemRepeats);
};


module.exports = {
  readDfamRelationships,
  readFamilies,
  readFamilyById,
  readFamilyHmm,
  readFamilyRelationships,
  readFamilySeed,
  readFamilySequence,
  readProteinAlignments,
  readSelfAlignments,
  readTandemRepeats,
};
