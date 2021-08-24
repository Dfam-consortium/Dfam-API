const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_feature', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Surrogate identifier - auto indexed"
    },
    family_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "A Dfam family identifier",
      references: {
        model: 'family',
        key: 'id'
      }
    },
    feature_type: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "Type of feature present in this family ( e.g ’CDS’ )"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Freeform description of the feature"
    },
    model_start_pos: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "Start position of the feature ( 1-based )"
    },
    model_end_pos: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "End position of the feature ( fully-closed )"
    },
    label: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'family_feature',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "fk_family_feature_family1_idx",
        using: "BTREE",
        fields: [
          { name: "family_id" },
        ]
      },
    ]
  });
};
