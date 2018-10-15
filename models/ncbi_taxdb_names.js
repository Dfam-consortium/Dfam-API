/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ncbi_taxdb_names', {
    tax_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    name_txt: {
      type: DataTypes.STRING(128),
      allowNull: false,
      primaryKey: true
    },
    unique_name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      primaryKey: true
    },
    name_class: {
      type: DataTypes.STRING(128),
      allowNull: false,
      primaryKey: true
    },
    sanitized_name: {
      type: DataTypes.STRING(128),
      allowNull: true
    }
  }, {
    tableName: 'ncbi_taxdb_names'
  });
};
