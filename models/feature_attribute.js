/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('feature_attribute', {
    family_feature_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family_feature',
        key: 'id'
      }
    },
    attribute: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true
    },
    value: {
      type: DataTypes.STRING(512),
      allowNull: true
    }
  }, {
    tableName: 'feature_attribute'
  });
};
