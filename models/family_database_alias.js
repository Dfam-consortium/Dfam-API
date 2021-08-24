const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_database_alias', {
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
    db_id: {
      type: DataTypes.STRING(80),
      allowNull: false,
      primaryKey: true,
      comment: "A free-form alias name or external database identifier."
    },
    db_link: {
      type: DataTypes.STRING(80),
      allowNull: false,
      primaryKey: true,
      comment: "A free-form identifier for the external database ( prefer URI )"
    },
    deprecated: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0,
      comment: "Is the id deprecated in the given database?"
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Freeform comment on the alias."
    }
  }, {
    sequelize,
    tableName: 'family_database_alias',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
          { name: "db_id" },
          { name: "db_link" },
        ]
      },
      {
        name: "fk_family_database_alias1",
        using: "BTREE",
        fields: [
          { name: "family_id" },
        ]
      },
    ]
  });
};
