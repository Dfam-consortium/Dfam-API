'use strict';


/**
 * Retrieve an individual Dfam family's list of linked annotated assemblies
 *
 * id String The Dfam family name
 * no response value expected for this operation
 **/
exports.readFamilyAssemblies = function(id) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Retrieve a family's annotation statistics for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyAnnotationStats = function(id,assembly_id) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Retrieve a family's annotation data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * nrph Boolean \\\"true\\\" to include only non-redundant profile hits
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyAnnotations = function(id,assembly_id,nrph) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Retrieve a family's karyotype image data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyKaryoImage = function(id,assembly_id) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Retrieve a family's coverage data for a given assembly
 *
 * id String The Dfam family name
 * assembly_id String The assembly name
 * model String Model type, \"cons\" or \"hmm\"
 * threshold String Threshold, TODO enumerate or provide list of values
 * no response value expected for this operation
 **/
exports.readFamilyAssemblyModelCoverage = function(id,assembly_id,model,threshold) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

