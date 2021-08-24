const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ncbi_taxdb_names', {
    tax_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    name_txt: {
      type: DataTypes.STRING(256),
      allowNull: false,
      primaryKey: true
    },
    unique_name: {
      type: DataTypes.STRING(256),
      allowNull: false,
      primaryKey: true
    },
    name_class: {
      type: DataTypes.STRING(256),
      allowNull: false,
      primaryKey: true
    },
    sanitized_name: {
      type: DataTypes.STRING(256),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ncbi_taxdb_names',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "tax_id" },
          { name: "name_txt" },
          { name: "unique_name" },
          { name: "name_class" },
        ]
      },
      {
        name: "ix_ncbi_taxdb_names_new_unique_name",
        using: "BTREE",
        fields: [
          { name: "unique_name" },
        ]
      },
      {
        name: "ix_ncbi_taxdb_names_new_name_class",
        using: "BTREE",
        fields: [
          { name: "name_class" },
        ]
      },
      {
        name: "ix_ncbi_taxdb_names_new_tax_id",
        using: "BTREE",
        fields: [
          { name: "tax_id" },
        ]
      },
      {
        name: "ix_ncbi_taxdb_names_new_sanitized_name",
        using: "BTREE",
        fields: [
          { name: "sanitized_name" },
        ]
      },
      {
        name: "ix_ncbi_taxdb_names_new_name_txt",
        using: "BTREE",
        fields: [
          { name: "name_txt" },
        ]
      },
    ]
  });
};
