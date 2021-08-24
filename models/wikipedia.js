const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('wikipedia', {
    auto_wiki: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    wikitext: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'wikipedia',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "auto_wiki" },
        ]
      },
      {
        name: "UQ_wikipedia_1",
        using: "BTREE",
        fields: [
          { name: "title", length: 100 },
        ]
      },
    ]
  });
};
