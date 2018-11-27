/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('hmm_model_data', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    hmm_logo: {
      type: "LONGBLOB",
      allowNull: true
    },
    hmm: {
      type: "LONGBLOB",
      allowNull: true
    }
  }, {
    tableName: 'hmm_model_data'
  });
};
