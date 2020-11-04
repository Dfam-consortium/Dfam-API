/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('upload', {
    id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    file_name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    upload_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'upload'
  });
};
