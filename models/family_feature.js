/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_feature', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    feature_type: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    model_start_pos: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    model_end_pos: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    }
  }, {
    tableName: 'family_feature'
  });
};
