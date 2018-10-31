/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sequence', {
    accession: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    id: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    length: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      defaultValue: '0'
    },
    updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    created: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_genomic: {
      type: DataTypes.INTEGER(1),
      allowNull: false
    }
  }, {
    tableName: 'sequence'
  });
};
