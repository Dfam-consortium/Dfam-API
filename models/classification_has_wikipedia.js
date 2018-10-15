/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('classification_has_wikipedia', {
    classification_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'classification',
        key: 'id'
      }
    },
    auto_wiki: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'wikipedia',
        key: 'auto_wiki'
      }
    }
  }, {
    tableName: 'classification_has_wikipedia'
  });
};
