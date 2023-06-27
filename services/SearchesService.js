/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Retrieve an alignment from a sequence search result.
* Retrieve an alignment from a sequence search result.
*
* id String The result set ID returned by the API at submission time.
* sequence String The name of the input sequence to align.
* start Integer Start of the sequence range.
* end Integer End of the sequence range.
* family String The family to align against.
* returns alignmentResponse
* */
const readSearchResultAlignment = ({ id, sequence, start, end, family }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        id,
        sequence,
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
/**
* Retrieve the results of a sequence search.
* Retrieve the results of a sequence search.
*
* id String A result set ID matching the ID returned by a previous search submission.
* returns annotationsResponse
* */
const readSearchResults = ({ id }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        id,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Submit a sequence search request.
* Submit a sequence search request.
*
* sequence String Sequence data to search, in FASTA format.
* cutoff String Type of cutoff to use, either 'curated' or 'evalue'.
* organism String Source organism of the sequence, used for determining search thresholds. (optional)
* evalue String E-value cutoff to use in the search. Only effective if `cutoff` is set to `'evalue'`. (optional)
* returns submitSearchResponse
* */
const submitSearch = ({ sequence, cutoff, organism, evalue }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        sequence,
        cutoff,
        organism,
        evalue,
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
  readSearchResultAlignment,
  readSearchResults,
  submitSearch,
};
