/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('seed_coverage_data', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    whisker: {
      type: "LONGBLOB",
      allowNull: true
    },
    seed: {
      type: "LONGBLOB",
      allowNull: true
    }
  }, {
    tableName: 'seed_coverage_data'
  });
};
