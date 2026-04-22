const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

const User = require('../models/User');
const { getJwtVerificationSecrets } = require('../utils/jwtSecretService');

const verifyJwtToken = (token) => {
  const verificationSecrets = getJwtVerificationSecrets();
  let lastError;

  for (const secret of verificationSecrets) {
    try {
      return jwt.verify(token, secret, {
        algorithms: ['HS256'],
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Token không hợp lệ');
};

const protect = asyncHandler(async (req, res, next) => {
  const authorizationHeader = req.headers.authorization || '';

  if (!authorizationHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const token = authorizationHeader.split(' ')[1];

  if (!token) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  let decoded;

  try {
    decoded = verifyJwtToken(token);
  } catch (error) {
    res.status(401);
    throw new Error('Token không hợp lệ');
  }

  if (!decoded || !decoded.id) {
    res.status(401);
    throw new Error('Token không hợp lệ');
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    res.status(401);
    throw new Error('Token không hợp lệ');
  }

  req.user = user;
  req.authClaims = decoded;
  next();
});

module.exports = {
  protect,
};