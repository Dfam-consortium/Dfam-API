/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('model_file', {
    model_accession: {
      type: DataTypes.STRING(20),
      allowNull: false,
      primaryKey: true
    },
    hit_list: {
      type: "LONGBLOB",
      allowNull: false
    },
    nrph_hit_list: {
      type: "LONGBLOB",
      allowNull: true
    }
  }, {
    tableName: 'model_files'
  });
};
