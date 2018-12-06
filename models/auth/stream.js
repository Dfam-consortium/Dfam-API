/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('stream', {
    search_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'search',
        key: 'id'
      }
    },
    raw_stdin: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stdin: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stdout: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stderr: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'stream'
  });
};
