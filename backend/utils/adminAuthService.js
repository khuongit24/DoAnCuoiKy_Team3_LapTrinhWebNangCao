const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AdminSession = require('../models/AdminSession');
const { getDefaultAdminPermissions } = require('../config/adminPermissions');
const { getCurrentJwtSigningSecret } = require('./jwtSecretService');

const ADMIN_ACCESS_TOKEN_EXPIRES_IN = '15m';
const ADMIN_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const ADMIN_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_REFRESH_COOKIE_NAME = 'admin_refresh_token';
const ADMIN_REFRESH_COOKIE_PATH = '/api/admin/auth';

const parseBooleanEnv = (value) => {
  if (value == null) {
    return undefined;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return undefined;
};

const getRefreshCookieSecureFlag = () => {
  const secureOverride = parseBooleanEnv(process.env.ADMIN_AUTH_COOKIE_SECURE);

  if (typeof secureOverride === 'boolean') {
    return secureOverride;
  }

  return true;
};

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: getRefreshCookieSecureFlag(),
  path: ADMIN_REFRESH_COOKIE_PATH,
  maxAge: ADMIN_REFRESH_TOKEN_TTL_MS,
});

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(ADMIN_REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  const cookieOptions = getRefreshCookieOptions();
  res.clearCookie(ADMIN_REFRESH_COOKIE_NAME, {
    ...cookieOptions,
    maxAge: undefined,
  });
};

const hashRefreshToken = (refreshToken) => {
  return crypto
    .createHash('sha256')
    .update(String(refreshToken || ''))
    .digest('hex');
};

const generateSessionId = () => crypto.randomBytes(24).toString('base64url');

const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const extractRequestMetadata = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.ip || '').split(',')[0].trim();

  return {
    ip,
    userAgent: String(req.headers['user-agent'] || '').trim(),
  };
};

const getUserPermissionsVersion = (user) => {
  const parsedVersion = Number.parseInt(user?.permissionsVersion, 10);
  return Number.isNaN(parsedVersion) || parsedVersion < 1 ? 1 : parsedVersion;
};

const signAdminAccessToken = ({ user, sid, permissionsVersion }) => {
  const permissions = getDefaultAdminPermissions();
  const signingSecret = getCurrentJwtSigningSecret();

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      permissions,
      sid,
      permissionsVersion,
      tokenType: 'admin_access',
    },
    signingSecret,
    {
      expiresIn: ADMIN_ACCESS_TOKEN_EXPIRES_IN,
      algorithm: 'HS256',
    }
  );

  return {
    token,
    permissions,
    expiresInSeconds: ADMIN_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  };
};

const createAdminSession = async ({ user, req }) => {
  const sid = generateSessionId();
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const permissionsVersion = getUserPermissionsVersion(user);

  const session = await AdminSession.create({
    sid,
    userId: user._id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + ADMIN_REFRESH_TOKEN_TTL_MS),
    revokedAt: null,
    permissionsVersion,
    metadata: extractRequestMetadata(req),
    lastUsedAt: new Date(),
  });

  const signedAccessToken = signAdminAccessToken({
    user,
    sid,
    permissionsVersion,
  });

  return {
    session,
    refreshToken,
    accessToken: signedAccessToken.token,
    permissions: signedAccessToken.permissions,
    permissionsVersion,
    expiresInSeconds: signedAccessToken.expiresInSeconds,
  };
};

const revokeAdminSessionBySid = async ({ sid, userId, reason }) => {
  if (!sid || !userId) {
    return 0;
  }

  const revokeResult = await AdminSession.updateOne(
    {
      sid,
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: String(reason || 'logout').trim(),
      },
    }
  );

  return revokeResult.modifiedCount || 0;
};

const revokeAllAdminSessionsForUser = async ({ userId, reason }) => {
  if (!userId) {
    return 0;
  }

  const revokeResult = await AdminSession.updateMany(
    {
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: String(reason || 'logout_all').trim(),
      },
    }
  );

  return revokeResult.modifiedCount || 0;
};

const revokeAllActiveAdminSessions = async ({ reason }) => {
  const revokeResult = await AdminSession.updateMany(
    {
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: String(reason || 'incident_global_revoke').trim(),
      },
    }
  );

  return revokeResult.modifiedCount || 0;
};

const findAdminSessionByRefreshToken = async (refreshToken) => {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  return AdminSession.findOne({ refreshTokenHash }).select('+refreshTokenHash');
};

const isSessionActive = (session) => {
  if (!session) {
    return false;
  }

  if (session.revokedAt) {
    return false;
  }

  if (!session.expiresAt) {
    return false;
  }

  return session.expiresAt.getTime() > Date.now();
};

const updateSessionLastUsedAt = async (sessionId) => {
  if (!sessionId) {
    return;
  }

  await AdminSession.updateOne(
    { _id: sessionId },
    {
      $set: {
        lastUsedAt: new Date(),
      },
    }
  );
};

const parseCookiesFromHeader = (cookieHeader) => {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(';').forEach((cookiePair) => {
    const separatorIndex = cookiePair.indexOf('=');

    if (separatorIndex < 0) {
      return;
    }

    const key = cookiePair.slice(0, separatorIndex).trim();
    const value = cookiePair.slice(separatorIndex + 1).trim();

    if (!key) {
      return;
    }

    cookies[key] = decodeURIComponent(value);
  });

  return cookies;
};

const getRefreshTokenFromRequest = (req) => {
  const cookieHeader = req.headers.cookie || '';
  const parsedCookies = parseCookiesFromHeader(cookieHeader);
  return parsedCookies[ADMIN_REFRESH_COOKIE_NAME] || '';
};

module.exports = {
  ADMIN_ACCESS_TOKEN_EXPIRES_IN,
  ADMIN_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  ADMIN_REFRESH_TOKEN_TTL_MS,
  ADMIN_REFRESH_COOKIE_NAME,
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
};
