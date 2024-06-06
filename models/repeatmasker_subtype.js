/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('repeatmasker_subtype', {
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
      allowNull: true
    },
    parent_type_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    tableName: 'repeatmasker_subtype'
  });
};
