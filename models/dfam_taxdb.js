const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('dfam_taxdb', {
    tax_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A ncbi_taxdb_nodes identifier"
    },
    scientific_name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: "The scientific name of the organism ( from NCBI )"
    },
    sanitized_name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: "The sanitized name of the organism ( internally created - TODO: explain )"
    },
    common_name: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "The common name for the species, if one is defined ( from NCBI )"
    },
    unique_name: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "This is populated when there is a name clash and represents a unique_version of name_txt ( from NCBI )"
    },
    lineage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "A semicolon delimited list of clades from the tree root to the organism"
    }
  }, {
    sequelize,
    tableName: 'dfam_taxdb',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "tax_id" },
        ]
      },
    ]
  });
};
