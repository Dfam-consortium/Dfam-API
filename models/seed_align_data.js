/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('seed_align_data', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    graph_json: {
      type: "LONGBLOB",
      allowNull: false
    }
  }, {
    tableName: 'seed_align_data'
  });
};
