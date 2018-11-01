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
    feature_name: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true
    },
    feature_value: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  }, {
    tableName: 'feature_attribute'
  });
};
