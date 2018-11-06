/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('user', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    full_name: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true
    },
    image: {
      type: "BLOB",
      allowNull: true
    },
    account_disabled: {
      type: DataTypes.INTEGER(1),
      allowNull: true,
      defaultValue: '0'
    },
    salt: {
      type: DataTypes.STRING(1024),
      allowNull: true
    },
    pw_hash: {
      type: DataTypes.STRING(1024),
      allowNull: true
    },
    api_role: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    registration_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    email_verified_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    email_verify_token: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    ORCiD: {
      type: DataTypes.BIGINT,
      allowNull: true
    }
  }, {
    tableName: 'user'
  });
};
