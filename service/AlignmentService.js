'use strict';


/**
 * Query the alignment of a family to an assembly
 *
 * assembly String Assembly to search
 * chrom String Chromosome to search
 * start Integer Start of the sequence range.
 * end Integer End of the sequence range.
 * family String The family to align against
 * no response value expected for this operation
 **/
exports.readAlignment = function(assembly,chrom,start,end,family) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

