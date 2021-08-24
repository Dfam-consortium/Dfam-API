const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('seed_align_data', {
    family_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "A Dfam family identifier",
      references: {
        model: 'family',
        key: 'id'
      }
    },
    comsa_data: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    graph_json: {
      type: DataTypes.BLOB,
      allowNull: false,
      comment: "Cached data for the seed alignment visualization."
    },
    avg_kimura_divergence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "The average Kimura divergence of the seeds to the derived consensus."
    },
    sequence_count: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'seed_align_data',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
        ]
      },
    ]
  });
};
