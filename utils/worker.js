'use strict';

/**
 * @fileoverview
 * Generic `worker_threads` worker module for performing a variety of
 * compute- or I/O-intensive operations in parallel threads, such as
 * exporting sequences, alignments, or performing annotation searches.
 */

const Sequelize = require("sequelize");
const { threadId } = require('node:worker_threads');
const { appendFile } = require("fs/promises");
const { promisify } = require("util");

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
const comparison_search = require("./comparison_search");

const familyModel = require("../models/family")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data")(conn, Sequelize);

familyModel.hasOne(hmmModelDataModel, { foreignKey: 'family_id' });

logger.info(`Worker Starting Up: ${threadId}`);

/**
 * Export HMM data for a list of accessions.
 */
const hmm_command = async function ({ accessions, include_copyright = 0, write_file = null }) {
  logger.info(`Worker: ${threadId}, command = hmm_command, accessions = ${accessions.join(',')}`);
  let ret_val = include_copyright ? await copyright("#   ") : "";

  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);
    if (!fam) {
      logger.error({ error: { error: `Missing family for accession: ${acc}`, code: 404 } });
      return;
    }

    const hmm_data = await hmmModelDataModel.findOne({
      attributes: ["hmm"],
      where: { family_id: fam.id },
    });

    if (!hmm_data) {
      logger.error({ error: { error: `Missing HMM for family: ${acc}`, code: 404 } });
      return;
    }

    const decompressed = await promisify(zlib.gunzip)(hmm_data.hmm);
    const write_data = hmm.annotateHmm(fam, decompressed.toString());

    if (write_file) {
      await appendFile(write_file, write_data);
    } else {
      ret_val += write_data;
    }
  }

  return write_file ? null : ret_val;
};

/**
 * Export EMBL format for a list of accessions.
 */
const embl_command = async function ({ accessions, include_copyright = 0, write_file = null }) {
  logger.info(`Worker: ${threadId}, command = embl_command, accessions = ${accessions.join(',')}`);
  let ret_val = include_copyright ? await copyright("CC   ") : "";

  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);
    if (!fam) {
      logger.error({ error: { error: `Missing family for accession: ${acc}`, code: 404 } });
      return;
    }

    const write_data = embl.exportEmbl(fam);
    if (write_file) {
      await appendFile(write_file, write_data);
    } else {
      ret_val += write_data;
    }
  }

  return write_file ? null : ret_val;
};

/**
 * Export FASTA format for a list of accessions.
 */
const fasta_command = async function ({ accessions, write_file = null }) {
  logger.info(`Worker: ${threadId}, command = fasta_command, accessions = ${accessions.join(',')}`);
  let ret_val = "";

  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);
    if (!fam) {
      logger.error({ error: { error: `Missing family for accession: ${acc}`, code: 404 } });
      return;
    }
    const write_data = fasta.exportFasta(fam);
    if (write_file) {
      await appendFile(write_file, write_data);
    } else {
      ret_val += write_data;
    }
  }

  return write_file ? null : ret_val;
};

/**
 * Export Stockholm alignment format for a list of accessions.
 */
const stockholm_command = async function ({ accessions }) {
  logger.info(`Worker: ${threadId}, command = stockholm_command, accessions = ${accessions.join(',')}`);
  let ret_val = "";

  for (const acc of accessions) {
    const fam = await family.getFamilyForAnnotation(acc);
    if (!fam) {
      logger.error({ error: { error: `Missing family for accession: ${acc}`, code: 404 } });
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

/**
 * Return self-alignment results for a family.
 */
const self_alignment_command = async function ({ accession }) {
  logger.info(`Worker: ${threadId}, command = self_alignment_command, accession = ${accession}`);
  const selfsrch = await comparison_search.self_search(accession);
  return JSON.stringify(selfsrch);
};

/**
 * Return Dfam relationship data for a family.
 */
const dfam_relationships_command = async function ({ accession }) {
  logger.info(`Worker: ${threadId}, command = dfam_relationships_command, accession = ${accession}`);
  const relations = await comparison_search.dfam_relationship_search(accession);
  return JSON.stringify(relations);
};

/**
 * Return protein alignment data for a family.
 */
const protein_alignment_command = async function ({ accession }) {
  logger.info(`Worker: ${threadId}, command = protein_alignment_command, accession = ${accession}`);
  const protein = await comparison_search.protein_search(accession);
  return JSON.stringify(protein);
};

/**
 * Return tandem repeat data (ULTRA) for a family.
 */
const tandem_repeats_command = async function ({ accession }) {
  logger.info(`Worker: ${threadId}, command = tandem_repeats_command, accession = ${accession}`);
  const ultra = await comparison_search.ultra_search(accession);
  return JSON.stringify(ultra);
};

/**
 * Export SAM format alignment for a family.
 */
const sam_command = async function ({ accession }) {
  logger.info(`Worker: ${threadId}, command = sam_command, accession = ${accession}`);
  const fam = await family.getFamilyWithConsensus(accession);
  if (!fam) {
    logger.error({ error: { error: `Missing family for accession: ${accession}`, code: 404 } });
    return;
  }

  const align_model = await dfam.seedAlignDataModel.findOne({
    attributes: ["comsa_data"],
    where: { family_id: fam.id },
  });

  const label = `${fam.accession}.${fam.version}`;
  return await stockholm.comsaToSam(label, align_model.comsa_data);
};

module.exports = {
  self_alignment_command,
  dfam_relationships_command,
  protein_alignment_command,
  tandem_repeats_command,
  hmm_command,
  embl_command,
  fasta_command,
  stockholm_command,
  sam_command,
};
