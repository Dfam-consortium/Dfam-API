const child_process = require('child_process');
const config = require('../config');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const family = require('./family'); 
const fasta = require('./fasta'); 
//const logger = require('../logger');


const DISTINCT_COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6',
  '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3',
  '#808000', '#ffd8b1', '#000075', '#808080', '#000000', '#ff9180', '#a65b29', '#665a4d',
  '#998226', '#143300', '#7fff80', '#6cd9d2', '#0077b3', '#265499', '#1f00e6', '#6c468c',
  '#d9a3d5', '#a6296c', '#d96c7b', '#4c0000', '#8c5946', '#664733', '#bf8000', '#736739',
  '#74a653', '#004d1f', '#00474d', '#99bbcc', '#80b3ff', '#0a004d', '#b63df2', '#f200c2',
  '#997387', '#66333a', '#330d0d', '#ffd0bf', '#ff8800', '#332b1a', '#d9d26c', '#299900',
  '#008044', '#46888c', '#102940', '#293aa6', '#290099', '#2b1a33', '#e673cf', '#660029',
  '#d9a3aa', '#806060', '#332a26', '#331b00', '#f2deb6', '#add900', '#d0ffbf', '#73e6b0',
  '#bffbff', '#406280', '#7382e6', '#2e1966', '#8f0099', '#594355', '#ff80b3', '#e55039',
  '#ff6600', '#ffc480', '#f2c200', '#475900', '#53664d', '#0d3326', '#009bf', '#0061f2',
  '#7c82a6', '#c6b6f2', '#300033', '#f20081', '#f20041', '#66241a', '#592400', '#a67f53',
  '#4c3d00', '#aab386', '#20f200', '#468c75', '#39494d', '#001f4d', '#4d5066', '#a173e6',
  '#591655', '#400022', '#990014'
];


function computeCigar(ref, cons) {
  let cigar = '';
  let count = 0;
  let op = '';

  const length = ref.length;

  for (let i = 0; i < length; i++) {
    const r = ref[i];
    const c = cons[i];

    let thisOp;
    if (r === '-' && c !== '-') {
      thisOp = 'D';
    } else if (r !== '-' && c === '-') {
      thisOp = 'I';
    } else {
      thisOp = 'M';
    }

    if (thisOp === op) {
      count += 1;
    } else {
      if (op) {
        cigar += `${count}${op}`;
      }
      op = thisOp;
      count = 1;
    }
  }

  if (op) {
    cigar += `${count}${op}`;
  }

  return cigar;
}


async function generate_temp_family_fasta(accession) {
  const fam = await family.getFamilyWithConsensus(accession);
  if (!fam) {
    throw new Error(`No family found with accession ${accession}`);
  }

  fam.accessionAndVersion = `${fam.accession}.${fam.version || 0}`;
  const fastaContent = fasta.exportFasta(fam);

  const uniq_req_id = crypto.randomUUID();
  const fastaFile = path.join(config.apiserver.tmp_search_dir, `${accession}-${uniq_req_id}.fasta`);

  await fs.mkdir(config.apiserver.tmp_search_dir, { recursive: true });
  await fs.writeFile(fastaFile, fastaContent);

  return { fastaFile, familyName: fam.name || null };
}


function filter_by_depth(records, depthField = 'ref_start', endField = 'ref_end', maxDepth = 10) {
  const coverage = {}; // position => depth
  const accepted = [];

  for (const rec of records) {
    let exceeds = false;
    for (let pos = rec[depthField]; pos <= rec[endField]; pos++) {
      if ((coverage[pos] || 0) >= maxDepth) {
        exceeds = true;
        break;
      }
    }

    if (!exceeds) {
      accepted.push(rec);
      for (let pos = rec[depthField]; pos <= rec[endField]; pos++) {
        coverage[pos] = (coverage[pos] || 0) + 1;
      }
    }
  }

  return accepted;
}


/**
 * Runs rmblastn with provided arguments and parses the tabular output.
 *
 * @param {string[]} args - Command-line arguments to pass to rmblastn
 * @param {number} expectedFields - Number of expected tab-separated fields per line
 * @returns {Promise<Array<string[]>>} - A list of parsed lines, each a list of fields
 */
async function rmblastn_query(args, expectedFields = 10) {
  // Set environment to include BLASTMAT if needed
  const env = {
    ...process.env,
    BLASTMAT: config.rmblast_matrix_dir
  };

  return new Promise((resolve, reject) => {
    const blastnPath = config.rmblast_bin_dir + "/rmblastn";
    const runner = child_process.spawn(blastnPath, args, { env });

    let stdout = '';
    let stderr = '';

    runner.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    runner.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    runner.on('error', err => {
      reject(new Error(`Failed to start rmblastn: ${err.message}`));
    });

    runner.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`rmblastn exited with code ${code}\n${stderr}`));
      }

      const lines = stdout.trim().split('\n');
      const parsed = [];

      for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines
        const fields = line.trim().split('\t');
        if (fields.length !== expectedFields) {
          return reject(new Error(`Invalid line (expected ${expectedFields} fields):\n${line}`));
        }
        parsed.push(fields);
      }

      resolve(parsed);
    });
  });
}


/**
 * Searches the Dfam curated library for relationships between the input family
 * and other known families using rmblastn.
 *
 * @param {string} accession - Dfam family accession.
 * @returns {Promise<Array<{
 *   ref_start: number,
 *   ref_end: number,
 *   cons_start: number,
 *   cons_end: number,
 *   cons_len: number,
 *   orient: '+' | '-',
 *   name: string,
 *   score: number,
 *   ref_seq: string,
 *   cons_seq: string,
 *   qseq: string,
 *   sseq: string,
 *   color: string
 * }>>} Sorted and depth-filtered alignment records against curated Dfam families.
 */
async function dfam_relationship_search(accession) {
  // Step 1: Create FASTA file from Dfam consensus
  const { fastaFile, familyName } = await generate_temp_family_fasta(accession);

  // Step 2: Build rmblastn args
  const args = [
    '-db', config.dfam_curated_db,
    '-query', fastaFile,
    '-num_alignments', '300',  // Currently limited for brevity
    '-gapopen', '20',
    '-gapextend', '5',
    '-complexity_adjust',
    '-mask_level', '101',  // All hits up to num_alignments
    '-word_size', '7', // High sensitivity (if we have the compute resources)
    '-xdrop_ungap', '400',
    '-xdrop_gap_final', '200',
    '-xdrop_gap', '100',
    '-min_raw_gapped_score', '200',
    '-dust', 'no',
    '-outfmt', '6 score qstart qend sstrand sseqid sstart send slen qseq sseq',
    '-matrix', 'comparison.matrix',
    '-num_threads', '8'
  ];

  // Step 3: Run rmblastn query
  const raw = await rmblastn_query(args, 10);
  const assign_color = color_assigner_factory();

  // Step 4: Parse output lines
  const parsed = raw
    .filter(fields => {
      const sseqid = fields[4];
      const sseqidPrefix = sseqid.split('#')[0];
      return sseqidPrefix !== familyName;
    })
    .map(fields => {
    const [
      score, qstart, qend, sstrand, sseqid,
      sstart, send, slen, qseq, sseq
    ] = fields;

    const qstartNum = parseInt(qstart);
    const qendNum = parseInt(qend);
    const slenNum = parseInt(slen);

    let sstartNum = parseInt(sstart);
    let sendNum = parseInt(send);
    let strand = '+';
    if ( sstrand === 'minus' ) {
      // If sstrand is minus, we reverse the start and end
      [sstartNum, sendNum] = [sendNum, sstartNum];
      strand = '-';
    }
   
    const cigar = computeCigar(qseq, sseq);
    const ungapped_qseq = qseq.replace(/-/g, '')
    const ungapped_sseq = sseq.replace(/-/g, '')

    return {
      ref_start: Math.min(qstartNum, qendNum),
      ref_end: Math.max(qstartNum, qendNum),
      cons_start: Math.min(sstartNum, sendNum),
      cons_end: Math.max(sstartNum, sendNum),
      cons_len: slenNum,
      orient: strand,
      name: sseqid,
      score: parseFloat(score),
      ref_seq: accession,
      cons_seq: sseqid,
      qseq: ungapped_qseq,
      sseq: ungapped_sseq,
      cigar
    };
  });

  // Step 5: Sort by decreasing score
  parsed.sort((a, b) => b.score - a.score);

  // Step 6: Filter by max track depth 100
  const deduped = filter_by_depth(parsed, 'ref_start', 'ref_end', 100);

  // Step 7: (Optional) Chain alignments (stub for now)
  // TODO: Implement chaining logic if required
  const chained = deduped; // Placeholder: use deduped for now

  // Step 8: Assign deterministic color by subject ID (sseqid)
  const final = chained.map(hit => ({
    start: hit.ref_start,
    end: hit.ref_end,
    name: hit.name,
    color: assign_color(hit.cons_seq),
    strand: hit.orient,
    ostart: hit.cons_start,
    oend: hit.cons_end,
    osize: hit.cons_len,
    seq: hit.sseq,  // NOTE: For IGV we are using seq to represent the annotation sequence, and oseq to represent the reference sequence
    oseq: hit.qseq,
    cigar: hit.cigar 
  }));

  // Step 9: Cleanup temp FASTA
  try { await fs.unlink(fastaFile); } catch (err) { throw new Error(`Could not unlink file ${fastaFile}: ${err.message}`); }

  return final;
}


/**
 * Cluster overlapping or near-overlapping self-alignments into tandem clusters.
 *
 * Rules:
 * - Skips perfect full-length identity alignments (ref == cons)
 * - Skips symmetric duplicates (A→B and B→A)
 * - Clusters alignments starting within ±5 bp of each other if overlapping on cons
 * - Collapses clusters with ≥3 members into a synthetic "tandem_cluster"
 * - Otherwise, includes original alignments as-is
 *
 * @param {Array<Object>} alignments - List of alignment records with keys:
 *   ref_start, ref_end, cons_start, cons_end, score
 * @returns {Array<Object>} clustered and original alignments
 */
function clusterSelfAlignments(alignments) {
  // Step 1: Sort by ref_start ascending, then ref_end descending
  const sortedAligns = [...alignments].sort((a, b) => {
    if (a.ref_start !== b.ref_start) return a.ref_start - b.ref_start;
    return b.ref_end - a.ref_end;
  });

  const usedAligns = new Set(); // Used to skip symmetric or already-clustered pairs
  const results = [];

  // Step 2: Try to form clusters starting from each alignment
  for (let i = 0; i < sortedAligns.length; i++) {
    const align = sortedAligns[i];

    // Skip perfect self-alignment (identity across full range)
    if (align.ref_start === align.cons_start && align.ref_end === align.cons_end) {
      continue;
    }

    // Create keys for detecting duplicates (and symmetric versions)
    const key = `${align.ref_start},${align.ref_end},${align.cons_start},${align.cons_end}`;
    const keySym = `${align.cons_start},${align.cons_end},${align.ref_start},${align.ref_end}`;

    if (usedAligns.has(key) || usedAligns.has(keySym)) {
      continue;
    }

    let rangeMax = align.ref_end;
    const cluster = [align];
    const ends = [align.ref_end];

    // Step 3: Compare with all other alignments to find cluster members
    for (let j = 0; j < sortedAligns.length; j++) {
      if (j === i) continue;
      const other = sortedAligns[j];

      const otherKey = `${other.ref_start},${other.ref_end},${other.cons_start},${other.cons_end}`;
      const otherKeySym = `${other.cons_start},${other.cons_end},${other.ref_start},${other.ref_end}`;

      // Skip used or symmetric duplicates
      if (usedAligns.has(otherKey) || usedAligns.has(otherKeySym)) {
        continue;
      }

      // Skip perfect identity alignments
      if (other.ref_start === other.cons_start && other.ref_end === other.cons_end) {
        continue;
      }

      // Clustering rule:
      // - ref_start within ±5 bp of seed
      // - cons_start must precede ref_end (i.e. not downstream)
      if (
        other.ref_start > align.ref_start - 5 &&
        other.ref_start < align.ref_start + 5 &&
        other.cons_start < align.ref_end
      ) {
        cluster.push(other);
        ends.push(other.ref_end);
        if (other.ref_end > rangeMax) {
          rangeMax = other.ref_end;
        }
      }
    }

    // Step 4: Decide whether to collapse into a cluster or return members as-is
    if (cluster.length > 2) {
      let maxQuery = align.ref_end;

      // Mark members of the cluster as used and find maximum ref_end
      for (const other of cluster) {
        const okey = `${other.ref_start},${other.ref_end},${other.cons_start},${other.cons_end}`;
        const okeySym = `${other.cons_start},${other.cons_end},${other.ref_start},${other.ref_end}`;
        usedAligns.add(okey);
        usedAligns.add(okeySym);

        if (other.ref_end > maxQuery) {
          maxQuery = other.ref_end;
        }
      }

      // Emit a synthetic "tandem_cluster" record
      results.push({
        ref_start: align.ref_start,
        ref_end: maxQuery,
        cons_start: align.ref_start,
        cons_end: maxQuery,
        orient: '+',
        name: 'tandem_cluster',
        score: align.score,
        type: 'tandem',
        ends: ends,
      });
    } else {
      // For small clusters (1–2), just return the original alignments
      for (const other of cluster) {
        const okey = `${other.ref_start},${other.ref_end},${other.cons_start},${other.cons_end}`;
        const okeySym = `${other.cons_start},${other.cons_end},${other.ref_start},${other.ref_end}`;
        usedAligns.add(okey);
        usedAligns.add(okeySym);
        results.push(other);
      }
    }
  }

  return results;
}


/**
 * Performs a self-alignment using rmblastn to find internal repeats or tandem duplications.
 *
 * @param {string} accession - Dfam family accession.
 * @returns {Promise<Array<{
 *   ref_start: number,
 *   ref_end: number,
 *   cons_start: number,
 *   cons_end: number,
 *   cons_len: number,
 *   orient: '+' | '-',
 *   name: string,
 *   score: number,
 *   ref_seq: string,
 *   cons_seq: string,
 *   qseq: string,
 *   sseq: string,
 *   color: string,
 *   [key: string]: any
 * }>>} List of alignment records, possibly clustered and depth-filtered.
 */
async function self_search(accession) {
  // Step 1: Generate FASTA file and get filename
  const { fastaFile, familyName } = await generate_temp_family_fasta(accession);

  // Step 2: Construct rmblastn arguments
  const args = [
    '-subject', fastaFile,
    '-query', fastaFile,
    '-num_alignments', '9999999',
    '-gapopen', '20',
    '-gapextend', '5',
    '-complexity_adjust',
    '-mask_level', '101',
    '-word_size', '7',
    '-xdrop_ungap', '400',
    '-xdrop_gap_final', '200',
    '-xdrop_gap', '100',
    '-min_raw_gapped_score', '200',
    '-dust', 'no',
    '-outfmt', '6 score qstart qend sstrand sseqid sstart send slen qseq sseq',
    '-matrix', 'comparison.matrix'
  ];

  // Step 3: Run rmblastn
  const raw = await rmblastn_query(args, 10);
  //logger.info("raw: " + JSON.stringify(raw));
  const assign_color = color_assigner_factory();

  // Step 4: Parse output lines into alignment records
  const parsed = raw.map(fields => {
    const [
      score, qstart, qend, sstrand, sseqid,
      sstart, send, slen, qseq, sseq
    ] = fields;

    const qstartNum = parseInt(qstart);
    const qendNum = parseInt(qend);
    const slenNum = parseInt(slen);

    let sstartNum = parseInt(sstart);  
    let sendNum = parseInt(send);  
    let strand = '+';           
    if ( sstrand === 'minus' ) {                                                                                                                             
      // If sstrand is minus, we reverse the start and end                                                                                                   
      [sstartNum, sendNum] = [sendNum, sstartNum];
      strand = '-'; 
    }

    return {
      ref_start: Math.min(qstartNum, qendNum),
      ref_end: Math.max(qstartNum, qendNum),
      cons_start: Math.min(sstartNum, sendNum),
      cons_end: Math.max(sstartNum, sendNum),
      cons_len: slenNum,
      orient: strand,
      name: `${qstart}-${qend}_${sstart}-${send}`,
      score: parseFloat(score),
      ref_seq: sseqid,
      cons_seq: sseqid,
      qseq,
      sseq
    };
  });

  // Step 5: Remove perfect diagonal hits and exact reciprocal matches
  const filtered = parsed.filter(hit => {
    return !(hit.ref_start === hit.cons_start &&
             hit.ref_end === hit.cons_end &&
             hit.orient === '+');
  });
  //logger.info("filtered: " + JSON.stringify(filtered));

  // Step 6: Cluster tandem/redundant self-alignments
  const clustered = clusterSelfAlignments(filtered);
  //logger.info("clustered: " + JSON.stringify(clustered));

  // Step 7: Sort by decreasing score
  clustered.sort((a, b) => b.score - a.score);

  // Step 8: Filter by depth (max 10 hits covering any position)
  const deduped = filter_by_depth(clustered, 'ref_start', 'ref_end', 10);
  //logger.info("deduped: " + JSON.stringify(deduped));

  // Step 9: Assign deterministic color per alignment pair and remap names
  // TODO: There seems to be some confusion over 1/0-based ranges....clear this up and
  // fix examples in openAPI.yaml as well
  const final = deduped.map(hit => ({
    start: hit.ref_start,
    end: hit.ref_end,
    pstart: hit.ref_start,
    pend: hit.ref_end,
    sstart: hit.cons_start,
    send: hit.cons_end,
    strand: hit.orient,
    color: assign_color(hit.name)
  }));

  //logger.info("final: " + JSON.stringify(final));
  // Step 10: Cleanup temporary FASTA
  try { await fs.unlink(fastaFile); } catch (err) { throw new Error(`Could not unlink file ${fastaFile}: ${err.message}`); }

  return final;
}


/**
 * Runs blastx with provided arguments and parses the tabular output.
 *
 * @param {string[]} args - Command-line arguments for blastx
 * @param {number} expectedFields - Expected number of tab-separated fields per line
 * @returns {Promise<Array<string[]>>} - A list of field arrays parsed from stdout
 */
async function blastx_query(args, expectedFields = 10) {
  const env = {
    ...process.env,
    BLASTMAT: config.rmblast_matrix_dir
  };

  return new Promise((resolve, reject) => {
    const blastxPath = path.join(config.rmblast_bin_dir, "blastx");
    const runner = child_process.spawn(blastxPath, args, { env });

    let stdout = '';
    let stderr = '';

    runner.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    runner.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    runner.on('error', err => {
      reject(new Error(`Failed to start blastx: ${err.message}`));
    });

    runner.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`blastx exited with code ${code}\n${stderr}`));
      }

      const lines = stdout.trim().split('\n');
      const parsed = [];

      for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines
        const fields = line.trim().split('\t');
        if (fields.length !== expectedFields) {
          return reject(new Error(`Invalid line (expected ${expectedFields} fields):\n${line}`));
        }
        parsed.push(fields);
      }

      resolve(parsed);
    });
  });
}


function color_assigner_factory() {
  const colorMap = new Map();
  let colorIndex = 0;

  return function(name) {
    if (!colorMap.has(name)) {
      const color = DISTINCT_COLORS[colorIndex % DISTINCT_COLORS.length];
      colorMap.set(name, color);
      colorIndex++;
    }
    return colorMap.get(name);
  };
}


/**
 * Searches the RepeatPeps protein database using blastx to find protein-coding potential
 * within the family consensus sequence.
 *
 * @param {string} accession - Dfam family accession.
 * @returns {Promise<Array<{
 *   ref_start: number,
 *   ref_end: number,
 *   cons_start: number,
 *   cons_end: number,
 *   cons_len: number,
 *   orient: '+' | '-',
 *   name: string,
 *   score: number,
 *   ref_seq: string,
 *   cons_seq: string,
 *   oseq: string,
 *   color: string
 * }>>} List of blastx hits with filtered and color-coded records.
 */
async function protein_search(accession) {
  const { fastaFile, familyName } = await generate_temp_family_fasta(accession);

  const args = [
    '-db', config.repeat_peps_db,
    '-query', fastaFile,
    '-word_size', '2',
    '-outfmt', '6 evalue qseqid qstart qend qlen sseqid sstart send slen sseq',
    '-evalue', '0.001',
    '-num_threads', '8',
  ];

  let raw;
  try {
    raw = await blastx_query(args, 10);
  } catch (err) {
    throw new Error(`blastx_query failed: ${err.message}`);
  }

  const parsed = raw.map(fields => {
    const [
      evalue, qseqid, qstart, qend, qlen,
      sseqid, sstart, send, slen, oseq
    ] = fields;

    const qstartNum = parseInt(qstart);
    const qendNum = parseInt(qend);
    const sstartNum = parseInt(sstart);
    const sendNum = parseInt(send);
    const slenNum = parseInt(slen);

    return {
      ref_start: Math.min(qstartNum, qendNum),
      ref_end: Math.max(qstartNum, qendNum),
      cons_start: Math.min(sstartNum, sendNum),
      cons_end: Math.max(sstartNum, sendNum),
      cons_len: slenNum,
      orient: sstartNum <= sendNum ? '+' : '-',
      name: sseqid,
      score: parseFloat(evalue),
      ref_seq: qseqid,
      cons_seq: sseqid,
      oseq: oseq
    };
  });

  const filtered = filter_by_depth(parsed, 'ref_start', 'ref_end');

  const assign_color = color_assigner_factory();

  const final = filtered.map(hit => ({
    start: hit.ref_start,
    end: hit.ref_end,
    name: hit.name,
    score: hit.score,
    color: assign_color(hit.name),
    oChromStart: hit.cons_start,
    oChromEnd: hit.cons_end,
    oStrand: hit.orient,
    oChromSize: hit.cons_len,
    oSequence: hit.oseq
  }));

  try { await fs.unlink(fastaFile); } catch (err) { throw new Error(`Could not unlink file ${fastaFile}: ${err.message}`); }

  return final;
}


async function ultra_query(args) {
  const res = await new Promise((resolve, reject) => {
    const ultraPath = config.ultra_bin_dir + "/ultra";
    const runner = child_process.spawn(ultraPath, args);
    let data = '';
    let errorData = '';

    runner.on('error', err => {
      reject(new Error(`Failed to start ultra binary: ${err.message}`));
    });

    runner.stdout.on('data', chunk => {
      data += chunk.toString();
    });

    runner.stderr.on('data', chunk => {
      errorData += chunk.toString();
    });

    runner.on('close', code => {
      if (code !== 0) {
        reject(new Error(`ultra exited with code ${code}: ${errorData}`));
      } else {
        const results = data
          .trim()
          .split('\n')
          .map(line => line.trim())
          .map(line => {
            const regex = /^\S+\t(\d+)\t(\d+)\t\d+\t[\.\d]+\t(\S+)/; // Match start, end, and label
            const match = line.match(regex);

            if (!match) return null;

            const [, startStr, endStr, label] = match;
            return [parseInt(startStr, 10), parseInt(endStr, 10), label];
          })
          .filter(entry => entry !== null);  // remove non-matching lines
        resolve(results);
      }
    });
  });

  return res;
}


/**
 * Runs the ULTRA annotation tool on the consensus sequence of a given family accession.
 *
 * @param {string} accession - Dfam family accession.
 * @returns {Promise<Array<{
 *   ref_start: number,
 *   ref_end: number,
 *   name: string,
 *   color: string,
 *   strand: '+' | '-'
 * }>>} List of annotated feature records.
 */
async function ultra_search(accession) {
  const { fastaFile, familyName } = await generate_temp_family_fasta(accession);

  let results = await ultra_query([fastaFile, '--hs', '-t', '4']);

  const records = results.map(([start, end, label]) => ({
    ref_start: start,
    ref_end: end,
    name: label,
    color: 'blue',
    strand: '+'
  }));

  try { await fs.unlink(fastaFile); } catch (err) { throw new Error(`Could not unlink file ${fastaFile}: ${err.message}`); }

  const filtered = filter_by_depth(records, 'ref_start', 'ref_end');

  const final = filtered.map(hit => ({
    start: hit.ref_start,
    end: hit.ref_end,
    name: hit.name,
    color: hit.color,
    strand: hit.strand
  }));

  return final;

}

module.exports = {
  ultra_search,
  self_search,
  dfam_relationship_search,
  protein_search
};
