/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('assembly', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    dfam_taxdb_tax_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'dfam_taxdb',
        key: 'tax_id'
      }
    },
    source: {
      type: DataTypes.ENUM('ensembl','ensembl_genomes','ncbi','ucsc'),
      allowNull: false
    },
    release_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    version: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    schema_name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    visible: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    display_order: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    }
  }, {
    tableName: 'assembly'
  });
};
