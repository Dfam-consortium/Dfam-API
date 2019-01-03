/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_assembly_data', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    assembly_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'assembly',
        key: 'id'
      }
    },
    cons_genome_avg_kimura_div_GA: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    cons_genome_avg_kimura_div_TC: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    hmm_genome_avg_kimura_div_GA: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    hmm_genome_avg_kimura_div_TC: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    cons_GA_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    cons_TC_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    cons_GA_nrph_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    cons_TC_nrph_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    hmm_GA_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    hmm_TC_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    hmm_GA_nrph_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    hmm_TC_nrph_hit_count: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    hmm_hit_GA: {
      type: "DOUBLE",
      allowNull: true
    },
    hmm_hit_GA_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    hmm_hit_TC: {
      type: "DOUBLE",
      allowNull: true
    },
    hmm_hit_TC_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    hmm_hit_NC: {
      type: "DOUBLE",
      allowNull: true
    },
    hmm_hit_NC_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    hmm_fdr: {
      type: "DOUBLE",
      allowNull: true
    },
    hmm_method_id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_fdr: {
      type: "DOUBLE",
      allowNull: true
    },
    cons_method_id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_35GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_37GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_39GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_41GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_43GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_45GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_47GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_49GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_51GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_53GC_GA: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_matrix_div: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    hmm_avg_hit_length: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    cons_avg_hit_length: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    hmm_thresh_search_evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    }
  }, {
    tableName: 'family_assembly_data'
  });
};
