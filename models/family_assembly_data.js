const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_assembly_data', {
    family_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A Dfam family identifier",
      references: {
        model: 'family',
        key: 'id'
      }
    },
    assembly_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'assembly',
        key: 'id'
      }
    },
    cons_genome_avg_kimura_div_GA: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Kimura average divergence calculated on Consensus derived annotations scoring at or above the gathering threshold (GA).  The divergence is calculated using Kimura Divergence formula using a modification that accounts for substitutions at CpG sites in a new way:   transitions in a CpG site are counted as 1\/10 of a transition and two transitions are counted as 1. Transversions in CpG sites are unaffected. The divergence is calculated as a substitutions\/matches ( gaps are not included )."
    },
    cons_genome_avg_kimura_div_TC: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Kimura average divergence calculated on Consensus derived annotations scoring at or above the trusted cutoff (TC).  The divergence is calculated using Kimura Divergence formula using a modification that accounts for substitutions at CpG sites in a new way:   transitions in a CpG site are counted as 1\/10 of a transition and two transitions are counted as 1. Transversions in CpG sites are unaffected. The divergence is calculated as a substitutions\/matches ( gaps are not included )."
    },
    hmm_genome_avg_kimura_div_GA: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Kimura average divergence calculated on HMM derived Non-redundant annotations scoring at or above the gathering threshold (GA).  The divergence is calculated using Kimura Divergence formula using a modification that accounts for substitutions at CpG sites in a new way:   transitions in a CpG site are counted as 1\/10 of a transition and two transitions are counted as 1. Transversions in CpG sites are unaffected. The divergence is calculated as a substitutions\/matches ( gaps are not included )."
    },
    hmm_genome_avg_kimura_div_TC: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Kimura average divergence calculated on HMM derived Non-redundant annotations scoring at or above the trusted cutoff (TC).  The divergence is calculated using Kimura Divergence formula using a modification that accounts for substitutions at CpG sites in a new way:   transitions in a CpG site are counted as 1\/10 of a transition and two transitions are counted as 1. Transversions in CpG sites are unaffected. The divergence is calculated as a substitutions\/matches ( gaps are not included )."
    },
    cons_GA_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    cons_TC_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    cons_GA_nrph_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    cons_TC_nrph_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    hmm_GA_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    hmm_TC_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    hmm_GA_nrph_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    hmm_TC_nrph_hit_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    hmm_hit_GA: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    hmm_hit_GA_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    hmm_hit_TC: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    hmm_hit_TC_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    hmm_hit_NC: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    hmm_hit_NC_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    hmm_fdr: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    hmm_method_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "Link to the method used to obtain the HMM data"
    },
    cons_fdr: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    cons_method_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "Link to method used to obtain the consensus data"
    },
    cons_35GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "Experimental: Consensus gathering threshold in 35% GC isochore for the family default matrix divergence."
    },
    cons_37GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_39GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_41GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_43GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_45GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_47GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_49GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_51GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_53GC_GA: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    cons_matrix_div: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "The chosen divergence for selecting consensus search matrices for this family in this assembly. \n"
    },
    hmm_avg_hit_length: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "The average length of HMM Non-redundant hits ( annotations ) scoring at or above the GA threshold."
    },
    cons_avg_hit_length: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "The average length of Consensus hits ( annotations ) scoring at or above the GA threshold."
    },
    hmm_thresh_search_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true,
      comment: "The E-value used to generate hit data for the threshold calculations (GA,NC,TC).  This is typically fixed per-family but could vary also by assembly.  Typical range is 20-1000."
    }
  }, {
    sequelize,
    tableName: 'family_assembly_data',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
          { name: "assembly_id" },
        ]
      },
      {
        name: "family_assembly_data_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
          { name: "assembly_id" },
        ]
      },
      {
        name: "fk_family_assembly_data_assembly1_idx",
        using: "BTREE",
        fields: [
          { name: "assembly_id" },
        ]
      },
    ]
  });
};
