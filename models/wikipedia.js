/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('wikipedia', {
    auto_wiki: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    wikitext: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'wikipedia'
  });
};
