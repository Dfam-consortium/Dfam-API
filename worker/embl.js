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
    emblStr += code.padEnd(6);
    if (text) {
      emblStr += " " + text;
    }
    emblStr += "\n";
  }

  // TODO: Check usage of name vs accession
  add_header("ID", family.accession + "     repeatmasker; DNA;  ???;  " + family.length + " BP.");
  add_header("CC", family.name + " DNA");
  add_header("XX");
  add_header("AC", family.accession);
  family.aliases.forEach(function(alias) {
    if (alias.db_id == "Repbase") {
      add_header("XX");
      add_header("DE", "RepbaseID: " + alias.db_link);
    }
  });

  add_header("XX");
  if (family.classification.rm_type.name == "LTR") {
    add_header("KW", "Long terminal repeat of retrovirus-like element; " + family.name);
  } else {
    add_header("KW", `${family.classification.rm_type.name}/${family.classification.rm_subtype.name}.`);
  }
  add_header("XX");

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

  add_header("XX");

  add_header("CC", "RepeatMasker Annotations:");
  add_header("CC", "     Type: " + family.classification.rm_type.name);
  add_header("CC", "     SubType: " + family.classification.rm_subtype.name);
  family.clades.forEach(function(clade) {
    add_header("CC", "     Species: " + clade.sanitized_name);
  });
  add_header("CC", "     SearchStages: " + family.search_stages.map(ss => ss.id).join(","));
  let buffer_stages = [];
  family.buffer_stages.forEach(function(bs) {
    if (bs.start_pos || bs.end_pos) {
      buffer_stages.push(`${bs.id}[${bs.start_pos}-${bs.end_pos}]`);
    } else {
      buffer_stages.push(bs.id);
    }
  });
  add_header("CC", "     BufferStages: " + buffer_stages.join(","));
  if (family.refineable) {
    add_header("CC", "     Refineable");
  }
  // TODO: RepeatMasker Annotations: Description

  add_header("XX");

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
