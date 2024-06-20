'use strict';
/*
 * A generic worker_threads worker to invoke one of several
 * intensive-ish operations.
 *
 */
const Sequelize = require("sequelize");
const conn = require("../databases").getConn_Dfam();
const dfam = require("../databases").getModels_Dfam();
const logger = require("../logger");
const zlib = require("zlib");
const copyright = require("./copyright");
const family = require("./family");
const hmm = require("./hmm");
const fasta = require("./fasta");
const stockholm = require("./stockholm");
const embl = require("./embl");
const { appendFileSync } = require("fs");

const familyModel = require("../models/family")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data")(conn, Sequelize);
familyModel.hasOne(hmmModelDataModel, { foreignKey: 'family_id' });

// Determine our threadId (note this will change over time as the pools shrinks/expands )
const threadId = require('node:worker_threads').threadId;
logger.info("Worker Starting Up: " + threadId);

const hmm_command = async function ({accessions, include_copyright = 0, write_file=null}) {
  logger.info("Worker: " + threadId + " , command = hmm_command");
  let ret_val = "";
  if (include_copyright) {
    ret_val = await copyright("#   ");
  }

  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);

    if (!fam) {
      logger.error(`Missing family for accession: ${acc}`);
      return;
    }

    const hmm_data = await hmmModelDataModel.findOne({
      attributes: [ "hmm" ],
      where: { family_id: fam.id }
    });

    if (!hmm_data) {
      logger.error(`Missing HMM for family: ${acc}`);
      return;
    }
    let write_data = hmm.annotateHmm(fam, zlib.gunzipSync(hmm_data.hmm).toString())

    if (write_file) {
      appendFileSync(write_file, write_data)
    } else {
      ret_val = ret_val + write_data
    }
  }
  
  if (write_file) {
    return null;
  } else {
    return ret_val;
  }
};


const embl_command = async function ({accessions, include_copyright = 0, write_file=null}) {
  logger.info("Worker: " + threadId + " , command = embl_command");
  let ret_val = "";
  if (include_copyright) {
    ret_val = await copyright("CC   ");
  }

  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);

    if (!fam) {
      logger.error(`Missing family for accession: ${acc}`);
      return;
    }
    let write_data = embl.exportEmbl(fam)
    if (write_file){
      appendFileSync(write_file, write_data)
    } else {
      ret_val = ret_val + write_data;
    }
  }
  if (write_file) {
    return null;
  } else {
    return ret_val;
  }
};


const fasta_command = async function ({accessions, write_file=null}) {
  logger.info("Worker: " + threadId + " , command = fasta_command");

  let ret_val = "";
  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);

    if (!fam) {
      logger.error(`Missing family for accession: ${acc}`);
      return;
    }
    let write_data = fasta.exportFasta(fam)
    if (write_file){
      appendFileSync(write_file, write_data)
    } else {
      ret_val = ret_val + write_data;
    }
  }
  if (write_file) {
    return null;
  } else {
    return ret_val;
  }
};
 
const stockholm_command = async function ({accessions}) {
  logger.info("Worker: " + threadId + " , command = stockholm_command");

  let ret_val = "";
  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);
    if (!fam) {
      logger.error(`Missing family for accession: ${acc}`);
      return;
    }

    fam.seed_align_data = await dfam.seedAlignDataModel.findOne({
      attributes: ["comsa_data"],
      where: { family_id: fam.id },
    });

    ret_val += await stockholm.seedAlignToStockholm(fam);
  }
  return ret_val;
};


module.exports = {
  hmm_command,
  embl_command,
  fasta_command,
  stockholm_command
};

