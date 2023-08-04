/* eslint-disable no-unused-vars */
const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify;
const { tmpFileAsync, execFileAsync } = require('../utils/async');

const config = require("../config");
const dfam = require("../databases").getModels_Dfam();
const getModels_Assembly = require("../databases.js").getModels_Assembly;
const zlib = require("zlib");

const Service = require('./Service');


const formatAlignment = async ({ seqID, ordStart, ordEnd, nhmmer_out }) => {
  let alignRec = {};

  // winston.debug(`nhmmer_out: ${nhmmer_out}`);
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
  alignRec['match'] = { 'string': matchStr };

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

const reAlignAnnotationHMM = async (twoBitFile, seqID, seqName, startPos, endPos, hmmData) => {
  try {
    const [seqFile, hmmFile] = await Promise.all([
      tmpFileAsync({ detachDescriptor: true }),
      tmpFileAsync({ detachDescriptor: true }),
    ]);

    const writeHmmFile = fs.writeFile(hmmFile.fd, hmmData, (err) =>  err)
    fs.close(hmmFile.fd);

    let ordStart = startPos;
    let ordEnd = endPos;
    if (ordEnd < ordStart){ 
      ordStart = endPos; 
      ordEnd = startPos; 
    }
    const twoBitToFa = path.join(config.ucsc_utils_bin, 'twoBitToFa');
    const search = twoBitFile + ':' + seqID + ':' + (ordStart-1) + '-' + ordEnd;

    // Grab sequence data from twoBit format
    const writeFastaFile = await execFileAsync(twoBitToFa, [search, 'stdout'])

    fs.writeFile(seqFile.fd, Buffer.from(writeFastaFile.stdout), (err) => err);
    fs.close(seqFile.fd);

    try {
      await Promise.all([writeHmmFile, writeFastaFile]);
  
      // Do the search
      const nhmmer = path.join(config.hmmer_bin_dir, 'nhmmer');
      // HACK: (JR) Passing '-T 0' to force nhmmer to show all results regardless of score or e-value.
      // TODO: (JR) A region might match a model more than once. The "best" match within the
      //       region will be used here, which might not be the right one.
      const nhmmer_out = await execFileAsync(nhmmer, ['--max', '-T', '0', '--notextw', hmmFile.path, seqFile.path]);
  
      return formatAlignment(seqName, ordStart, ordEnd, nhmmer_out.stdout, startPos);
    } finally {
      hmmFile.cleanup();
      seqFile.cleanup();
    }

  } catch (e) {
    let message = e.message || 'Invalid input'
    let status = e.status || 405
    return {message, status}
  }
}
//)


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

      if (Math.abs(end-start) > 30000) {
        resolve(Service.successResponse({ message: "Requested range is too long." },
        400
        ));
      }

      const assembly_rec = await dfam.assemblyModel.findOne({
        where: { name: assembly },
        attributes: ['schema_name'],
      });
      
      if (!assembly_rec) { resolve(Service.successResponse({}, 404)); }

      const models = await getModels_Assembly(assembly_rec.schema_name);

      const sequence = await models.sequenceModel.findOne({
        attributes: ['accession'],
        where: { id: chrom }
      });

      if (!sequence) { resolve(Service.successResponse({}, 404)); }

      const model = await dfam.hmmModelDataModel.findOne({
        where: { family_id: '4150' } // TODO FIX
        // attributes: [ "hmm" ],
        // include: [ { model: dfam.familyModel, where: { accession: family }, attributes: [] } ],
      });
      
      if (!model) { resolve(Service.successResponse({}, 404)); }

      const hmm_data = await promisify(zlib.gunzip)(model.hmm);

      const twoBitFile = path.join(config.dfam_warehouse_dir,
        "ref-genomes", assembly, "dfamseq.mask.2bit"
      );
    
      const re_align = reAlignAnnotationHMM(twoBitFile, sequence.accession, chrom, start, end, hmm_data)

      resolve(Service.successResponse(re_align, 200));

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
