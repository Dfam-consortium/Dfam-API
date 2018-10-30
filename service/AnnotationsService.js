'use strict';


/**
 * Retrieve annotations for a given assembly in a given range.
 *
 * assembly String Assembly to search
 * chrom String Chromosome to search
 * start Integer Start of the sequence range.
 * end Integer End of the sequence range.
 * family String An optional family to restrict results to (optional)
 * nrph Boolean \\\"true\\\" to exclude redundant profile hits (optional)
 * no response value expected for this operation
 **/
exports.readAnnotations = function(assembly,chrom,start,end,family,nrph) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

