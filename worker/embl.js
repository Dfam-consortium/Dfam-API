const family = require("./family");

module.exports = function embl_command(accession) {
  return family.getFamilyForAnnotation(accession).then(function(family) {
    if (family) {
      return exportEmbl(family);
    } else {
      return "";
    }
  });
};

function exportEmbl(family) {
  var emblStr = "";

  function add_header(code, text) {
    // TODO: Long text wrapping
    emblStr += code.padEnd(4);
    if (text) {
      emblStr += " " + text;
    }
    emblStr += "\n";
  }

  function add_XX() {
    emblStr += "XX\n";
  }

  // TODO: Check usage of name vs accession
  add_header("ID", family.accessionAndVersion + "     repeatmasker; DNA;  ???;  " + family.length + " BP.");
  add_header("CC", family.name + " DNA");
  add_XX();
  add_header("AC", family.accessionAndVersion);
  family.aliases.forEach(function(alias) {
    if (alias.db_id == "Repbase") {
      add_XX();
      add_header("DE", "RepbaseID: " + alias.db_link);
    }
  });

  add_XX();

  if (family.rmTypeName == "LTR") {
    add_header("KW", "Long terminal repeat of retrovirus-like element; " + family.name + ".");
  } else {
    add_header("KW", `${family.rmTypeName}/${family.rmSubTypeName}.`);
  }
  add_XX();

  if (family.citations.length) {
    family.citations.sort((a, b) => a.family_has_citation.order_added - b.family_has_citation.order_added);
    family.citations.forEach(function(citation) {
      if (citation.family_has_citation.comment) {
        add_header("RC", citation.family_has_citation.comment);
      }
      add_header("RN", `[${citation.family_has_citation.order_added}] (bases 1 to ${family.length})`);
      add_header("RA", citation.authors);
      add_header("RT", citation.title);
      add_header("RL", citation.journal);
    });

    add_XX();
  }

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
  // TODO: RepeatMasker Annotations: Description

  add_XX();

  const seq = family.consensus.toLowerCase();

  const counts = { "a": 0, "c": 0, "g": 0, "t": 0, "other": 0 };
  for (let i = 0; i < seq.length; i++) {
    let ch = seq[i];
    if (counts[ch] === undefined) {
      ch = "other";
    }
    counts[ch] += 1;
  }

  add_header("SQ", `Sequence ${seq.length} BP; ${counts.a} A; ${counts.c} C; ${counts.g} G; ${counts.t} T; ${counts.other} other;`);

  let i = 0;
  while (i < seq.length) {
    const chunk = seq.substring(i, i+60);
    i += 60;

    let j = 0;
    let line = "";
    while (j < chunk.length) {
      line += chunk.substring(j, j+10) + " ";
      j += 10;
    }

    emblStr += `      ${line.padEnd(66)} ${Math.min(i, seq.length)}\n`;
  }

  emblStr += "//\n";

  return emblStr;
}
