const jwt = require('jsonwebtoken');

const { getCurrentJwtSigningSecret } = require('./jwtSecretService');

const generateToken = (id) => {
  if (!process.env.JWT_EXPIRE) {
    throw new Error('Missing JWT_EXPIRE environment variable');
  }

  const signingSecret = getCurrentJwtSigningSecret();

  return jwt.sign({ id }, signingSecret, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = generateToken;
