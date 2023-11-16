/*
 * Export a family in FASTA format
 *
 */
function exportFasta(family) {
  var fastaStr = ">";

  fastaStr += family.accessionAndVersion;
  if (family.name) {
    fastaStr += " ";
    fastaStr += family.name;
  }
  fastaStr += "\n";

  // RMH: 6/30/23 - Switched default case to uppercase.
  const seq = family.consensus.toUpperCase();

  let i = 0;
  while (i < seq.length) {
    const chunk = seq.substring(i, i+60);
    i += 60;

    fastaStr += chunk + "\n";
  }

  return fastaStr;
}

module.exports = {
  exportFasta
};

