/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family_has_citation', {
    family_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'family',
        key: 'id'
      }
    },
    citation_pmid: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'citation',
        key: 'pmid'
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    order_added: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    }
  }, {
    tableName: 'family_has_citation'
  });
};
