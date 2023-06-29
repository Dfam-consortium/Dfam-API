/**
 * The FamiliesController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/FamiliesService');


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


module.exports = {
  readFamilies,
  readFamilyById,
  readFamilyHmm,
  readFamilyRelationships,
  readFamilySeed,
  readFamilySequence,
};
