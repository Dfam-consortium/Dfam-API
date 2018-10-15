/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_overlap', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    family1_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    family2_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'family',
        key: 'id'
      }
    }
  }, {
    tableName: 'family_overlap'
  });
};
