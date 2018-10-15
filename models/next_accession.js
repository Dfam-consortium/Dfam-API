/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('next_accession', {
    next_acc_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'next_accession'
  });
};
