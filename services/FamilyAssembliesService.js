/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Retrieve a family's annotation statistics for all assemblies it is annotated in.
* Retrieve a family's annotation statistics for all assemblies it is annotated in.
*
* id String The Dfam family accession.
* returns List
* */
const readFamilyAnnotationStats = ({ id }) => new Promise(
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
* Retrieve a list of genome assemblies with annotations for a Dfam family.
* Retrieve a list of genome assemblies with annotations for a Dfam family.
*
* id String The Dfam family accession.
* returns List
* */
const readFamilyAssemblies = ({ id }) => new Promise(
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
* Retrieve a family's annotation statistics associated with a given assembly.
* Retrieve a family's annotation statistics associated with a given assembly.
*
* id String The Dfam family accession.
* assemblyUnderscoreid String The assembly identifier, as shown in /families/{id}/assemblies.
* returns familyAssemblyAnnotationStatsResponse
* */
const readFamilyAssemblyAnnotationStats = ({ id, assemblyUnderscoreid }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        id,
        assemblyUnderscoreid,
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
* Retrieve a family's annotations associated with a given assembly.
* Retrieve a family's annotations associated with a given assembly.
*
* id String The Dfam family accession.
* assemblyUnderscoreid String The assembly identifier, as shown in /families/{id}/assemblies.
* nrph Boolean \"true\" to include only non-redundant profile hits.
* download Boolean If true, adds headers to trigger a browser download. (optional)
* returns String
* */
const readFamilyAssemblyAnnotations = ({ id, assemblyUnderscoreid, nrph, download }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        id,
        assemblyUnderscoreid,
        nrph,
        download,
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
* Retrieve a family's karyotype data associated with a given assembly.
* Retrieve a family's karyotype data associated with a given assembly.
*
* id String The Dfam family accession.
* assemblyUnderscoreid String The assembly identifier, as shown in /families/{id}/assemblies.
* returns Object
* */
const readFamilyAssemblyKaryotype = ({ id, assemblyUnderscoreid }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        id,
        assemblyUnderscoreid,
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
* Retrieve a family's conservation data associated with a given assembly.
* Retrieve a family's conservation data associated with a given assembly.
*
* id String The Dfam family accession.
* assemblyUnderscoreid String The assembly identifier, as shown in /families/{id}/assemblies.
* model String Model type, \"cons\" or \"hmm\".
* returns List
* */
const readFamilyAssemblyModelConservation = ({ id, assemblyUnderscoreid, model }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        id,
        assemblyUnderscoreid,
        model,
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
* Retrieve a family's coverage data associated with a given assembly.
* Retrieve a family's coverage data associated with a given assembly.
*
* id String The Dfam family accession.
* assemblyUnderscoreid String The assembly identifier, as shown in /families/{id}/assemblies.
* model String Model type, \"cons\" or \"hmm\".
* returns readFamilyAssemblyModelCoverage_200_response
* */
const readFamilyAssemblyModelCoverage = ({ id, assemblyUnderscoreid, model }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        id,
        assemblyUnderscoreid,
        model,
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
  readFamilyAnnotationStats,
  readFamilyAssemblies,
  readFamilyAssemblyAnnotationStats,
  readFamilyAssemblyAnnotations,
  readFamilyAssemblyKaryotype,
  readFamilyAssemblyModelConservation,
  readFamilyAssemblyModelCoverage,
};
