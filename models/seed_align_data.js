/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('seed_align_data', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    graph_json: {
      type: "LONGBLOB",
      allowNull: false
    },
    avg_kimura_divergence: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    tableName: 'seed_align_data'
  });
};
