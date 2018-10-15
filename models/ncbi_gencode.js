/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ncbi_gencode', {
    genetic_code_id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    abbreviation: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    cde: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    starts: {
      type: DataTypes.STRING(80),
      allowNull: true
    }
  }, {
    tableName: 'ncbi_gencode'
  });
};
