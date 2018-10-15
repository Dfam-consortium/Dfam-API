/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('feature_attributes', {
    family_feature_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'family_feature',
        key: 'id'
      }
    },
    feature_name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: 'Null'
    },
    feature_value: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: 'Null'
    }
  }, {
    tableName: 'feature_attributes'
  });
};
