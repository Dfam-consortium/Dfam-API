/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('mask', {
    seq_accession: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'sequence',
        key: 'accession'
      }
    },
    seq_start: {
      type: DataTypes.INTEGER(10),
      allowNull: false
    },
    seq_end: {
      type: DataTypes.INTEGER(10),
      allowNull: false
    },
    repeat_str: {
      type: DataTypes.STRING(5),
      allowNull: false
    },
    repeat_length: {
      type: DataTypes.INTEGER(1),
      allowNull: false
    }
  }, {
    tableName: 'mask'
  });
};
