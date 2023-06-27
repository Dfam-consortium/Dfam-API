const process = require("process");

const winston = require("winston");

const family = require("./family");
const util = require("./util");

module.exports = async function fasta_command(output) {
  await util.forEachLine(process.stdin, async function(accession) {
    const fam = await family.getFamilyWithConsensus(accession);
    if (fam) {
      output.write(exportFasta(fam));
    } else {
      winston.error(`Missing family for accession: ${accession}`);
    }
  });
};

function exportFasta(family) {
  var fastaStr = ">";

  fastaStr += family.accessionAndVersion;
  if (family.name) {
    fastaStr += " ";
    fastaStr += family.name;
  }
  fastaStr += "\n";

  const seq = family.consensus.toLowerCase();

  let i = 0;
  while (i < seq.length) {
    const chunk = seq.substring(i, i+60);
    i += 60;

    fastaStr += chunk + "\n";
  }

  return fastaStr;
}
