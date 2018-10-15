/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ncbi_taxdb_nodes', {
    tax_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      unique: true
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
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    genetic_code_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    inherited_GC: {
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    mitochondrial_genetic_code_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    inherited_MGC_flag: {
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    GenBank_hidden_flag: {
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    hidden_subtree_root_flag: {
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    comments: {
      type: "BLOB",
      allowNull: true
    }
  }, {
    tableName: 'ncbi_taxdb_nodes'
  });
};
