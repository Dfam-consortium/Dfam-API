'use strict';


/**
 * Upload misc datasets for submission to Dfam
 *
 * userId String 
 * flowChunkNumber Integer  (optional)
 * flowChunkSize Integer  (optional)
 * flowCurrentChunkSize Integer  (optional)
 * flowTotalSize Integer  (optional)
 * flowIdentifier String  (optional)
 * flowFilename String  (optional)
 * flowRelativePath String  (optional)
 * flowTotalChunks String  (optional)
 * returns String
 **/
exports.checkFileOrChunk = function(userId,flowChunkNumber,flowChunkSize,flowCurrentChunkSize,flowTotalSize,flowIdentifier,flowFilename,flowRelativePath,flowTotalChunks) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = "";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Get details on submitted and unproccesed files
 *
 * userId String 
 * returns String
 **/
exports.getSubmittedFiles = function(userId) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = "";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Upload misc datasets for submission to Dfam
 *
 * userId String 
 * guid String  (optional)
 * title String  (optional)
 * description String  (optional)
 * citations String  (optional)
 * fileDescription String  (optional)
 * flowChunkNumber Integer  (optional)
 * flowChunkSize Integer  (optional)
 * flowCurrentChunkSize Integer  (optional)
 * flowTotalSize Integer  (optional)
 * flowType String  (optional)
 * flowIdentifier String  (optional)
 * flowFilename String  (optional)
 * flowRelativePath String  (optional)
 * flowTotalChunks Integer  (optional)
 * file File something (optional)
 * returns String
 **/
exports.uploadFileOrChunk = function(userId,guid,title,description,citations,fileDescription,flowChunkNumber,flowChunkSize,flowCurrentChunkSize,flowTotalSize,flowType,flowIdentifier,flowFilename,flowRelativePath,flowTotalChunks,file) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = "";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}

