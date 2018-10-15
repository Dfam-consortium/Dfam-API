/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('model_data', {
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
    },
    seed: {
      type: "LONGBLOB",
      allowNull: true
    },
    annotated_hmm: {
      type: "LONGBLOB",
      allowNull: true
    },
    annotated_seed: {
      type: "LONGBLOB",
      allowNull: true
    },
    hmm_png: {
      type: "LONGBLOB",
      allowNull: true
    }
  }, {
    tableName: 'model_data'
  });
};
