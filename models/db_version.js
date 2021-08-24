const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('db_version', {
    dfam_version: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true,
      comment: "The version of the NCBI Taxonomy Database"
    },
    dfam_release_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true
    }
  }, {
    sequelize,
    tableName: 'db_version',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "dfam_version" },
          { name: "dfam_release_date" },
        ]
      },
    ]
  });
};
