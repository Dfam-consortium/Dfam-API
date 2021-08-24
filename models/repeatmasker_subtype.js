const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('repeatmasker_subtype', {
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
      unique: "name"
    },
    description: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    parent_type_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'repeatmasker_subtype',
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
        name: "name",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "id_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "id",
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
