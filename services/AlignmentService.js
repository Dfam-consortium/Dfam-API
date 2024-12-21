/* eslint-disable no-unused-vars */
const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify;
const { tmpFileAsync, execFileAsync } = require('../utils/async');

const dfam = require("../databases").getModels_Dfam();
const {ucsc_utils_bin, hmmer_bin_dir, dfam_warehouse_dir} = require('../config');
const zlib = require("zlib");

const Service = require('./Service');
const te_idx = require("../utils/te_idx.js");

const formatAlignment = async ( seqID, ordStart, ordEnd, nhmmer_out ) => {
  try {
  
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
  } catch (err) {
    err
  }
}

async function reAlignAnnotationHMM(twoBitFile, seqName, startPos, endPos, hmmData) {

  const [seqFile, hmmFile] = await Promise.all([
    tmpFileAsync({ detachDescriptor: true }),
    tmpFileAsync({ detachDescriptor: true }),
  ]);

  // Save HMM data to file
  const writeHmmFile = promisify(fs.writeFile)(hmmFile.fd, hmmData, null).then(function() {
    return promisify(fs.close)(hmmFile.fd);
  }).catch(function(err) {
    throw new Error('Error saving hmm data to a temporary file.' + err);
  });

  var ordStart = startPos;
  var ordEnd = endPos;
  if (ordEnd < ordStart)
  {
    ordStart = endPos;
    ordEnd = startPos;
  }

  const twoBitToFa = path.join(ucsc_utils_bin, 'twoBitToFa');
  const search = twoBitFile + ':' + seqName + ':' + (ordStart-1) + '-' + ordEnd;

  // Grab sequence data from twoBit format
  const writeFastaFile = execFileAsync(twoBitToFa, [search, 'stdout']).then(function(fasta) {
    return promisify(fs.writeFile)(seqFile.fd, Buffer.from(fasta.stdout), null);
  }).then(function() {
    return promisify(fs.close)(seqFile.fd);
  }).catch(function(err) {
    throw new Error('Error saving sequence data to a temporary file.' + err);
  });

  try {
    await Promise.all([writeHmmFile, writeFastaFile]);

    // Do the search
    const nhmmer = path.join(hmmer_bin_dir, 'nhmmer');

    // HACK: (JR) Passing '-T 0' to force nhmmer to show all results regardless of score or e-value.
    // TODO: (JR) A region might match a model more than once. The "best" match within the
    //       region will be used here, which might not be the right one.
    const nhmmer_out = await execFileAsync(nhmmer, ['--max', '-T', '0', '--notextw', hmmFile.path, seqFile.path]);

    return formatAlignment(seqName, ordStart, ordEnd, nhmmer_out.stdout, startPos);

  } finally {
    hmmFile.cleanup();
    seqFile.cleanup();
  }
}


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
const readAlignment = async ({ assembly, chrom, start, end, family }) => new Promise(
  async (resolve, reject) => {
    try {

      if (Math.abs(end-start) > 30000) {
        reject(Service.rejectResponse("Requested range is too long.", 400))
      }

      let full_assembly = await dfam.assemblyModel.findOne({
        where: {"name": assembly},
        attributes:["schema_name"]
      })

      if (! full_assembly) {
        reject(Service.rejectResponse(`Assembly ${assembly} Not Found`, 404));
      } else {
        full_assembly = full_assembly.schema_name
      }

      const model = await dfam.hmmModelDataModel.findOne({
        attributes: [ "hmm" ],
        include: [ { model: dfam.familyModel, where: { accession: family }, attributes: [] } ],
      });

      if (!model){
        reject(Service.rejectResponse("Model Not Found",404))
        return
      }
      
      const twoBitFile = path.join(dfam_warehouse_dir, "ref-genomes", assembly, "dfamseq.mask.2bit");
      
      if (!fs.existsSync(twoBitFile)) {
        reject(Service.rejectResponse(`Assembly ${assembly} Not Found`, 404));
      }

      let chrom_in_assem =  await te_idx.chromInAssembly(full_assembly, chrom)
      if (! chrom_in_assem) {
        reject(Service.rejectResponse(`Sequence ${chrom} Not Found In Assembly ${assembly}`, 404));
      }

      const hmm_data = await promisify(zlib.gunzip)(model.hmm);

      let reAligned = await reAlignAnnotationHMM(twoBitFile, chrom, start, end, hmm_data)

      if (!reAligned){
        reject(Service.rejectResponse("Realignment failed",404))
        return
      }
      
      resolve(Service.successResponse(reAligned));

  } catch (e) {
    reject(Service.rejectResponse(
      e.message || `Invalid Input - ${e} - ${e.message}`,
      e.status || 405,
    ));
  }
});

module.exports = {
  readAlignment,
  formatAlignment
};
