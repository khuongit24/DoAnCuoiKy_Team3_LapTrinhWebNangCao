const { rateLimit } = require('express-rate-limit');

const { logAuthEvent } = require('../utils/securityLogger');

const parsePositiveInteger = (value, defaultValue) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) || parsedValue < 1 ? defaultValue : parsedValue;
};

const RATE_LIMIT_LOGIN_WINDOW_MINUTES = parsePositiveInteger(
  process.env.RATE_LIMIT_LOGIN_WINDOW_MINUTES,
  15
);
const RATE_LIMIT_BUYER_LOGIN_MAX_ATTEMPTS = parsePositiveInteger(
  process.env.RATE_LIMIT_BUYER_LOGIN_MAX_ATTEMPTS,
  10
);
const RATE_LIMIT_ADMIN_LOGIN_MAX_ATTEMPTS = parsePositiveInteger(
  process.env.RATE_LIMIT_ADMIN_LOGIN_MAX_ATTEMPTS,
  5
);
const RATE_LIMIT_ADMIN_REFRESH_WINDOW_MINUTES = parsePositiveInteger(
  process.env.RATE_LIMIT_ADMIN_REFRESH_WINDOW_MINUTES,
  15
);
const RATE_LIMIT_ADMIN_REFRESH_MAX_REQUESTS = parsePositiveInteger(
  process.env.RATE_LIMIT_ADMIN_REFRESH_MAX_REQUESTS,
  30
);

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return String(forwardedFor[0] || '').trim();
  }

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return String(forwardedFor.split(',')[0] || '').trim();
  }

  return String(req.ip || '').trim();
};

const createRateLimiter = ({
  windowMs,
  limit,
  message,
  event,
  skipSuccessfulRequests = false,
}) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      const ip = getRequestIp(req);
      const userAgent = String(req.headers['user-agent'] || '').trim();

      logAuthEvent({
        event,
        status: 'FAILED',
        requestId: req.requestId,
        ip,
        userAgent,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message,
      });

      res.status(429).json({
        success: false,
        message,
        requestId: req.requestId || req.context?.requestId || '',
      });
    },
  });
};

const buyerLoginRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_LOGIN_WINDOW_MINUTES * 60 * 1000,
  limit: RATE_LIMIT_BUYER_LOGIN_MAX_ATTEMPTS,
  skipSuccessfulRequests: true,
  event: 'BUYER_LOGIN_RATE_LIMIT',
  message: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.',
});

const adminLoginRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_LOGIN_WINDOW_MINUTES * 60 * 1000,
  limit: RATE_LIMIT_ADMIN_LOGIN_MAX_ATTEMPTS,
  skipSuccessfulRequests: true,
  event: 'ADMIN_LOGIN_RATE_LIMIT',
  message: 'Đăng nhập quản trị tạm thời bị giới hạn. Vui lòng thử lại sau.',
});

const adminRefreshRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_ADMIN_REFRESH_WINDOW_MINUTES * 60 * 1000,
  limit: RATE_LIMIT_ADMIN_REFRESH_MAX_REQUESTS,
  event: 'ADMIN_REFRESH_RATE_LIMIT',
  message: 'Bạn đã làm mới phiên quá nhiều lần. Vui lòng thử lại sau.',
});

module.exports = {
  buyerLoginRateLimiter,
  adminLoginRateLimiter,
  adminRefreshRateLimiter,
  RATE_LIMIT_LOGIN_WINDOW_MINUTES,
  RATE_LIMIT_BUYER_LOGIN_MAX_ATTEMPTS,
  RATE_LIMIT_ADMIN_LOGIN_MAX_ATTEMPTS,
  RATE_LIMIT_ADMIN_REFRESH_WINDOW_MINUTES,
  RATE_LIMIT_ADMIN_REFRESH_MAX_REQUESTS,
};
