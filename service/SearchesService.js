'use strict';

const promisify = require('util').promisify;
const child_process = require('child_process');
const { tmpFileAsync, execAsync, execFileAsync } = require('../utils/async');
const fs = require('fs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const conn = require('../databases').dfam;
const conn_users = require('../databases').users;
const uuidv1 = require('uuid/v1');
const md5 = require('md5');
const dateFormat = require('dateformat');
const zlib = require('zlib');

const AlignmentService = require('./AlignmentService');

const familyModel = require("../models/family.js")(conn, Sequelize);
const classificationModel = require("../models/classification.js")(conn, Sequelize);
const rmTypeModel = require("../models/repeatmasker_type.js")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data.js")(conn, Sequelize);

familyModel.belongsTo(classificationModel, { foreignKey: 'classification_id' });
classificationModel.belongsTo(rmTypeModel, { foreignKey: 'repeatmasker_type_id' });
hmmModelDataModel.belongsTo(familyModel, { foreignKey: 'family_id' });

const streamModel = require('../models/auth/stream.js')(conn_users, Sequelize);
const jobModel = require('../models/auth/job.js')(conn_users, Sequelize);
const searchModel = require('../models/auth/search.js')(conn_users, Sequelize);

// TODO: make configurable
const resultStore = '/usr/local/dfam_search_cache';

/**
 * Retrieve the results of a sequence search
 *
 * id String A result set ID matching a previous search submission
 * no response value expected for this operation
 **/
exports.readSearchResults = function(id) {
  // Query the database to get the start time so we can
  // build the data directory path.
  return jobModel.findOne({ where: { uuid: id } }).then(function(jobRec) {
    if (jobRec.status === "PEND") {
      return { status: "PEND", message: "Search pending." };
    } else if (jobRec.status === "ERROR") {
      return { status: "ERROR", message: "Search failed." };
    }

    var startedDate = new Date(jobRec.started);
    var dataDir = resultStore + "/" + dateFormat(startedDate,"yy/mm/dd/HH/MM/ss") +
                  "/" + id + "/1";

    const nhmmerResults = promisify(fs.access)(
      dataDir + "/nhmmer.out",
      fs.constants.F_OK
    ).then(function() {
      return parseNhmmscan(dataDir + "/nhmmer.out");
    }).catch(function(err) {
      throw new Error("Error looking for nhmmer.out for id " + id + ": " + err);
    });

    const trfResults = promisify(fs.access)(
      dataDir + "/trf.out",
      fs.constants.F_OK
    ).then(function() {
      return parseTRF(dataDir + "/trf.out");
    }).catch(function(err) {
      throw new Error("Error looking for trf.out for id " + id + ": " + err);
    });

    // TODO: Put this setting somewhere
    const faSize = "/usr/local/bin/faSize";
    // Use faSize to get Query sizes
    // e.g.
    //      Seq1  13283
    const getQuerySizes = execFileAsync(faSize, [
      '-detailed',
      dataDir + '/dfamscan.in'
    ]).then(function(sizeData) {
      let lines = sizeData.stdout.split(/\r\n|\n/);
      let records = {};
      lines.forEach(function(line) {
        let flds = line.split(/\s+/);
        if (flds[0].match(/\S+/)) {
          records[flds[0]] = flds[1];
        }
      });
      return records;
    }).catch(function(err) {
      throw new Error('Error calling faSize on query file: ' + err);
    });

    // Results:
    //[
    //  { "query": "foo", "length": 3838,
    //    "hits":[{ "ali_end": "597",
    //                "e_value":"4.8e-12",
    //                "model_start":"466",
    //                "query":"L1ME3G_3end",
    //                "strand":"+",
    //                "target":"Query",
    //                "color":"#739025",
    //                "accession":"DF0000302.4",
    //                "seq_length":"924"
    //                "description": "3' end of L1 retrotransposon, L1ME3G_3end subfamily",
    //                "model_end":"612",
    //                "bit_score":"46.4",
    //                "ali_start":"456",
    //                "bias":"16.6",
    //                "env_start":"435",
    //                "env_end":"617"}, ... ],
    //     "tandem_repeats": [{ "type": "AAGG",
    //               "period":"4",
    //               "score":"66",
    //               "start":"6181",
    //               "copies":"23.0",
    //               "end":"6275"}, .. ]
    //  }, ..
    //]
    return Promise.all([nhmmerResults, trfResults, getQuerySizes]).then(function([nhmmer, trf, sizes]) {
      return Object.keys(sizes).map(function(k) {
        return {
          "query": k,
          "length": sizes[k],
          "hits": nhmmer[k],
          "tandem_repeats": trf[k]
        };
      });
    });
  });
};

/**
 * Retrieve an alignment from a sequence search result
 *
 * id String A result set ID matching a previous search submission
 * sequence String Name of the input sequence to align
 * start Integer Start of the sequence range.
 * end Integer End of the sequence range.
 * family String The family to align against
 * no response value expected for this operation
 **/
exports.readSearchResultAlignment = function(id,sequence,start,end,family) {
  return jobModel.findOne({ where: { uuid: id } }).then(function(jobRec) {
    if (jobRec.status === "PEND") {
      return { status: "Pending" };
    } else if (jobRec.status === "ERROR") {
      return { status: "Error" };
    }

    var startedDate = new Date(jobRec.started);
    var dataDir = resultStore + "/" + dateFormat(startedDate,"yy/mm/dd/HH/MM/ss") +
                  "/" + id + "/1";

    return hmmModelDataModel.findOne({
      attributes: [ "hmm" ],
      include: [ { model: familyModel, where: { accession: family }, attributes: [] } ],
    }).then(function(model) {
      return promisify(zlib.gunzip)(model.hmm).then(function(hmm_data) {
        return reAlignSearchHMM(dataDir, sequence, start, end, hmm_data);
      });
    });
  });
};


/**
 * Submit a sequence search request
 *
 * sequence String Sequence data to search
 * cutoff String Type of cutoff to use, 'curated' or 'evalue'
 * organism String Source organism of the sequence, used for determining search thresholds (optional)
 * evalue String E-value cutoff to use in the search (optional)
 * returns submitSearchResponse
 **/
exports.submitSearch = function(sequence,organism,cutoff,evalue) {
  const now = Date.now();
  const uuid = uuidv1();

  // Preprocess sequence by sanitizing and generating a checksum
  var sanSeq = sanitizeFASTAInput(sequence);
  const md5sum = md5(sanSeq);

  // Preprocess options
  //   - dfamdequeuer expects options to stored as a CSV string
  //     where each field represents a component of the command line.
  //     e.g. "--cut_ga,--species,Homo sapiens" would be added to
  //     the dfamscan run as "--cut_ga --species 'Homo sapiens'".
  var optStr = "--species," + organism;
  if (cutoff == "curated") {
    optStr = optStr + ",--cut_ga";
  } else {
    evalue = parseFloat(evalue);
    if (!isNaN(evalue)) {
      optStr = optStr + ",-E," + Math.min(evalue, 1000);
    }
  }

  // Create job request
  return jobModel.create({
    uuid: uuid,
    status: '',
    opened: now,
    interactive: 1
  }).then(function(jobRec) {
    // Create search record
    return searchModel.create({
      algo: 'nhmmer',
      job_id: jobRec.id,
      targetdb: 'dfamhmm',
      opened: now,
      checksum: md5sum,
      options: optStr,
      position: 1
    }).then(function(searchRec) {
      // Create stream entry for job id
      return streamModel.create({
        search_id: searchRec.id,
        raw_stdin: sequence,
        stdin: sanSeq
      }).then(function(streamRec) {
        // Set pending status
        return jobRec.update({status: "PEND"}).then( function() {
          // Return UUID
          return { id: uuid };
        });
      });
    });
  });
};

function sanitizeFASTAInput(sequence) {
  const validFASTAHeader = /^>(\S*).*$/;
  const validFASTASequence = /^\s*([ACGTUMRWSYKVHDBN]+)\s*$/;
  const toleratedFASTABlankLine = /^\s*$/;

  var lines = sequence.split(/\r\n|\n/);

  var used_IDs = [];

  let matches;
  var newSequence = "";
  var recID = "";
  var recSeq = "";
  lines.forEach(function(line) {
    if ((matches = line.match(validFASTAHeader)) != null) {
      if ( recID != "" && recSeq != "" ) {
        newSequence = newSequence + ">" + recID + "\n" + recSeq + "\n";
      }

      // Add first of _1, _2, etc. that makes the recID unambiguous
      recID = matches[1];
      var inc = 1;
      while (used_IDs.indexOf(recID) !== -1) {
        recID = matches[1] + "_" + inc;
        inc += 1;
      }
      used_IDs.push(recID);
      recSeq = "";
    } else {
      line.replace(/[\s\n\r]+/g,'');
      line.toUpperCase();
      if ((matches = line.match(validFASTASequence)) != null) {
        recSeq = recSeq + matches[1];
      }else if (line.match(toleratedFASTABlankLine)) {
        // Eat blank lines...mmmm
      }else {
        // Eat non FASTA stuff.....this could emit an error if
        // that would be useful.
      }
    }
  });
  newSequence = newSequence + ">" + recID + "\n" + recSeq + "\n";
  return newSequence;
}

// Parse dfamscan.pl generated output from a user-supplied sequence
// search.
function parseNhmmscan( filePath ) {
  return promisify(fs.readFile)(filePath, {encoding: 'utf-8'}).then(function(data){
    //  L1ME3G_3end           DF0000302.4          Query                  46.4   4.8e-12  16.6     466     612    +       456     597     435     617     924   3' end
    //   of L1 retrotransposon, L1ME3G_3end subfamily
    const nhmmscanData = /^\S+\s+DF\d+\.?\d*\s+\S+\s+[\d.]+\s+/;
    let lines = data.split(/\r\n|\n/);
    var records = {};
    var family_acc_mappings = {};

    for (var i = 0; i < lines.length; i++) {
      if (lines[i].match(nhmmscanData)) {
        let fields = lines[i].split(/\s+/);
        let description = fields.slice(14).join(" ");
        if ( fields.length < 14 ) {
          throw new Error("Error not enough fields in nhmmscan output: " + filePath );
        }
        var rec = {
          "query": fields[0],
          "accession": fields[1],
          "sequence": fields[2],
          "bit_score": fields[3],
          "e_value": fields[4],
          "bias": fields[5],
          "model_start": fields[6],
          "model_end": fields[7],
          "strand": fields[8],
          "ali_start": fields[9],
          "ali_end": fields[10],
          "seq_start": fields[11],
          "seq_end": fields[12],
          "mod_length": fields[13],
          "description": description,
        };

        if (rec.accession.indexOf('.') !== -1) {
          rec.accession = rec.accession.substring(0, rec.accession.indexOf('.'));
        }

        if (!records[rec.sequence]) {
          records[rec.sequence] = [];
        }
        records[rec.sequence].push(rec);

        // Accumulate accessions whose types we need to retrieve
        if (!family_acc_mappings[rec.accession]) {
          family_acc_mappings[rec.accession] = [];
        }
        family_acc_mappings[rec.accession].push(rec);
      }
    }

    // TODO: maybe deduplicate with similar code in AnnotationsService
    return familyModel.findAll({
      where: { accession: { [Op.in]: Object.keys(family_acc_mappings) } },
      attributes: ["accession"],
      include: [ { model: classificationModel, include: [
        { model: rmTypeModel, attributes: ["name"] }
      ] } ],
    }).then(function(families) {
      families.forEach(function(family) {
        family_acc_mappings[family.accession].forEach(function(hit) {
          hit.type = null;
          if (family.classification) {
            if (family.classification.repeatmasker_type) {
              hit.type = family.classification.repeatmasker_type.name;
            }
          }
        });
      });

      return records;
    });
  }).catch(function(err) {
    throw new Error("Error reading " + filePath + ": " + err);
  });
}

// Parse dfamscan.pl generated output from a user-supplied sequence
// search.
function parseTRF( filePath ) {
  return promisify(fs.readFile)(filePath, {encoding: 'utf-8'}).then(function(data){
    //6181 6275 4 23.0 4 72 10 66 51 0 48 0 1.00 AAGG AAGGAAGGAAAGAAAAAAGGAAGGGAGGAGGGAAGGAGGGAAAAAGGGAAGGAGGGAAGGAAAGGAAGGAAGGGAAAGAAGGAAAGGAAGGAAGG
    const trfData = /^\d+\s+\d+\s+\d+\s+[\d.]+\s+/;
    const seqLine = /^Sequence:\s(\S+)\s*$/;
    let lines = data.split(/\r\n|\n/);
    var records = {};
    var queryID = "";
    var matches;
    lines.forEach(function(line) {
      if ((matches = line.match(seqLine)) != null ) {
        queryID = matches[1];
        records[queryID] = [];
      }else if (line.match(trfData)) {
        let fields = line.split(/\s+/);
        if ( fields.length < 15 )
          throw new Error("Error not enough fields in trf output: " + filePath );
        var rec = {
          "sequence": queryID,
          "start": fields[0],
          "end": fields[1],
          "repeat_length": fields[2],
          "copies": fields[3],
          "score": fields[7],
          "type": fields[13],
        };
        records[queryID].push(rec);
      }
    });
    return records;
  }).catch(function(err) {
    throw new Error("Error reading " + filePath + ": " + err);
  });
}

// TODO: deduplicate a lot of this code with AlignmentService.
async function reAlignSearchHMM( dataDir, seqID, startPos, endPos, hmmData ) {
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

  // TODO: Make location configurable
  const faOneRecord = '/usr/local/bin/faOneRecord';
  const faFrag = '/usr/local/bin/faFrag';

  const faFragOutput = new Promise(function(resolve, reject) {
    const faOneRecordProc = child_process.spawn(faOneRecord, [dataDir + "/dfamscan.in", seqID]);
    const faFragProc = child_process.spawn(faFrag, ["stdin", (ordStart-1), ordEnd, "stdout"]);

    faOneRecordProc.stdout.pipe(faFragProc.stdin);

    faOneRecordProc.on('error', err => reject(err));
    faOneRecordProc.on('close', (code) => {
      if (code) {
        reject("faOneRecord exited with code " + code);
      }
    });

    faFragProc.on('error', err => reject(err));

    let faFragOut = "";
    faFragProc.stdout.on('data', data => faFragOut += data.toString());

    faFragProc.on('close', (code) => {
      if (!code) {
        resolve(faFragOut);
      } else {
        reject("faFrag exited with code " + code);
      }
    });
  });

  // Grab sequence data from FASTA format
  const writeFastaFile = faFragOutput.then(function(fasta) {
    return promisify(fs.writeFile)(seqFile.fd, fasta, null);
  }).then(function() {
    return promisify(fs.close)(seqFile.fd);
  }).catch(function(err) {
    throw new Error('Error saving sequence data to a temporary file.' + err);
  });

  await Promise.all([writeHmmFile, writeFastaFile]);

  // Do the search
  // TODO: Make nhmmer location configurable
  const nhmmer = '/usr/local/hmmer/bin/nhmmer';
  const nhmmer_out = await execFileAsync(nhmmer, ['--max', '-Z', '3102', '-E', '1000', '--notextw', hmmFile.path, seqFile.path]);

  hmmFile.cleanup();
  seqFile.cleanup();

  return AlignmentService.formatAlignment(seqID, ordStart, ordEnd, nhmmer_out.stdout, startPos);
}
