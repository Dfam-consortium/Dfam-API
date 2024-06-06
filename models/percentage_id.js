/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('percentage_id', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    assembly_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'assembly',
        key: 'id'
      }
    },
    threshold: {
      type: DataTypes.ENUM('GA','TC','2','4','8','16'),
      allowNull: false,
      primaryKey: true
    },
    graph_json: {
      type: "LONGBLOB",
      allowNull: false
    },
    max_insert: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    },
    num_seqs: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    }
  }, {
    tableName: 'percentage_id'
  });
};
