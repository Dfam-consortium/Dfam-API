const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const zlib = require("zlib");

const family = require("./family");

const familyModel = require("../models/family.js")(conn, Sequelize);
const seedRegionModel = require("../models/seed_region.js")(conn, Sequelize);

seedRegionModel.removeAttribute('id');

familyModel.hasMany(seedRegionModel, { foreignKey: 'family_id' });

module.exports = function stockholm_command(accession) {
  return family.getFamilyForAnnotation(accession).then(function(family) {
    if (family) {
      return seedRegionModel.findAll({
        where: { family_id: family.id },
      }).then(function(seed_regions) {
        family.seed_regions = seed_regions;

        const stockholm = seedRegionsToStockholm(family);
        if (stockholm) {
          return zlib.gzipSync(stockholm);
        } else {
          return "";
        }
      });
    } else {
      return "";
    }
  });
};

// TODO: Move this to Dfam-js?
//
// Converts a DFAM family to Stockholm data.
// Expected format: family = {
//  "name": "Name",
//  "description: "Description",
//  "seed_regions": [
//    { a3m_seq: "sequence1" },
//    { a3m_seq: "sequence2" },
//    ...
//  ],
// }
//
// *Synchronously* generates and returns the stockholm-formatted output.
function seedRegionsToStockholm(family) {
  if (family == null || family.seed_regions == null || family.seed_regions.length == 0) {
    return null;
  }

  var seedRegions = family.seed_regions;

  var insLocs = {};
  var insRE = /([a-z]+)/g;
  var matches;
  var matchColCnt = -1;
  var stockholmSeqs = [];

  seedRegions.forEach(function(region) {
    stockholmSeqs.push(region.a3m_seq);
    // Create a non-gap RF line with the correct match column length
    if (matchColCnt < 0)
      matchColCnt = (region.a3m_seq.match(/[A-Z-]/g) || []).length;
    var prevLen = 0;
    while ((matches = insRE.exec(region.a3m_seq)) != null) {
      var len = matches[1].length;
      var idx = insRE.lastIndex - len - prevLen;
      if (insLocs[idx] == null || insLocs[idx] < len)
        insLocs[idx] = len;
      prevLen += len;
    }
  });

  var stockholmStr = "# STOCKHOLM 1.0\n";
  function add_header(code, text) {
    // TODO: Long text wrapping
    stockholmStr += "#=GF " + code + " " + text + "\n";
  }
  add_header("ID", family.name);

  add_header("AC", family.accessionAndVersion);
  if (family.title != null) {
    add_header("DE", family.title);
  }
  add_header("AU", family.author);

  add_header("TP", family.classification.lineage.replace(/^root;/, ''));

  family.clades.forEach(function(clade) {
    add_header("OC", `${clade.sanitized_name}`);
  });

  family.citations.sort((a, b) => a.family_has_citation.order_added - b.family_has_citation.order_added);
  family.citations.forEach(function(citation) {
    if (citation.family_has_citation.comment) {
      add_header("RC", citation.family_has_citation.comment);
    }
    add_header("RN", "[" + citation.family_has_citation.order_added + "]");
    add_header("RM", citation.pmid);
    add_header("RT", citation.title);
    add_header("RA", citation.authors);
    add_header("RL", citation.journal);
  });

  family.aliases.forEach(function(alias) {
    add_header("DR", alias.db_id + "; " + alias.db_link + ";");
    if (alias.comment) {
      add_header("DC", alias.comment);
    }
  });

  add_header("SQ", seedRegions.length);

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
