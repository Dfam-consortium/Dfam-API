const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('coding_sequence', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      comment: "Surrogate identifier - auto indexed"
    },
    product: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: "Unique name for the product of this coding sequence.",
      unique: "product_UNIQUE"
    },
    translation: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Amino acid translation of the coding sequence."
    },
    cds_start: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Start of the overall coding sequence within the family consensus\/model or within the external_reference."
    },
    cds_end: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "End of the overall coding sequence within the family consensus\/model or within the external_reference."
    },
    exon_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Number of exons found in this coding region."
    },
    exon_starts: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: "Comma separated list of zero-based start positions in ascending sort order."
    },
    exon_ends: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: "Comma separated list of zero-based, half-open end positions in ascending sort order."
    },
    family_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "Identifier of the family from which this CDS originates or NULL if this CDS originates from an external source. (e.g genbank)",
      references: {
        model: 'family',
        key: 'id'
      }
    },
    external_reference: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "Identifier of the external entity from which this CDS originates or NULL if this CDS originates from a Dfam family."
    },
    reverse: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: "Boolean indicating if this CDS is on the reverse strand relative to the family\/external reference."
    },
    stop_codons: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Count of stop codons in the most recent alignment to the family\/external reference."
    },
    frameshifts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Count of frameshifts in the most recent alignment to the family\/external reference."
    },
    gaps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Count of gaps in the most recent alignment to the family\/external reference."
    },
    percent_identity: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Percent identity of the most recent alignment to the family\/external reference."
    },
    left_unaligned: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "The number of amino acids not aligned to the 5’ end of the reference sequence."
    },
    right_unaligned: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "The number of amino acids not aligned to the 3’ end of the reference sequence."
    },
    classification_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "The classification identifier for externally linked coding sequences.  Otherwise the classification may be obtained through the linked Dfam family."
    },
    align_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "For future expansion.  This will contain the actual alignment data for each coding sequence."
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Freeform description of the coding sequence."
    },
    protein_type: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'coding_sequence',
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
        name: "product_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "product" },
        ]
      },
      {
        name: "fk_coding_sequence_family1_idx",
        using: "BTREE",
        fields: [
          { name: "family_id" },
        ]
      },
    ]
  });
};
