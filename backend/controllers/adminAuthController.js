const asyncHandler = require('express-async-handler');

const User = require('../models/User');
const { writeAuditLog } = require('../utils/auditLogger');
const {
  createAdminSession,
  revokeAdminSessionBySid,
  revokeAllAdminSessionsForUser,
  revokeAllActiveAdminSessions,
  findAdminSessionByRefreshToken,
  isSessionActive,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  getUserPermissionsVersion,
  updateSessionLastUsedAt,
  extractRequestMetadata,
} = require('../utils/adminAuthService');
const {
  isUserLoginLocked,
  registerFailedLoginAttempt,
  resetFailedLoginAttempts,
} = require('../utils/loginSecurityService');
const { recordFailedLoginMetric } = require('../utils/authSecurityMetrics');
const { logAuthEvent } = require('../utils/securityLogger');

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

const ADMIN_LOGIN_FAILED_MESSAGE = 'Thông tin đăng nhập không hợp lệ';

const writeAdminAuthAuditLog = ({
  actor,
  action,
  resourceId,
  status,
  requestId,
  errorCode,
  errorMessage,
  metadata,
}) => {
  if (!actor?.userId || !action) {
    return;
  }

  void writeAuditLog({
    actor,
    action,
    resource: {
      type: 'admin_session',
      id: String(resourceId || '').trim(),
    },
    status,
    requestId,
    errorCode,
    errorMessage,
    metadata,
  });
};

const adminLogin = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const { ip, userAgent } = extractRequestMetadata(req);

  const validationErrors = [];

  if (!email) {
    validationErrors.push({
      field: 'email',
      message: 'Vui lòng nhập email',
    });
  }

  if (!password) {
    validationErrors.push({
      field: 'password',
      message: 'Vui lòng nhập mật khẩu',
    });
  }

  if (validationErrors.length > 0) {
    throw createValidationError('Vui lòng nhập email và mật khẩu', validationErrors);
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    recordFailedLoginMetric({
      scope: 'admin_login',
      ip,
      requestId: req.requestId,
      userAgent,
      email,
    });

    logAuthEvent({
      event: 'ADMIN_LOGIN_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      email,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Đăng nhập quản trị thất bại do thông tin không hợp lệ',
    });

    res.status(401);
    throw new Error(ADMIN_LOGIN_FAILED_MESSAGE);
  }

  if (user.role === 'admin') {
    const lockState = isUserLoginLocked(user);

    if (lockState.locked) {
      recordFailedLoginMetric({
        scope: 'admin_login',
        ip,
        requestId: req.requestId,
        userAgent,
        email,
      });

      logAuthEvent({
        event: 'ADMIN_LOGIN_LOCKED',
        status: 'FAILED',
        requestId: req.requestId,
        ip,
        userAgent,
        userId: user._id,
        email: user.email,
        role: user.role,
        errorCode: 'ACCOUNT_LOCKED',
        message: 'Tài khoản quản trị đang bị tạm khóa đăng nhập',
        metadata: {
          remainingLockSeconds: lockState.remainingSeconds,
        },
      });

      writeAdminAuthAuditLog({
        actor: {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        action: 'ADMIN_LOGIN',
        status: 'FAILED',
        requestId: req.requestId,
        errorCode: 'ACCOUNT_LOCKED',
        errorMessage: 'Tài khoản quản trị đang bị tạm khóa đăng nhập',
        metadata: {
          ip,
          userAgent,
          method: req.method,
          path: req.originalUrl,
          remainingLockSeconds: lockState.remainingSeconds,
        },
      });

      res.status(401);
      throw new Error(ADMIN_LOGIN_FAILED_MESSAGE);
    }
  }

  const passwordMatched = await user.matchPassword(password);

  if (!passwordMatched || user.role !== 'admin') {
    let failedState = {
      failedLoginAttempts: 0,
      remainingSeconds: 0,
      locked: false,
    };

    if (user.role === 'admin') {
      failedState = await registerFailedLoginAttempt(user);
    }

    recordFailedLoginMetric({
      scope: 'admin_login',
      ip,
      requestId: req.requestId,
      userAgent,
      email,
    });

    logAuthEvent({
      event: 'ADMIN_LOGIN_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      userId: user._id,
      email: user.email,
      role: user.role,
      errorCode: failedState.locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      message: 'Đăng nhập quản trị thất bại do thông tin không hợp lệ',
      metadata: {
        failedLoginAttempts: failedState.failedLoginAttempts,
        remainingLockSeconds: failedState.remainingSeconds,
      },
    });

    if (user.role === 'admin') {
      writeAdminAuthAuditLog({
        actor: {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        action: 'ADMIN_LOGIN',
        status: 'FAILED',
        requestId: req.requestId,
        errorCode: failedState.locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
        errorMessage: 'Đăng nhập quản trị thất bại do thông tin không hợp lệ',
        metadata: {
          ip,
          userAgent,
          method: req.method,
          path: req.originalUrl,
          failedLoginAttempts: failedState.failedLoginAttempts,
          remainingLockSeconds: failedState.remainingSeconds,
        },
      });
    }

    res.status(401);
    throw new Error(ADMIN_LOGIN_FAILED_MESSAGE);
  }

  await resetFailedLoginAttempts(user);

  const issuedSession = await createAdminSession({
    user,
    req,
  });

  setRefreshTokenCookie(res, issuedSession.refreshToken);

  logAuthEvent({
    event: 'ADMIN_LOGIN_SUCCESS',
    status: 'SUCCESS',
    requestId: req.requestId,
    ip,
    userAgent,
    userId: user._id,
    email: user.email,
    role: user.role,
    message: 'Đăng nhập quản trị thành công',
    metadata: {
      sid: issuedSession.session.sid,
    },
  });

  writeAdminAuthAuditLog({
    actor: {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    action: 'ADMIN_LOGIN',
    resourceId: issuedSession.session.sid,
    status: 'SUCCESS',
    requestId: req.requestId,
    metadata: {
      ip,
      userAgent,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Đăng nhập quản trị thành công',
    data: {
      user: sanitizeUser(user),
      token: issuedSession.accessToken,
      sid: issuedSession.session.sid,
      permissions: issuedSession.permissions,
      permissionsVersion: issuedSession.permissionsVersion,
      expiresInSeconds: issuedSession.expiresInSeconds,
    },
  });
});

const adminRefresh = asyncHandler(async (req, res) => {
  const { ip, userAgent } = extractRequestMetadata(req);
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    logAuthEvent({
      event: 'ADMIN_REFRESH_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      errorCode: 'MISSING_REFRESH_TOKEN',
      message: 'Làm mới phiên quản trị thất bại do thiếu refresh token',
    });

    res.status(401);
    throw new Error('Phiên đăng nhập quản trị không hợp lệ');
  }

  const currentSession = await findAdminSessionByRefreshToken(refreshToken);

  if (!currentSession || !isSessionActive(currentSession)) {
    const isReplayDetected = Boolean(currentSession && currentSession.revokedAt);

    logAuthEvent({
      event: isReplayDetected ? 'ADMIN_REFRESH_REPLAY_DETECTED' : 'ADMIN_REFRESH_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      userId: currentSession?.userId,
      errorCode: isReplayDetected ? 'REFRESH_TOKEN_REPLAY_DETECTED' : 'INVALID_SESSION',
      message: isReplayDetected
        ? 'Phát hiện refresh token đã bị thu hồi được sử dụng lại'
        : 'Làm mới phiên quản trị thất bại do session không hợp lệ',
      metadata: {
        sid: currentSession?.sid || '',
      },
    });

    clearRefreshTokenCookie(res);
    res.status(401);
    throw new Error('Phiên đăng nhập quản trị không hợp lệ');
  }

  const user = await User.findById(currentSession.userId);

  if (!user || user.role !== 'admin') {
    await revokeAdminSessionBySid({
      sid: currentSession.sid,
      userId: currentSession.userId,
      reason: 'invalid_user',
    });

    logAuthEvent({
      event: 'ADMIN_REFRESH_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      userId: currentSession.userId,
      errorCode: 'INVALID_USER',
      message: 'Làm mới phiên quản trị thất bại do user không hợp lệ',
      metadata: {
        sid: currentSession.sid,
      },
    });

    clearRefreshTokenCookie(res);
    res.status(401);
    throw new Error('Phiên đăng nhập quản trị không hợp lệ');
  }

  const currentPermissionsVersion = getUserPermissionsVersion(user);

  if (currentPermissionsVersion !== currentSession.permissionsVersion) {
    await revokeAdminSessionBySid({
      sid: currentSession.sid,
      userId: currentSession.userId,
      reason: 'permissions_version_mismatch',
    });

    logAuthEvent({
      event: 'ADMIN_REFRESH_FAILED',
      status: 'FAILED',
      requestId: req.requestId,
      ip,
      userAgent,
      userId: user._id,
      email: user.email,
      role: user.role,
      errorCode: 'PERMISSIONS_VERSION_MISMATCH',
      message: 'Làm mới phiên quản trị thất bại do lệch phiên bản quyền',
      metadata: {
        sid: currentSession.sid,
      },
    });

    writeAdminAuthAuditLog({
      actor: {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      action: 'ADMIN_REFRESH',
      resourceId: currentSession.sid,
      status: 'FAILED',
      requestId: req.requestId,
      errorCode: 'PERMISSIONS_VERSION_MISMATCH',
      errorMessage: 'Làm mới phiên quản trị thất bại do lệch phiên bản quyền',
      metadata: {
        ip,
        userAgent,
        method: req.method,
        path: req.originalUrl,
      },
    });

    clearRefreshTokenCookie(res);
    res.status(401);
    throw new Error('Phiên đăng nhập quản trị không hợp lệ');
  }

  await revokeAdminSessionBySid({
    sid: currentSession.sid,
    userId: currentSession.userId,
    reason: 'rotated',
  });

  const rotatedSession = await createAdminSession({
    user,
    req,
  });

  await updateSessionLastUsedAt(rotatedSession.session._id);

  setRefreshTokenCookie(res, rotatedSession.refreshToken);

  logAuthEvent({
    event: 'ADMIN_REFRESH_SUCCESS',
    status: 'SUCCESS',
    requestId: req.requestId,
    ip,
    userAgent,
    userId: user._id,
    email: user.email,
    role: user.role,
    message: 'Làm mới phiên đăng nhập quản trị thành công',
    metadata: {
      previousSid: currentSession.sid,
      sid: rotatedSession.session.sid,
    },
  });

  writeAdminAuthAuditLog({
    actor: {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    action: 'ADMIN_REFRESH',
    resourceId: rotatedSession.session.sid,
    status: 'SUCCESS',
    requestId: req.requestId,
    metadata: {
      ip,
      userAgent,
      method: req.method,
      path: req.originalUrl,
      previousSid: currentSession.sid,
      statusCode: 200,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Làm mới phiên đăng nhập quản trị thành công',
    data: {
      user: sanitizeUser(user),
      token: rotatedSession.accessToken,
      sid: rotatedSession.session.sid,
      permissions: rotatedSession.permissions,
      permissionsVersion: rotatedSession.permissionsVersion,
      expiresInSeconds: rotatedSession.expiresInSeconds,
    },
  });
});

const adminLogout = asyncHandler(async (req, res) => {
  const sid = String(req.authClaims?.sid || '').trim();
  const { ip, userAgent } = extractRequestMetadata(req);

  const revokedCount = await revokeAdminSessionBySid({
    sid,
    userId: req.user?._id,
    reason: 'logout',
  });

  clearRefreshTokenCookie(res);

  logAuthEvent({
    event: 'ADMIN_LOGOUT',
    status: 'SUCCESS',
    requestId: req.requestId,
    ip,
    userAgent,
    userId: req.user?._id,
    email: req.user?.email,
    role: req.user?.role,
    message: 'Đăng xuất quản trị thành công',
    metadata: {
      sid,
      revokedCount,
    },
  });

  writeAdminAuthAuditLog({
    actor: {
      userId: req.user?._id,
      email: req.user?.email,
      role: req.user?.role,
    },
    action: 'ADMIN_LOGOUT',
    resourceId: sid,
    status: 'SUCCESS',
    requestId: req.requestId,
    metadata: {
      ip,
      userAgent,
      method: req.method,
      path: req.originalUrl,
      revokedCount,
      statusCode: 200,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Đăng xuất quản trị thành công',
    data: null,
  });
});

const adminLogoutAll = asyncHandler(async (req, res) => {
  const { ip, userAgent } = extractRequestMetadata(req);
  const revokedSessions = await revokeAllAdminSessionsForUser({
    userId: req.user?._id,
    reason: 'logout_all',
  });

  clearRefreshTokenCookie(res);

  logAuthEvent({
    event: 'ADMIN_LOGOUT_ALL',
    status: 'SUCCESS',
    requestId: req.requestId,
    ip,
    userAgent,
    userId: req.user?._id,
    email: req.user?.email,
    role: req.user?.role,
    message: 'Đăng xuất tất cả phiên quản trị thành công',
    metadata: {
      revokedSessions,
    },
  });

  writeAdminAuthAuditLog({
    actor: {
      userId: req.user?._id,
      email: req.user?.email,
      role: req.user?.role,
    },
    action: 'ADMIN_LOGOUT_ALL',
    resourceId: '*',
    status: 'SUCCESS',
    requestId: req.requestId,
    metadata: {
      ip,
      userAgent,
      method: req.method,
      path: req.originalUrl,
      revokedSessions,
      statusCode: 200,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Đăng xuất tất cả phiên quản trị thành công',
    data: {
      revokedSessions,
    },
  });
});

const adminIncidentRevokeAllSessions = asyncHandler(async (req, res) => {
  const { ip, userAgent } = extractRequestMetadata(req);

  const revokedSessions = await revokeAllActiveAdminSessions({
    reason: 'incident_global_revoke',
  });

  clearRefreshTokenCookie(res);

  logAuthEvent({
    event: 'ADMIN_INCIDENT_REVOKE_ALL_SESSIONS',
    status: 'SUCCESS',
    requestId: req.requestId,
    ip,
    userAgent,
    userId: req.user?._id,
    email: req.user?.email,
    role: req.user?.role,
    message: 'Kích hoạt thu hồi toàn bộ phiên quản trị do sự cố bảo mật',
    metadata: {
      revokedSessions,
    },
  });

  writeAdminAuthAuditLog({
    actor: {
      userId: req.user?._id,
      email: req.user?.email,
      role: req.user?.role,
    },
    action: 'ADMIN_INCIDENT_REVOKE_ALL_SESSIONS',
    resourceId: '*',
    status: 'SUCCESS',
    requestId: req.requestId,
    metadata: {
      ip,
      userAgent,
      method: req.method,
      path: req.originalUrl,
      revokedSessions,
      statusCode: 200,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Đã thu hồi toàn bộ phiên quản trị đang hoạt động',
    data: {
      revokedSessions,
    },
  });
});

module.exports = {
  adminLogin,
  adminRefresh,
  adminLogout,
  adminLogoutAll,
  adminIncidentRevokeAllSessions,
};
