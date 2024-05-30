/**
 * The FamilyAssembliesController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/FamilyAssembliesService');
const readFamilyAnnotationStats = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyAnnotationStats);
};

const readFamilyAssemblies = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyAssemblies);
};

const readFamilyAssemblyAnnotationStats = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyAssemblyAnnotationStats);
};

const readFamilyAssemblyAnnotations = async (request, response) => {
  await Controller.handleStream(request, response, service.readFamilyAssemblyAnnotations);
};

const readFamilyAssemblyKaryotype = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyAssemblyKaryotype);
};

const readFamilyAssemblyModelConservation = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyAssemblyModelConservation);
};

const readFamilyAssemblyModelCoverage = async (request, response) => {
  await Controller.handleRequest(request, response, service.readFamilyAssemblyModelCoverage);
};


module.exports = {
  readFamilyAnnotationStats,
  readFamilyAssemblies,
  readFamilyAssemblyAnnotationStats,
  readFamilyAssemblyAnnotations,
  readFamilyAssemblyKaryotype,
  readFamilyAssemblyModelConservation,
  readFamilyAssemblyModelCoverage,
};
