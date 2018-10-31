/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('model_chromosome_count', {
    family_accession: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    seq_accession: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'sequence',
        key: 'accession'
      }
    },
    chr_cnt: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      defaultValue: '0'
    },
    nrph_chr_cnt: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    label: {
      type: DataTypes.STRING(5),
      allowNull: false
    }
  }, {
    tableName: 'model_chromosome_count'
  });
};
