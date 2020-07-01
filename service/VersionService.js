'use strict';


/**
 * Get the API version.
 *
 * returns versionResponse
 **/
exports.getVersion = function() {
  return Promise.resolve({ "major": "0", "minor": "3", "bugfix": "7" });
};

