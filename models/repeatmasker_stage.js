/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('repeatmasker_stage', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(25),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(128),
      allowNull: false
    }
  }, {
    tableName: 'repeatmasker_stage'
  });
};
