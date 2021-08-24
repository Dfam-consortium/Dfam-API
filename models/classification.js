const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('classification', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Surrogate identifier - auto indexed"
    },
    parent_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: "Classification name.  No spaces, \"_\" used to separate words and \"-\" is used to join name\/value pairs.  Ie. Inverted_Domain_Group-1.  There is no guarantee a name is unique except at any given level in the tree. The unique specifier for a classification is either its \"id\" in the table or the concatenation of the full path from the root to the node."
    },
    tooltip: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "A short description of the classification suitable for use as a tooltip."
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Freeform description of the classification."
    },
    hyperlink: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "A link to a relevant webpage on this class"
    },
    repeatmasker_type_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "All entries in this table should map uniquely to a Type\/Subtype designation used by RepeatMasker.",
      references: {
        model: 'repeatmasker_type',
        key: 'id'
      }
    },
    repeatmasker_subtype_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "All entries in this table should map uniquely to a Type\/Subtype designation used by RepeatMasker.",
      references: {
        model: 'repeatmasker_subtype',
        key: 'id'
      }
    },
    sort_order: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "Explicitly define sort rode for children of a single parent in a tree.  Note this requires re-ordering of the results post-query."
    },
    repbase_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "One or more closely equivalent RepBase class names.  Freeform.\n"
    },
    wicker_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "One more more closely equivalent Wicker et.al. class names. Freeform."
    },
    curcio_derbyshire_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "One or more closely equivalent Curcio and Derbyshire class names.  Freeform."
    },
    piegu_equiv: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "One or more closely equivalent Piegu et.al. class names.  Freeform."
    },
    lineage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "A text field to hold the “;” separated path from the root of the taxonomy to and including this node.  This is redundant information for optimization purposes and must be rebuilt whenever the table is modified."
    },
    aliases: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Comma separated list of aliases (spaces allowed)"
    }
  }, {
    sequelize,
    tableName: 'classification',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "fk_classification_repeatmasker_types1_idx",
        using: "BTREE",
        fields: [
          { name: "repeatmasker_type_id" },
        ]
      },
      {
        name: "fk_classification_repeatmasker_subtypes1_idx",
        using: "BTREE",
        fields: [
          { name: "repeatmasker_subtype_id" },
        ]
      },
    ]
  });
};
