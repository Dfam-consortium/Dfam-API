/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Retrieve annotations for a given genome assembly in a given range.
* Retrieve annotations for a given genome assembly in a given range.
*
* assembly String Genome assembly to search. A list of assemblies is available at `/assemblies`.
* chrom String Chromosome to search. Assembly dependent, but normally in the \"chrN\" format.
* start Integer Start of the sequence range (one based).
* end Integer End of the sequence range (one based, fully-closed).
* family String An optional family to restrict results to. (optional)
* nrph Boolean `true` to exclude redundant profile hits. (optional)
* returns annotationsResponse
* */
const readAnnotations = ({ assembly, chrom, start, end, family, nrph }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        assembly,
        chrom,
        start,
        end,
        family,
        nrph,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  readAnnotations,
};
