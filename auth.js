const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const winston = require('winston');

const security = require('./security');
const Sequelize = require('sequelize');
const conn = require('./databases').users;
const userModel = require('./models/auth/user')(conn, Sequelize);

var opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: security.jwt_secret,
};

// Map JWT tokens to users in our database
passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
  userModel.findOne({ where: { email: jwt_payload.email } }).then(function(user) {
    done(null, user || false);
  }).catch(function(err) {
    done(err, false);
  });
}));

function swaggerBearerHandler(req, def, scopes, callback) {
  if (!req.headers.authorization) {
    winston.debug("swaggerBearerHandler - Failed, Authorization header missing.");
    var err = new Error("Missing authentication token. Please login first.");
    err.statusCode = 403;
    return callback(err);
  }

  return passport.authenticate('jwt', function(err, user, info) {
    var error = new Error("Failed to authenticate.");
    error.statusCode = 403;

    if (err) {
      return callback(error);
    }

    if (user) {
      req.swagger.params.user = user;
      return callback();
    } else {
      return callback(error);
    }
  })(req, req.res, callback);
}

module.exports.swaggerHandlers = {
  Bearer: swaggerBearerHandler,
};

module.exports.generateJwt = function(id, email, name) {
  var expiry = new Date();
  expiry.setTime(expiry.getTime() + (security.jwt_duration * 1000));
  return jwt.sign({
    id: id,
    email: email,
    name: name,
    exp: parseInt(expiry.getTime() / 1000),
  }, security.jwt_secret);
};

module.exports.hashPassword = function(password) {
  var salt = crypto.randomBytes(256).toString('hex');
  var hash = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex');
  return { salt, hash };
};

module.exports.validatePassword = function(password, salt, hash) {
  var newHash = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex');
  return newHash == hash;
};
