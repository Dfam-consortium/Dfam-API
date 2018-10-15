/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('model_to_rmlib', {
    accession: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: '0'
    }
  }, {
    tableName: 'model_to_rmlib'
  });
};
