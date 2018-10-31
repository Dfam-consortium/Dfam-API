/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('hmm_benchmark_region', {
    seq_accession: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'sequence',
        key: 'accession'
      }
    },
    family_accession: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    seq_start: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0'
    },
    seq_end: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0'
    },
    strand: {
      type: DataTypes.ENUM('+','-'),
      allowNull: false
    },
    ali_start: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ali_end: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    model_start: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    model_end: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    hit_bit_score: {
      type: "DOUBLE(8,2)",
      allowNull: false,
      defaultValue: '0.00'
    },
    hit_evalue_score: {
      type: DataTypes.STRING(15),
      allowNull: false
    }
  }, {
    tableName: 'hmm_benchmark_region'
  });
};
