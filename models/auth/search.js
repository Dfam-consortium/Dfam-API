/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('search', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    job_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'job',
        key: 'id'
      }
    },
    algo: {
      type: DataTypes.ENUM('nhmmer'),
      allowNull: true,
      defaultValue: 'nhmmer'
    },
    opened: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    started: {
      type: DataTypes.DATE,
      allowNull: true
    },
    targetdb: {
      type: DataTypes.ENUM('dfamhmm'),
      allowNull: true,
      defaultValue: 'dfamhmm'
    },
    status: {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: 'PEND'
    },
    checksum: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    options: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    search_time: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    position: {
      type: DataTypes.INTEGER(6),
      allowNull: true,
      defaultValue: '1'
    },
    model_subset: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'search'
  });
};
