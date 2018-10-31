/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('version', {
    dfam_version: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    build_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nhmmer_version: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  }, {
    tableName: 'version'
  });
};
