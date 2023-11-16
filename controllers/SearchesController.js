/**
 * The SearchesController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/SearchesService');
const readSearchResultAlignment = async (request, response) => {
  await Controller.handleRequest(request, response, service.readSearchResultAlignment);
};

const readSearchResults = async (request, response) => {
  await Controller.handleRequest(request, response, service.readSearchResults);
};

const submitSearch = async (request, response) => {
  await Controller.handleRequest(request, response, service.submitSearch);
};


module.exports = {
  readSearchResultAlignment,
  readSearchResults,
  submitSearch,
};
