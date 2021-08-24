const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('assembly', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Surrogate identifier - auto indexed"
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: "The assembly name",
      unique: "name"
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "A short description of the assembly"
    },
    dfam_taxdb_tax_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "The taxa for the assembly species",
      references: {
        model: 'dfam_taxdb',
        key: 'tax_id'
      }
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "Where the assembly originated"
    },
    release_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "The release date for the assembly"
    },
    version: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "The version of the assembly"
    },
    uri: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "A publicly accessible URI for detailed information on the assembly and\/or a download"
    },
    schema_name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "If there is Dfam annotation data stored, this contains the schema name for the dataset"
    },
    visible: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Should this assembly be made visible on the website"
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Display order for the assemblies - used by UI"
    },
    z_size: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "The size of the annotated assembly in bp.  This includes only the sequences which Dfam uses in it’s analysis and may exclude alternate\/artificial assembly sequences. This value is used by nhmmer to generate e-values ( e.g -Z )."
    }
  }, {
    sequelize,
    tableName: 'assembly',
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
        name: "name",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "fk_assembly_dfam_taxdb1_idx",
        using: "BTREE",
        fields: [
          { name: "dfam_taxdb_tax_id" },
        ]
      },
    ]
  });
};
