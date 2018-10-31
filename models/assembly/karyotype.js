/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('karyotype', {
    model_accession: {
      type: DataTypes.STRING(20),
      allowNull: false,
      primaryKey: true
    },
    heatmap: {
      type: "LONGBLOB",
      allowNull: true
    },
    html_map: {
      type: "LONGBLOB",
      allowNull: true
    },
    img_key: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nrph_heatmap: {
      type: "LONGBLOB",
      allowNull: true
    },
    nrph_html_map: {
      type: "LONGBLOB",
      allowNull: true
    },
    nrph_img_key: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'karyotype'
  });
};
