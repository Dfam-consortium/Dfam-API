/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Query the alignment of a family to an assembly. This API is meant for use only on dfam.org.
* Query the alignment of a family to an assembly. This API is meant for use only on dfam.org.
*
* assembly String Genome assembly to align to. A list of assemblies is available at `/assemblies`.
* chrom String Chromosome to align to.
* start Integer Start of the sequence range (one based).
* end Integer End of the sequence range (one based, fully closed).
* family String The family to align against.
* returns alignmentResponse
* */
const readAlignment = ({ assembly, chrom, start, end, family }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        assembly,
        chrom,
        start,
        end,
        family,
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
  readAlignment,
};
