/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_feature', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    feature_type: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: 'Null'
    },
    model_start_pos: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: 'Null'
    },
    model_end_pos: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: 'Null'
    }
  }, {
    tableName: 'family_feature'
  });
};
