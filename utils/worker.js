'use strict';
const Sequelize = require("sequelize");
//const conn = require("../databases.js").dfam;
const conn = require("../databases.js").getConn_Dfam();
const zlib = require("zlib");
const wrap = require('word-wrap');
const winston = require('winston');
const copyright = require("./copyright");
const family = require("./family");
const hmm = require("./hmm");
const fasta = require("./fasta");
//const stockholm = require("./stockholm");
//const embl = require("./embl");
const util = require("./util");

const familyModel = require("../models/family.js")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data.js")(conn, Sequelize);
familyModel.hasOne(hmmModelDataModel, { foreignKey: 'family_id' });

//const threadId = require('node:worker_threads').threadId;
//console.log("Worker Starting Up: " + threadId);


const hmm_command = async function ({accessions, include_copyright}) {
  //console.log("Worker: " + threadId + " , command = hmm_command");
  let ret_val = ""
  if (include_copyright) {
    ret_val = await copyright("#   ");
  }

  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);

    if (!fam) {
      winston.error(`Missing family for accession: ${accession}`);
      return;
    }

    const hmm_data = await hmmModelDataModel.findOne({
      attributes: [ "hmm" ],
      where: { family_id: fam.id }
    });

    if (!hmm_data) {
      winston.error(`Missing HMM for family: ${accession}`);
      return;
    }

    ret_val = ret_val + await hmm.annotateHmm(fam, zlib.gunzipSync(hmm_data.hmm).toString());
  }
  return ret_val;
};


const embl_command = async function (accessions, include_copyright = 0) {};
const fasta_command = async function (accessions) {};
const stockholm_command = async function (accessions) {};

module.exports = {
  hmm_command,
  embl_command,
  fasta_command,
  stockholm_command
};

