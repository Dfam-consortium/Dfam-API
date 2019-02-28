/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('db_version', {
    dfam_version: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true
    },
    dfam_release_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true
    }
  }, {
    tableName: 'db_version'
  });
};
