const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('repeatmasker_stage', {
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
      comment: "Repeatmasker stage name",
      unique: "name_UNIQUE"
    },
    description: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: "Short description of a RepeatMasker stage"
    }
  }, {
    sequelize,
    tableName: 'repeatmasker_stage',
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
      {
        name: "id_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
