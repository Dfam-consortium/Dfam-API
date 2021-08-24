const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('overlap_segment', {
    family1_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A Dfam family identifier",
      references: {
        model: 'family',
        key: 'id'
      }
    },
    family2_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A Dfam family identifier",
      references: {
        model: 'family',
        key: 'id'
      }
    },
    family1_start: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "The start position (1-based) of the overlap range in family1"
    },
    family1_end: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "The end position (fully-closed) of the overlap range in family1"
    },
    family2_start: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "The start position (1-based) of the overlap range in family2"
    },
    family2_end: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "The end position (fully-closed) of the overlap range in family2"
    },
    strand: {
      type: DataTypes.ENUM('+','-'),
      allowNull: false,
      primaryKey: true,
      comment: "The orientation of family2 in the alignment"
    },
    evalue: {
      type: DataTypes.STRING(15),
      allowNull: true,
      comment: "The Evalue of the aligned region"
    },
    identity: {
      type: DataTypes.STRING(6),
      allowNull: true,
      comment: "The percent identity of the aligned region"
    },
    coverage: {
      type: DataTypes.STRING(6),
      allowNull: true,
      comment: "?? "
    },
    cigar: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "The alignment sequence in CIGAR ( or CSV format )"
    }
  }, {
    sequelize,
    tableName: 'overlap_segment',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family1_id" },
          { name: "family2_id" },
          { name: "family1_start" },
          { name: "family1_end" },
          { name: "family2_start" },
          { name: "family2_end" },
          { name: "strand" },
        ]
      },
      {
        name: "fk_overlap_segment_family1_idx",
        using: "BTREE",
        fields: [
          { name: "family1_id" },
        ]
      },
      {
        name: "fk_overlap_segment_family2_idx",
        using: "BTREE",
        fields: [
          { name: "family2_id" },
        ]
      },
    ]
  });
};
