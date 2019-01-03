/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('job', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    restful: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'PEND'
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    interactive: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '1'
    },
    response_time: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    tableName: 'job'
  });
};
