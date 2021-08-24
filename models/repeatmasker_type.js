const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('repeatmasker_type', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Surrogate identifier - auto indexed"
    },
    name: {
      type: DataTypes.STRING(25),
      allowNull: false,
      comment: "Repeatmasker TE type name",
      unique: "name_UNIQUE"
    },
    description: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "Repeatmasker TE type description"
    }
  }, {
    sequelize,
    tableName: 'repeatmasker_type',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "name_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
    ]
  });
};
