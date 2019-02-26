/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('classification', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    parent_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    tooltip: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hyperlink: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    repeatmasker_type_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'repeatmasker_type',
        key: 'id'
      }
    },
    repeatmasker_subtype_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'repeatmasker_subtype',
        key: 'id'
      }
    },
    sort_order: {
      type: DataTypes.INTEGER(8).UNSIGNED,
      allowNull: true
    },
    repbase_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    wicker_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    curcio_derbyshire_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    piegu_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    lineage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    aliases: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'classification'
  });
};
