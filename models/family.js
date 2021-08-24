const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('family', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Surrogate identifier used internally as the primary key."
    },
    accession: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "A unique identifier for the family.  This is currently set as table “unique” which prevents using this table a temporal table ( NOTE: This may change in future versions )",
      unique: "accession_UNIQUE"
    },
    version: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
      defaultValue: 1,
      comment: "The version of this database record starting from 1"
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "The common name used for this element ( optional )",
      unique: "family_name_index"
    },
    classification_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "The assigned TE family classification.  NOTE: ‘NULL’ is not the same as ‘Unknown’.  ",
      references: {
        model: 'classification',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "The free-form description of the family"
    },
    consensus: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "The curated consensus sequence for the family.  This may be derived from the seed alignment directly, hand edited or derived from the profile HMM."
    },
    date_created: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date record was created."
    },
    date_modified: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date record was last modified."
    },
    date_deleted: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date this entry was deleted.  Deleted records are not removed by users but rather renamed  \"<id>_deleted\" and the date_deleted field is populated.  An administrative server process is responsible for removing deleted entries on a periodic basis."
    },
    target_site_cons: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: "The target site consensus for this family if known."
    },
    author: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Free-form text field with authorship recognition for this record. NOTE: Change to ORCID?"
    },
    deposited_by_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "The identifier for the user who created this record.  Users may see and manipulate their own records at various stages in the curation process."
    },
    curation_state_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "The current curation status for the record.  This is a reference to the curation_status table.",
      references: {
        model: 'curation_state',
        key: 'id'
      }
    },
    disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0,
      comment: "Is the record disabled in the RepeatMasker library?  This is used when we want to track a RepBase entry but the quality of the repeat is in question."
    },
    refineable: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0,
      comment: "Is this repeat prototypical of a large set of subfamilies.  I.e can RepeatMasker use this repeat to capture candidates for refinement.  This will soon be deprecated."
    },
    model_consensus: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "The consensus base as determined by the highest scoring base in a match state.  This is for reference only and not used for searching.  This may\/will differ from the standard consensus called directly from the seed alignment data and stored in the “consensus” field of this table."
    },
    model_mask: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "A mask ( one char per model match state ) which indicates regions of a model that are prone to producing false positive matches.  These regions are handled specially by nhmmer….\n"
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
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "The length the family.  This represents the number of match states in the profile HMM and the length of the consensus sequence.  This doesn’t need to be the case but is assumed to be so due to the use of he consensus to generate the REF data for hmmbuild."
    },
    hmm_maxl: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "The maximum instance length for the profile HMM.  This is the upper bound on the length at which an instance of the model is expected (  1e-7 sequences emitted by the model will be length MAXL or shorter )  to be found.  This is used by the nnhmmer filtering pipeline. "
    },
    hmm_general_threshold: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: "A general non-species-specific threshold to use when searching using the HMM in new genomes."
    },
    seed_ref: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "The seed alignment reference string generated ( typically ) by a consensus caller and used by hmmbuild to define the match states of the model."
    },
    title: {
      type: DataTypes.STRING(80),
      allowNull: true,
      comment: "A one line description of the family."
    },
    curation_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Informal notes on the curation of this family."
    },
    source_method_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "A reference to the source_method table if the method of discovery is a well-characterized.",
      references: {
        model: 'source_method',
        key: 'id'
      }
    },
    source_method_desc: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Specific details of how this family was discovered to supplement the source_method_id field."
    },
    source_assembly_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "A reference to the assembly table if this family was primarily discovered\/defined by data from one particular assembly.",
      references: {
        model: 'assembly',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'family',
    hasTrigger: true,
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
        name: "id_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "family_name_index",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "accession_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "accession" },
        ]
      },
      {
        name: "fk_family_classification1_idx",
        using: "BTREE",
        fields: [
          { name: "classification_id" },
        ]
      },
      {
        name: "fk_family_curation_status1_idx",
        using: "BTREE",
        fields: [
          { name: "curation_state_id" },
        ]
      },
      {
        name: "fk_family_source_method1_idx",
        using: "BTREE",
        fields: [
          { name: "source_method_id" },
        ]
      },
      {
        name: "fk_family_assembly1_idx",
        using: "BTREE",
        fields: [
          { name: "source_assembly_id" },
        ]
      },
    ]
  });
};
