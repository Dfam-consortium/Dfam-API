/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('curation_state', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'curation_state'
  });
};
