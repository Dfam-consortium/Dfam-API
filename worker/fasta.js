const family = require("./family");

module.exports = function fasta_command(accession) {
  return family.getFamilyWithConsensus(accession).then(function(family) {
    if (family) {
      return exportFasta(family);
    } else {
      return "";
    }
  });
};

function exportFasta(family) {
  var fastaStr = "";

  fastaStr += `>${family.accessionAndVersion} ${family.name}\n`;

  const seq = family.consensus.toLowerCase();

  let i = 0;
  while (i < seq.length) {
    const chunk = seq.substring(i, i+60);
    i += 60;

    fastaStr += chunk + "\n";
  }

  return fastaStr;
}
