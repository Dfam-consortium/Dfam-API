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
    user_name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    display_name: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    image: {
      type: "BLOB",
      allowNull: true
    },
    email_verified_date: {
      type: DataTypes.DATE,
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
