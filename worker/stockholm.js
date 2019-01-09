const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const zlib = require("zlib");
const mapFields = require("../utils/mapFields.js");

const familyModel = require("../models/family.js")(conn, Sequelize);
const seedRegionModel = require("../models/seed_region.js")(conn, Sequelize);
seedRegionModel.removeAttribute('id');
familyModel.hasMany(seedRegionModel, { foreignKey: 'family_id' });

module.exports = function stockholm_command(accession) {
  return familyModel.findOne({
    attributes: [ "id", "name", "description" ],
    where: { accession },
  }).then(function(family) {
    if (family) {
      return seedRegionModel.findAll({
        where: { family_id: family.id },
      }).then(function(seed_regions) {
        family.seed_regions = seed_regions;

        const stockholm = seedRegionsToStockholm(family);
        return zlib.gzipSync(stockholm);
      });
    } else {
      return "";
    }
  });
};

// TODO: Move this to Dfam-js?
// TODO: Annotate output
//
// Converts a DFAM family to Stockholm data.
// Expected format: family = {
//  "name": "Name",
//  "description: "Description",
//  "seed_regions": [
//    { a2m_seq: "sequence1" },
//    { a2m_seq: "sequence2" },
//    ...
//  ],
// }
//
// *Synchronously* generates and returns the stockholm-formatted output.
function seedRegionsToStockholm(family) {
  if (family == null || family.seed_regions == null || family.seed_regions.length == 0) {
    return Promise.resolve(null);
  }

  var seedRegions = family.seed_regions;

  var insLocs = {};
  var insRE = /([a-z]+)/g;
  var matches;
  var matchColCnt = -1;
  var stockholmSeqs = [];

  seedRegions.forEach(function(region) {
    stockholmSeqs.push(region.a2m_seq);
    // Create a non-gap RF line with the correct match column length
    if (matchColCnt < 0)
      matchColCnt = (region.a2m_seq.match(/[A-Z-]/g) || []).length;
    var prevLen = 0;
    while ((matches = insRE.exec(region.a2m_seq)) != null) {
      var len = matches[1].length;
      var idx = insRE.lastIndex - len - prevLen;
      if (insLocs[idx] == null || insLocs[idx] < len)
        insLocs[idx] = len;
      prevLen += len;
    }
  });

  var stockholmStr = "# STOCKHOLM 1.0\n" +
    "#=GF ID " + family.name + "\n";
  if (family.description != null)
    stockholmStr += "#=GF CC " + family.description + "\n";
  stockholmStr += "#=GF SQ " + seedRegions.length + "\n";

  // Sort highest indexes first so we can insert without affecting
  // future indices.
  var RF = "";
  RF += "X".repeat(matchColCnt);
  var sortedIdxs = Object.keys(insLocs).sort(function(a, b) {
    return b - a;
  });
  sortedIdxs.forEach(function(idx) {
    var insStr = "";
    insStr += ".".repeat(insLocs[idx]);
    RF = RF.substring(0, idx) + insStr + RF.substring(idx);
  });

  stockholmStr += "#=GC RF " + RF + "\n";

  for (var i = 0; i < stockholmSeqs.length; i++) {
    var seq = stockholmSeqs[i];
    var j = 0;
    var refPos = 0;
    var tmpSeq = "";
    while (j < seq.length) {
      var ref = RF[refPos];
      var seqBase = seq[j];
      if (ref == ".") {
        if (seqBase == "-" || (seqBase >= 'A' && seqBase <= 'Z')) {
          // emit a placeholder "."
          tmpSeq += '.';
        } else {
          // else keep the current character
          tmpSeq += seqBase;
          j++;
        }
      } else {
        tmpSeq += seqBase;
        j++;
      }
      refPos++;
    }
    stockholmSeqs[i] = tmpSeq.replace(/-/g, ".").toUpperCase();
    stockholmStr += seedRegions[i].seq_id + "  " + stockholmSeqs[i] + "\n";
  }

  stockholmStr += "//\n";
  return stockholmStr;
}
