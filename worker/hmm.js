const Sequelize = require("sequelize");
const conn = require("../databases.js").dfam;
const zlib = require("zlib");

const family = require("./family");

const familyModel = require("../models/family.js")(conn, Sequelize);
const hmmModelDataModel = require("../models/hmm_model_data.js")(conn, Sequelize);
familyModel.hasOne(hmmModelDataModel, { foreignKey: 'family_id' });

module.exports = function hmm_command(accession) {
  return family.getFamilyForAnnotation(accession).then(function(family) {
    if (family) {
      return hmmModelDataModel.findOne({
        attributes: [ "hmm" ],
        where: { family_id: family.id }
      }).then(function(hmm_data) {
        return zlib.gzipSync(annotateHmm(family, zlib.gunzipSync(hmm_data.hmm).toString()));
      });
    } else {
      return "";
    }
  });
};

function annotateHmm(family, hmm) {
  const lines = hmm.split(/\r?\n/);
  const result = [];

  function add_header(code, text) {
    // TODO: Long text wrapping
    text.split("\n").forEach(function(line) {
      result.push(code.padEnd(6) + line);
    });
  }

  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("NAME") !== -1) {
      result.push(lines[i]);
      add_header("ACC", family.accessionAndVersion);
      add_header("DESC", family.description);
    } else if (lines[i].indexOf("CKSUM") !== -1) {
      result.push(lines[i]);

      let general_cutoff = null;
      family.family_assembly_data.forEach(function(fam_asm) {
        general_cutoff = Math.max(general_cutoff || fam_asm.hmm_hit_TC, fam_asm.hmm_hit_TC);
      });

      if (general_cutoff !== null) {
        const cutoff_string = general_cutoff.toFixed(2) + ";";
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

      // TODO: BM build method
      // TODO: SM search method
      family.clades.forEach(function(clade) {
        add_header("MS", `TaxId:${clade.tax_id} TaxName:${clade.sanitized_name}`);
      });
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
    } else {
      result.push(lines[i]);
    }
  }

  return result.join("\n");
}
