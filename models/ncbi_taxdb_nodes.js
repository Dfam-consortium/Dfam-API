const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ncbi_taxdb_nodes', {
    tax_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    parent_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    rank: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    embl_code: {
      type: DataTypes.STRING(4),
      allowNull: true
    },
    division_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    inherited_div: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    genetic_code_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    inherited_GC: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    mitochondrial_genetic_code_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    inherited_MGC_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    GenBank_hidden_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    hidden_subtree_root_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    comments: {
      type: DataTypes.BLOB,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ncbi_taxdb_nodes',
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
      {
        name: "tax_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "tax_id" },
        ]
      },
      {
        name: "ix_ncbi_taxdb_nodes_new_parent_id",
        using: "BTREE",
        fields: [
          { name: "parent_id" },
        ]
      },
    ]
  });
};
