/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_database_alias', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    db_id: {
      type: DataTypes.STRING(80),
      allowNull: false,
      primaryKey: true
    },
    db_link: {
      type: DataTypes.STRING(80),
      allowNull: false,
      primaryKey: true
    },
    other_params: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'family_database_alias'
  });
};
