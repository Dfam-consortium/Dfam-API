const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('source_method', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Primary key family source methods"
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "Name of the source method."
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Short description of the source method."
    }
  }, {
    sequelize,
    tableName: 'source_method',
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
