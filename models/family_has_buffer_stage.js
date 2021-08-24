const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_has_buffer_stage', {
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
    },
    start_pos: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "The start position (1 based) of a range within the consensus to add as a buffer at the specified RepeatMasker stage."
    },
    end_pos: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "The end position (fully-closed) of a range within the consensus to add as a buffer at the specified RepeatMasker stage."
    }
  }, {
    sequelize,
    tableName: 'family_has_buffer_stage',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
          { name: "start_pos" },
          { name: "end_pos" },
          { name: "repeatmasker_stage_id" },
        ]
      },
      {
        name: "fk_family_has_buffer_stage_repeatmasker_stage1_idx",
        using: "BTREE",
        fields: [
          { name: "repeatmasker_stage_id" },
        ]
      },
    ]
  });
};
