const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('citation', {
    pmid: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Article title ( culled from PubMed )."
    },
    authors: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Article authors ( culled from PubMed )."
    },
    journal: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Journal title ( culled from PubMed )."
    },
    pubdate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "Publication date ( culled from PubMed )."
    }
  }, {
    sequelize,
    tableName: 'citation',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "pmid" },
        ]
      },
    ]
  });
};
