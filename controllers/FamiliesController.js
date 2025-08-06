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


/**
 * /families/{id}/dfam_relationships
 * Retrieve related Dfam families based on sequence similarity.
 *
 * This endpoint uses a custom handler which may (optional) verify
 * an Altcha PoW payload before running the service.
 *       
 * @param {Object} request - The input parameters.
 * @param {string} response - The Dfam family accession.
 * @returns {Promise<ServiceResponse>} - A service response with related families.
 */
const readDfamRelationships = async (request, response) => {
  await Controller.handleAltchaRequest(request, response, service.readDfamRelationships);
};

/**
 * /families/{id}/protein_alignments
 * Retrieve protein alignments to the family consensus.
 *
 * This endpoint uses a custom handler which may (optional) verify
 * an Altcha PoW payload before running the service.
 *       
 * @param {Object} request - The input parameters.
 * @param {string} response - The Dfam family accession.
 * @returns {Promise<ServiceResponse>} - A service response with protein alignments.
 */
const readProteinAlignments = async (request, response) => {
  await Controller.handleAltchaRequest(request, response, service.readProteinAlignments);
};

/**
 * /families/{id}/self_alignments
 * Retreive internal (self) alignments of the family's consensus sequence.
 *
 * This endpoint uses a custom handler which may (optional) verify
 * an Altcha PoW payload before running the service.
 *       
 * @param {Object} request - The input parameters.
 * @param {string} response - The Dfam family accession.
 * @returns {Promise<ServiceResponse>} - A service response with self alignments.
 */
const readSelfAlignments = async (request, response) => {
  await Controller.handleAltchaRequest(request, response, service.readSelfAlignments);
};

/**
 * /families/{id}/tandem_repeats
 * Retrieve tandem repeat annotations (ULTRA) for this family. 
 *
 * This endpoint uses a custom handler which may (optional) verify
 * an Altcha PoW payload before running the service.
 *       
 * @param {Object} request - The input parameters.
 * @param {string} response - The Dfam family accession.
 * @returns {Promise<ServiceResponse>} - A service response with tandem repeat annotatons.
 */
const readTandemRepeats = async (request, response) => {
  await Controller.handleAltchaRequest(request, response, service.readTandemRepeats);
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
