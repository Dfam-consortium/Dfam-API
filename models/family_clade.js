const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_clade', {
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
    dfam_taxdb_tax_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A dfam_taxdb identifier",
      references: {
        model: 'dfam_taxdb',
        key: 'tax_id'
      }
    }
  }, {
    sequelize,
    tableName: 'family_clade',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
          { name: "dfam_taxdb_tax_id" },
        ]
      },
      {
        name: "family_id_index",
        using: "BTREE",
        fields: [
          { name: "family_id" },
        ]
      },
      {
        name: "dfam_taxdb_id_index",
        using: "BTREE",
        fields: [
          { name: "dfam_taxdb_tax_id" },
        ]
      },
    ]
  });
};
