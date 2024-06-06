/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('dfam_taxdb', {
    tax_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    scientific_name: {
      type: DataTypes.STRING(256),
      allowNull: false
    },
    sanitized_name: {
      type: DataTypes.STRING(256),
      allowNull: false
    },
    common_name: {
      type: DataTypes.STRING(256),
      allowNull: true
    },
    unique_name: {
      type: DataTypes.STRING(256),
      allowNull: true
    },
    lineage: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'dfam_taxdb'
  });
};
