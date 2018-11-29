/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('coverage_data', {
    family_accession: {
      type: DataTypes.STRING(20),
      allowNull: false,
      primaryKey: true
    },
    reversed: {
      type: "LONGBLOB",
      allowNull: true
    },
    forward: {
      type: "LONGBLOB",
      allowNull: true
    },
    nrph: {
      type: "LONGBLOB",
      allowNull: true
    },
    num_full: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    },
    num_full_nrph: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    },
    num_rev: {
      type: DataTypes.INTEGER(6),
      allowNull: true
    },
    karyotype: {
      type: "LONGBLOB",
      allowNull: false
    }
  }, {
    tableName: 'coverage_data'
  });
};
