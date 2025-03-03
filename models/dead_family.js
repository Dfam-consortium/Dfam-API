/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('dead_family', {
    accession: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    user: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    deleted: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'dead_family'
  });
};
