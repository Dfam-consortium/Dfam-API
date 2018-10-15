/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('overlap_segment', {
    family_overlap_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family_overlap',
        key: 'id'
      }
    },
    family1_start: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    family1_end: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    family2_start: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    family2_end: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    strand: {
      type: DataTypes.ENUM('+','-'),
      allowNull: false,
      primaryKey: true
    },
    evalue: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    identity: {
      type: DataTypes.STRING(6),
      allowNull: true
    },
    coverage: {
      type: DataTypes.STRING(6),
      allowNull: true
    },
    cigar: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'overlap_segment'
  });
};
