const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('curation_state', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Primary key curation statuses"
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "The name of a curation state"
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "A short description of a curation state\n"
    }
  }, {
    sequelize,
    tableName: 'curation_state',
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
    ]
  });
};
