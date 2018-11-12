/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('coding_sequence', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    product: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    translation: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cds_start: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    },
    cds_end: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    },
    exon_count: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    },
    exon_starts: {
      type: "LONGBLOB",
      allowNull: true
    },
    exon_ends: {
      type: "LONGBLOB",
      allowNull: true
    },
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    external_reference: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    reverse: {
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    stop_codons: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    frameshifts: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    gaps: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    percent_identity: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    left_unaligned: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    right_unaligned: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    classification_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    align_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(256),
      allowNull: true
    }
  }, {
    tableName: 'coding_sequence'
  });
};
