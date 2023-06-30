const wrap = require('word-wrap');

function annotateHmm(family, hmm) {
  const lines = hmm.split(/\r?\n/);
  const result = [];

  function add_header(code, text, wraptext) {
    if (!text) {
      return;
    }
    if (wraptext) {
      text = wrap(text, { width: 72, indent: '', trim: true });
    }
    text.split("\n").forEach(function(line) {
      result.push(code.padEnd(6) + line);
    });
  }

  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("HMMER3") !== -1) {
      result.push(lines[i]);
      add_header("NAME", family.name || family.accession);
      add_header("ACC", family.accessionAndVersion);
      add_header("DESC", family.title);
    } else if (lines[i].indexOf("NAME") !== -1 ||
               lines[i].indexOf("ACC") !== -1 ||
               lines[i].indexOf("DESC") !== -1) {
      // Skip; correct version of this line was added already
    } else if (lines[i].indexOf("CKSUM") !== -1) {
      result.push(lines[i]);

      const general_threshold = family.hmm_general_threshold;
      if (general_threshold) {
        const cutoff_string = general_threshold.toFixed(2) + ";";
        add_header("GA", cutoff_string);
        add_header("TC", cutoff_string);
        add_header("NC", cutoff_string);
      }

      family.family_assembly_data.forEach(function(fam_asm) {
        let id = fam_asm.assembly.dfam_taxdb.tax_id;
        let name = fam_asm.assembly.dfam_taxdb.scientific_name;
        let ga = fam_asm.hmm_hit_GA.toFixed(2);
        let tc = fam_asm.hmm_hit_TC.toFixed(2);
        let nc = fam_asm.hmm_hit_NC.toFixed(2);
        let fdr = fam_asm.hmm_fdr.toFixed(3);
        add_header("TH", `TaxId:${id}; TaxName:${name}; GA:${ga}; TC:${tc}; NC:${nc}; fdr:${fdr};`);
      });

      // TODO: BM build method  -- not standardized yet
      // TODO: SM search method -- not standardized yet
      add_header("CT", family.classification.lineage.replace(/^root;/, ''), true);
      family.clades.forEach(function(clade) {
        add_header("MS", `TaxId:${clade.tax_id} TaxName:${clade.sanitized_name}`);
      });
      add_header("CC", family.description, true);
      add_header("CC", "RepeatMasker Annotations:");
      add_header("CC", "     Type: " + family.rmTypeName);
      add_header("CC", "     SubType: " + family.rmSubTypeName);
      add_header("CC", "     Species: " + family.clades.map(c => c.sanitized_name).join(", "));
      add_header("CC", "     SearchStages: " + family.search_stages.map(ss => ss.id).join(","));
      let buffer_stages = [];
      family.buffer_stages.forEach(function(bs) {
        const start = bs.family_has_buffer_stage.start_pos;
        const end = bs.family_has_buffer_stage.end_pos;

        if (start || end) {
          buffer_stages.push(`${bs.id}[${start}-${end}]`);
        } else {
          buffer_stages.push(bs.id);
        }
      });
      add_header("CC", "     BufferStages: " + buffer_stages.join(","));
      if (family.refineable) {
        add_header("CC", "     Refineable");
      }
    } else {
      result.push(lines[i]);
    }
  }

  return result.join("\n");
}

module.exports = {
  annotateHmm
};

