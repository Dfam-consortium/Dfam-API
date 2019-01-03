/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('hmm_full_region', {
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
      allowNull: true
    },
    seq_end: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    strand: {
      type: DataTypes.ENUM('+','-'),
      allowNull: true
    },
    ali_start: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    ali_end: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    model_start: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: true
    },
    model_end: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: true
    },
    hit_bit_score: {
      type: "DOUBLE",
      allowNull: true
    },
    hit_evalue_score: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    nrph_hit: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0'
    },
    divergence: {
      type: "DOUBLE",
      allowNull: true
    }
  }, {
    tableName: 'hmm_full_region'
  });
};
