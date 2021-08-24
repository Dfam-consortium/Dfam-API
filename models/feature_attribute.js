const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('feature_attribute', {
    family_feature_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A family_feature identifier",
      references: {
        model: 'family_feature',
        key: 'id'
      }
    },
    attribute: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true,
      comment: "A free-form attribute for a feature"
    },
    value: {
      type: DataTypes.STRING(256),
      allowNull: true,
      comment: "The feature’s attribute value."
    }
  }, {
    sequelize,
    tableName: 'feature_attribute',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_feature_id" },
          { name: "attribute" },
        ]
      },
    ]
  });
};
