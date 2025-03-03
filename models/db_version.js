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
    },
    total_families: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    curated_families: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    species: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    }
  }, {
    tableName: 'db_version'
  });
};
