/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('seed_region', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    assembly_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'assembly',
        key: 'id'
      }
    },
    seq_id: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    seq_start: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    seq_end: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    a3m_seq: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    strand: {
      type: DataTypes.ENUM('+','-'),
      allowNull: true
    },
    model_start: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false
    },
    model_end: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'seed_region'
  });
};
