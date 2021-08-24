const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_has_search_stage', {
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
    repeatmasker_stage_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A RepeatMasker stage identifier",
      references: {
        model: 'repeatmasker_stage',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'family_has_search_stage',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
          { name: "repeatmasker_stage_id" },
        ]
      },
      {
        name: "fk_family_has_search_stage_repeatmasker_stage1_idx",
        using: "BTREE",
        fields: [
          { name: "repeatmasker_stage_id" },
        ]
      },
    ]
  });
};
