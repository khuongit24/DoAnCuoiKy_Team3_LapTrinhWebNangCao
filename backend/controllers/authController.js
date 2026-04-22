const asyncHandler = require('express-async-handler');

const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const {
  isUserLoginLocked,
  registerFailedLoginAttempt,
  resetFailedLoginAttempts,
} = require('../utils/loginSecurityService');
const { recordFailedLoginMetric } = require('../utils/authSecurityMetrics');
const { logAuthEvent } = require('../utils/securityLogger');
const { extractRequestMetadata } = require('../utils/adminAuthService');

const createValidationError = (message, validationErrors) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.validationErrors = validationErrors;
  return error;
};

const sanitizeUser = (userDocument) => {
  const userObject = userDocument.toObject ? userDocument.toObject() : { ...userDocument };
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

const buildAuthData = (userDocument) => ({
  user: sanitizeUser(userDocument),
  token: generateToken(userDocument._id),
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const validationErrors = [];

  if (!name || !String(name).trim()) {
    validationErrors.push({
      field: 'name',
      message: 'Vui lòng nhập tên',
    });
  }

  if (!email || !String(email).trim()) {
    validationErrors.push({
      field: 'email',
      message: 'Vui lòng nhập email',
    });
  }

  if (!password || !String(password).trim()) {
    validationErrors.push({
      field: 'password',
      message: 'Vui lòng nhập mật khẩu',
    });
  }

  if (validationErrors.length > 0) {
    throw createValidationError('Vui lòng nhập đầy đủ thông tin', validationErrors);
  }

  if (String(password).length < 6) {
    throw createValidationError('Mật khẩu phải có ít nhất 6 ký tự', [
      {
        field: 'password',
        message: 'Mật khẩu phải có ít nhất 6 ký tự',
      },
    ]);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const userExists = await User.findOne({ email: normalizedEmail });

  if (userExists) {
    res.status(409);
    throw new Error('Email đã được sử dụng');
  }

  const createdUser = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password,
  });

  res.status(201).json({
    success: true,
    message: 'Đăng ký thành công',
    data: buildAuthData(createdUser),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { ip, userAgent } = extractRequestMetadata(req);
  const validationErrors = [];

  if (!email || !String(email).trim()) {
    validationErrors.push({
      field: 'email',
      message: 'Vui lòng nhập email',
    });
  }

  if (!password || !String(password).trim()) {
    validationErrors.push({
      field: 'password',
      message: 'Vui lòng nhập mật khẩu',
    });
  }

  if (validationErrors.length > 0) {
    throw createValidationError('Vui lòng nhập email và mật khẩu', validationErrors);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    recordFailedLoginMetric({
      scope: 'buyer_login',
      ip,
      requestId: req.requestId,
      userAgent,
      email: normalizedEmail,
    });

    logAuthEvent({
      event: 'BUYER_LOGIN_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      email: normalizedEmail,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Đăng nhập buyer thất bại do thông tin không hợp lệ',
    });

    res.status(401);
    throw new Error('Email hoặc mật khẩu không đúng');
  }

  const lockState = isUserLoginLocked(user);

  if (lockState.locked) {
    recordFailedLoginMetric({
      scope: 'buyer_login',
      ip,
      requestId: req.requestId,
      userAgent,
      email: normalizedEmail,
    });

    logAuthEvent({
      event: 'BUYER_LOGIN_LOCKED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      userId: user._id,
      email: user.email,
      role: user.role,
      errorCode: 'ACCOUNT_LOCKED',
      message: 'Tài khoản buyer đang bị tạm khóa đăng nhập',
      metadata: {
        remainingLockSeconds: lockState.remainingSeconds,
      },
    });

    res.status(401);
    throw new Error('Email hoặc mật khẩu không đúng');
  }

  const passwordMatched = await user.matchPassword(password);

  if (!passwordMatched) {
    const failedState = await registerFailedLoginAttempt(user);

    recordFailedLoginMetric({
      scope: 'buyer_login',
      ip,
      requestId: req.requestId,
      userAgent,
      email: normalizedEmail,
    });

    logAuthEvent({
      event: 'BUYER_LOGIN_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      userId: user._id,
      email: user.email,
      role: user.role,
      errorCode: failedState.locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      message: 'Đăng nhập buyer thất bại do thông tin không hợp lệ',
      metadata: {
        failedLoginAttempts: failedState.failedLoginAttempts,
        remainingLockSeconds: failedState.remainingSeconds,
      },
    });

    res.status(401);
    throw new Error('Email hoặc mật khẩu không đúng');
  }

  await resetFailedLoginAttempts(user);

  if (user.role === 'admin') {
    logAuthEvent({
      event: 'BUYER_LOGIN_BLOCKED_ADMIN_ACCOUNT',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      userId: user._id,
      email: user.email,
      role: user.role,
      errorCode: 'ADMIN_ACCOUNT_BUYER_LOGIN_BLOCKED',
      message: 'Tài khoản admin bị chặn đăng nhập qua cổng buyer',
    });

    res.status(403);
    throw new Error('Tài khoản quản trị vui lòng đăng nhập tại trang /admin/login');
  }

  logAuthEvent({
    event: 'BUYER_LOGIN_SUCCESS',
    status: 'SUCCESS',
    requestId: req.requestId,
    ip,
    userAgent,
    userId: user._id,
    email: user.email,
    role: user.role,
    message: 'Đăng nhập buyer thành công',
  });

  res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công',
    data: buildAuthData(user),
  });
});

const logout = asyncHandler(async (req, res) => {
  const { ip, userAgent } = extractRequestMetadata(req);

  logAuthEvent({
    event: 'BUYER_LOGOUT',
    status: 'SUCCESS',
    requestId: req.requestId,
    ip,
    userAgent,
    userId: req.user?._id,
    email: req.user?.email,
    role: req.user?.role,
    message: 'Đăng xuất buyer thành công',
  });

  res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công',
    data: null,
  });
});

const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin người dùng thành công',
    data: sanitizeUser(req.user),
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
};