'use strict';

const fs = require('fs');
const promisify = require('util').promisify;
const { tmpFileAsync, execFileAsync } = require('../utils/async');

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const zlib = require("zlib");
const familyModel = require("../models/family.js")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data.js")(conn, Sequelize);

hmmModelDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });

exports.formatAlignment = function(seqID, ordStart, ordEnd, nhmmer_out) {
  var alignRec = {};

//  console.log(`nhmmer_out: ${nhmmer_out}`);
  let lines = nhmmer_out.split(/[\r\n]/);
  let lineIndex = 0;

  function advanceAndMatch(regex) {
    let match;
    while (!match && lineIndex < lines.length) {
      match = regex.exec(lines[lineIndex]);
      lineIndex += 1;
    }

    return match;
  }

  // Pick out the query identifier ( Dfam family ) from the output.  E.g
  //      Query:       ORR1A2  [M=327]
  let qryMatchRE = new RegExp('Query:\\s+(\\S+)\\s+\\[');
  let qryMatch = advanceAndMatch(qryMatchRE);
  if ( ! qryMatch || qryMatch.length != 2 ) {
    throw new Error('Error parsing nhmmer output.  Could not find Query identifier.');
  }
  let queryID = qryMatch[1];

  // Match the model (family) alignment sequence E.g:
  //       ORR1A2   1 tgtgatggttt....aaccctaactaagac 326
  //                  tgtg  ggttt....aa c taa+ aagac 
  let mdlMatchRE = new RegExp('^(\\s+\\S+\\s+(\\d+)\\s+)(\\S+)\\s+(\\d+)\\s*$');
  let mdlMatch = advanceAndMatch(mdlMatchRE);
  if ( ! mdlMatch || mdlMatch.length != 5 ) {
    throw new Error('Error parsing nhmmer output.  Could not find Model alignment sequence and match.');
  }

  // The start of the model string will be in the same
  // column as the start of the match string
  let matchStrOffset = mdlMatch[0].indexOf(mdlMatch[3]);

  let mstart = parseInt(mdlMatch[2]);
  let mSeqStr = mdlMatch[3];
  let mend = parseInt(mdlMatch[4]);
  let matchStr = lines[lineIndex].substring(matchStrOffset);
  alignRec['hmm'] = {
    'start': mstart,
    'end': mend,
    'id': queryID,
    'string': mSeqStr
  };
  alignRec['match'] = { 'string': matchStr  };

  // Match the genomic sequence line E.g
  //      chr1:35700145-35700469 324 TGTGATGGTTTGTATA...AAAACCCTAACTAAGAC 1  
  let genMatchRE = new RegExp('(\\s+\\S+:\\d+-\\d+\\s+(\\d+)\\s+)(\\S+)\\s+(\\d+)\\s*');
  let genMatch = advanceAndMatch(genMatchRE);

  if ( ! genMatch || genMatch.length != 5 ) {
    throw new Error('Error parsing nhmmer output.  Could not find alignment data for genomic sequence.');
  }

  // The start of the genome string will be in the same
  // column as the start of the pp string
  let ppStrOffset = genMatch[0].indexOf(genMatch[3]);

  let sstart = parseInt(genMatch[2]);
  let seqStr = genMatch[3];
  let send = parseInt(genMatch[4]);
  let ppStr = lines[lineIndex].substring(ppStrOffset).replace(" PP", "");
  let sstrand = send > sstart ? '+' : '-';
  sstart = ordStart + sstart - 1;
  send = ordStart + send - 1;
  alignRec['seq'] = {
    'start': sstart,
    'end': send,
    'id': seqID,
    'string': seqStr
  };
  alignRec['pp'] = {
    'string': ppStr,
  };

  return alignRec;
}

// Given genomic coordinates in the form of a twoBit file, sequence identifier,
// start and end position along with the data for a pHMM, run nhmmer and
// return the alignment.
//
// TODO: Future request. Write the equivalent for RMBlast/Crossmatch
async function reAlignAnnotationHMM(twoBitFile, seqID, startPos, endPos, hmmData) {
  const [seqFile, hmmFile] = await Promise.all([tmpFileAsync(), tmpFileAsync()]);

  // Save HMM data to file
  const writeHmmFile = promisify(fs.writeFile)(hmmFile.fd, hmmData, null).then(function() {
    return promisify(fs.close)(hmmFile.fd);
  }).catch(function(err) {
    throw new Error('Error saving hmm data to a temporary file.' + err);
  });

  var ordStart = startPos;
  var ordEnd = endPos;
  var orient = '+';
  if (ordEnd < ordStart)
  {
    ordStart = endPos;
    ordEnd = startPos;
    orient = '-';
  }

  // TODO: Make twoBitToFa location configurable
  const twoBitToFa = '/usr/local/bin/twoBitToFa';
  const search = twoBitFile + ':' + seqID + ':' + (ordStart-1) + '-' + ordEnd;

  // Grab sequence data from twoBit format
  const writeFastaFile = execFileAsync(twoBitToFa, [search, 'stdout']).then(function(fasta) {
    return promisify(fs.writeFile)(seqFile.fd, new Buffer(fasta.stdout), null);
  }).then(function() {
    return promisify(fs.close)(seqFile.fd);
  }).catch(function(err) {
    throw new Error('Error saving sequence data to a temporary file.' + err);
  });

  await Promise.all([writeHmmFile, writeFastaFile]);

  // Do the search
  // TODO: Make nhmmer location configurable
  const nhmmer = '/usr/local/hmmer/bin/nhmmer';
  const nhmmer_out = await execFileAsync(nhmmer, ['--max', '-Z', '3102', '-E', '10', '--notextw', hmmFile.path, seqFile.path]);

  hmmFile.cleanup();
  seqFile.cleanup();

  return exports.formatAlignment(seqID, ordStart, ordEnd, nhmmer_out.stdout, startPos);
}

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
  return hmmModelDataModel.findOne({
    attributes: [ "hmm" ],
    include: [ { model: familyModel, where: { accession: family }, attributes: [] } ],
  }).then(function(model) {
    return promisify(zlib.gunzip)(model.hmm).then(function(hmm_data) {
      // TODO: Make genome search path configurable
      const twoBitFile = `/usr/local/genomes/${assembly}/${assembly}.unmasked.2bit`;

      return reAlignAnnotationHMM(twoBitFile, chrom, start, end, hmm_data);
    });
  });
};
