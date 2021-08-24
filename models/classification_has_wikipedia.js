const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('classification_has_wikipedia', {
    classification_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'classification',
        key: 'id'
      }
    },
    auto_wiki: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'wikipedia',
        key: 'auto_wiki'
      }
    }
  }, {
    sequelize,
    tableName: 'classification_has_wikipedia',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "classification_id" },
          { name: "auto_wiki" },
        ]
      },
      {
        name: "auto_wiki",
        using: "BTREE",
        fields: [
          { name: "auto_wiki" },
        ]
      },
      {
        name: "fk_classification_has_wikipeida_classificaiton1_idx",
        using: "BTREE",
        fields: [
          { name: "classification_id" },
        ]
      },
    ]
  });
};
