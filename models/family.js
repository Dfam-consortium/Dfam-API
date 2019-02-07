/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    accession: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: true
    },
    version: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: true,
      defaultValue: '1'
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: true
    },
    classification_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'classification',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    consensus: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_created: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_modified: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_deleted: {
      type: DataTypes.DATE,
      allowNull: true
    },
    target_site_cons: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    author: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deposited_by_id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true
    },
    curation_state_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'curation_state',
        key: 'id'
      }
    },
    disabled: {
      type: DataTypes.INTEGER(1),
      allowNull: true,
      defaultValue: '0'
    },
    refineable: {
      type: DataTypes.INTEGER(1),
      allowNull: true,
      defaultValue: '0'
    },
    model_consensus: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    model_mask: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hmm_build_method_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    cons_build_method_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    length: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    hmm_maxl: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    hmm_general_threshold: {
      type: "DOUBLE",
      allowNull: true
    },
    seed_ref: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    curation_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'family'
  });
};
