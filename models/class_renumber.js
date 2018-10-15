/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('class_renumber', {
    rowNumber: {
      type: "DOUBLE",
      allowNull: true
    },
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'class_renumber'
  });
};
