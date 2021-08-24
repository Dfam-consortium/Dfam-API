const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ncbi_gencode', {
    genetic_code_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    abbreviation: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    cde: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    starts: {
      type: DataTypes.STRING(80),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ncbi_gencode',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "genetic_code_id" },
        ]
      },
    ]
  });
};
