const fs = require('fs');
const path = require('path');
// TODO this is confusing as there is a util.js in this project.  Should not pollute the namespace!
const { promisify } = require('util');

const wrap = require('word-wrap');
const { tmpFileAsync, execFileAsync } = require('./async');
const config = require('../config');


decompressCoMSA = async function(compressed) {
  const [compressedFile, decompressedFile] = await Promise.all([
    tmpFileAsync({ detatchDescriptor: true }),
    tmpFileAsync({ detatchDescriptor: true }),
  ]);

  await promisify(fs.writeFile)(compressedFile.path, compressed);

  const comsa_bin = path.join(config.comsa_bin_dir, 'CoMSA');
  await execFileAsync(comsa_bin, ["Sd", compressedFile.path, decompressedFile.path]);

  const contents = await promisify(fs.readFile)(decompressedFile.path, {encoding: 'utf-8'});
  compressedFile.cleanup();
  decompressedFile.cleanup();

  return contents;
}

// Converts a DFAM family to Stockholm data.
// Expected format: family = {
//  "name": "Name",
//  "description: "Description",
//  "seed_align_data": { comsa_data: <blob> },
// }
//
// Generates and returns the stockholm-formatted output.
seedAlignToStockholm = async function(family) {
  if (family == null || family.seed_align_data == null || family.seed_align_data.comsa_data.length < 1) {
    return null;
  }

  const original_msa = await decompressCoMSA(family.seed_align_data.comsa_data);

  // split by lines
  // read original eheaders
  // replace headers
  // emit new headers + seqs

  let stockholmStr = "# STOCKHOLM 1.0\n";

  function write_header(code, text) {
    if (!text) {
      return;
    }
    stockholmStr += wrap(text.toString(), { width: 72, indent: "#=GF " + code + " ", trim: true });
    stockholmStr += "\n";
  }

  const metadata = [];

  metadata.push(["ID", family.name]);
  metadata.push(["AC", family.accessionAndVersion]);
  if (family.title != null) {
    metadata.push(["DE", family.title]);
  }
  metadata.push(["AU", family.author]);
  metadata.push(["TP", family.classification.lineage.replace(/^root;/, '')]);
  family.clades.forEach(function(clade) {
    metadata.push(["OC", `${clade.sanitized_name}`]);
  });

  family.citations.sort((a, b) => a.family_has_citation.order_added - b.family_has_citation.order_added);
  family.citations.forEach(function(citation) {
    if (citation.family_has_citation.comment) {
      metadata.push(["RC", citation.family_has_citation.comment]);
    }
    metadata.push(["RN", "[" + citation.family_has_citation.order_added + "]"]);
    metadata.push(["RM", citation.pmid]);
    metadata.push(["RT", citation.title]);
    metadata.push(["RA", citation.authors]);
    metadata.push(["RL", citation.journal]);
  });

  family.aliases.forEach(function(alias) {
    metadata.push(["DR", alias.db_id + "; " + alias.db_link + ";"]);
    if (alias.comment) {
      metadata.push(["DC", alias.comment]);
    }
  });

  metadata.push(["CC", family.description]);

  const after_meta = [];
  const seqs = [];
  let max_id_length = 0;

  for (const line of original_msa.split(/\r?\n/)) {
    if (line.length && line[0] == '#') {
      const matches = line.match(/#=GF\s+(\S+)\s+(.*)/);
      if (matches) {
        // GF metadata lines
        if (metadata.findIndex(([k, v]) => k === matches[1]) === -1) {
          // add this one, since it's not already included
          metadata.push([matches[1], matches[2]]);
        }
      } else if (!line.match(/#\s+STOCKHOLM/)) {
        // other header line; write as-is
        after_meta.push(line);
      }
    } else {
      // sequences section
      const split = line.split(/\s+/, 2);
      if (split.length > 1) {
        if (split[0].length > max_id_length) {
          max_id_length = split[0].length;
        }
        seqs.push(split);
      } else {
        seqs.push(line);
      }
    }
  }

  for (const [k, v] of metadata) {
    write_header(k, v);
  }

  for (const line of after_meta) {
    stockholmStr += line + "\n";
  }

  for (const seq of seqs) {
    if (Array.isArray(seq)) {
      stockholmStr += seq[0].padEnd(max_id_length) + "  " + seq[1] + "\n";
    } else if (seq) {
      stockholmStr += seq + "\n";
    }
  }

  return stockholmStr;
}

module.exports={
  seedAlignToStockholm  
};
