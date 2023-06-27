const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('hmm_model_data', {
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
    hmm_logo: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: "HMM logo data in JSON format (gzip’d)"
    },
    hmm: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: "Compressed (gzip’d) hmm file without annotations"
    }
  }, {
    sequelize,
    tableName: 'hmm_model_data',
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
      {
        name: "alt_family_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "family_id" },
        ]
      },
    ]
  });
};
