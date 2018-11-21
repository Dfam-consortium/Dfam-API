'use strict';

const fs = require('fs');
const tmp = require('tmp');
const execFile = require('child_process').execFile;
const promisify = require('util').promisify;

const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const zlib = require("zlib");
const familyModel = require("../models/family.js")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data.js")(conn, Sequelize);

hmmModelDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });

// Wrapper around tmp.file that returns a Promise
function tmpFileAsync() {
  return new Promise(function(resolve, reject) {
    tmp.file(function(err, path, fd, cleanup) {
      if (err) { reject(err); }
      else { resolve({ path, fd, cleanup }); }
    });
  });
}

// Wrapper around child_process.execFile that returns a Promise
function execFileAsync(file, args, options) {
  return new Promise(function(resolve, reject) {
    execFile(file, args, options, function(error, stdout, stderr) {
      if (error) { return reject(error); }
      else { return resolve({ stdout, stderr }); }
    });
  });
}

function formatAlignment(seqID, ordStart, ordEnd, nhmmer_out, startPos) {
  var alignRec = {};

  console.log(`nhmmer_out: ${nhmmer_out}`);

  // Match the genomic sequence line E.g
  //      chr1:35700145-35700469 324 TGTGATGGTTTGTATA...AAAACCCTAACTAAGAC 1  
  let genMatchRE = new RegExp('(\\s+' + seqID + ':' + ordStart + '-' + ordEnd + '\\s+(\\d+)\\s+)(\\S+)\\s+(\\d+)\\s*[\\n\\r]+\\s+(\\S[^\\n\\r]+)');
  let genMatch = genMatchRE.exec(nhmmer_out);

  if ( ! genMatch || genMatch.length != 6 ) {
    throw new Error('Error parsing nhmmer output.  Could not find alignment data for genomic sequence.');
  }

  let sstart = parseInt(genMatch[2]);
  let seqStr = genMatch[3];
  let send = parseInt(genMatch[4]);
  let ppStr = genMatch[5];
  let sstrand = send > sstart ? '+' : '-';
  if ( sstrand == '+' ) {
    sstart = startPos + sstart - 1;
    send = startPos + send - 1;
  } else {
    sstart = startPos - sstart + 1;
    send = startPos - send + 1;
  }
  alignRec['seq'] = {
    'start': sstart,
    'end': send,
    'id': seqID,
    'string': seqStr
  };
  alignRec['pp'] = {
    'string': ppStr,
  };

  // Pick out the query identifier ( Dfam family ) from the output.  E.g
  //      Query:       ORR1A2  [M=327]
  let qryMatchRE = new RegExp('Query:\\s+(\\S+)\\s+\\[');
  let qryMatch = qryMatchRE.exec(nhmmer_out);
  if ( ! qryMatch || qryMatch.length != 2 ) {
    throw new Error('Error parsing nhmmer output.  Could not find Query identifier.');
  }
  let queryID = qryMatch[1];

  // Match the model (family) alignment sequence *AND* the PP line E.g:
  //       ORR1A2   1 tgtgatggttt....aaccctaactaagac 326
  //                  tgtg  ggttt....aa c taa+ aagac 
  let mdlMatchRE = new RegExp('(\\s+' + queryID + '\\s+(\\d+)\\s+)(\\S+)\\s+(\\d+)\\s*[\\n\\r]+\\s+(\\S[^\\n\\r]+)');
  let mdlMatch = mdlMatchRE.exec(nhmmer_out);
  if ( ! mdlMatch || mdlMatch.length != 6 ) {
    throw new Error('Error parsing nhmmer output.  Could not find Model alignment sequence and PP.');
  }

  let mstart = parseInt(mdlMatch[2]);
  let mSeqStr = mdlMatch[3];
  let mend = parseInt(mdlMatch[4]);
  let matchStr = mdlMatch[5];
  alignRec['hmm'] = {
    'start': mstart,
    'end': mend,
    'id': queryID,
    'string': mSeqStr
  };
  alignRec['match'] = { 'string': matchStr  };

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

  // Make twoBitToFa location configurable
  const twoBitToFa = '/usr/local/bin/twoBitToFa';
  const search = twoBitFile + ':' + seqID + ':' + ordStart + '-' + ordEnd;

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

  return formatAlignment(seqID, ordStart, ordEnd, nhmmer_out.stdout, startPos);
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
