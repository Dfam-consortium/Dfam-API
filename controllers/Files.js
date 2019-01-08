'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Files = require('../service/FilesService');

module.exports.checkFileOrChunk = function checkFileOrChunk (req, res, next) {
  var userId = req.swagger.params['userId'].value;
  var flowChunkNumber = req.swagger.params['flowChunkNumber'].value;
  var flowChunkSize = req.swagger.params['flowChunkSize'].value;
  var flowCurrentChunkSize = req.swagger.params['flowCurrentChunkSize'].value;
  var flowTotalSize = req.swagger.params['flowTotalSize'].value;
  var flowIdentifier = req.swagger.params['flowIdentifier'].value;
  var flowFilename = req.swagger.params['flowFilename'].value;
  var flowRelativePath = req.swagger.params['flowRelativePath'].value;
  var flowTotalChunks = req.swagger.params['flowTotalChunks'].value;
  Files.checkFileOrChunk(userId,flowChunkNumber,flowChunkSize,flowCurrentChunkSize,flowTotalSize,flowIdentifier,flowFilename,flowRelativePath,flowTotalChunks)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.getSubmittedFiles = function getSubmittedFiles (req, res, next) {
  var userId = req.swagger.params['userId'].value;
  Files.getSubmittedFiles(userId)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};

module.exports.uploadFileOrChunk = function uploadFileOrChunk (req, res, next) {
  var userId = req.swagger.params['userId'].value;
  var guid = req.swagger.params['guid'].value;
  var title = req.swagger.params['title'].value;
  var description = req.swagger.params['description'].value;
  var citations = req.swagger.params['citations'].value;
  var fileDescription = req.swagger.params['fileDescription'].value;
  var flowChunkNumber = req.swagger.params['flowChunkNumber'].value;
  var flowChunkSize = req.swagger.params['flowChunkSize'].value;
  var flowCurrentChunkSize = req.swagger.params['flowCurrentChunkSize'].value;
  var flowTotalSize = req.swagger.params['flowTotalSize'].value;
  var flowType = req.swagger.params['flowType'].value;
  var flowIdentifier = req.swagger.params['flowIdentifier'].value;
  var flowFilename = req.swagger.params['flowFilename'].value;
  var flowRelativePath = req.swagger.params['flowRelativePath'].value;
  var flowTotalChunks = req.swagger.params['flowTotalChunks'].value;
  var file = req.swagger.params['file'].value;
  Files.uploadFileOrChunk(userId,guid,title,description,citations,fileDescription,flowChunkNumber,flowChunkSize,flowCurrentChunkSize,flowTotalSize,flowType,flowIdentifier,flowFilename,flowRelativePath,flowTotalChunks,file)
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
