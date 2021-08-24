const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_has_citation', {
    family_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A Dfam family identifier",
      references: {
        model: 'family',
        key: 'id'
      }
    },
    citation_pmid: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Pubmed Identifier — details cached in Citation table.",
      references: {
        model: 'citation',
        key: 'pmid'
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Not used currently"
    },
    order_added: {
      type: DataTypes.TINYINT,
      allowNull: true,
      comment: "Order that a citation was added to a family starting from 1.  Used to preserve display order."
    }
  }, {
    sequelize,
    tableName: 'family_has_citation',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
          { name: "citation_pmid" },
        ]
      },
      {
        name: "fk_family_has_citation_citation1_idx",
        using: "BTREE",
        fields: [
          { name: "citation_pmid" },
        ]
      },
    ]
  });
};
