/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('citation', {
    pmid: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    authors: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    journal: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pubdate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'citation'
  });
};
