const { logSecurityAlert } = require('./securityLogger');

const parsePositiveInteger = (value, defaultValue) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) || parsedValue < 1 ? defaultValue : parsedValue;
};

const FAILED_LOGIN_ALERT_THRESHOLD = parsePositiveInteger(
  process.env.AUTH_FAILED_LOGIN_ALERT_THRESHOLD,
  20
);
const FAILED_LOGIN_ALERT_WINDOW_SECONDS = parsePositiveInteger(
  process.env.AUTH_FAILED_LOGIN_ALERT_WINDOW_SECONDS,
  300
);
const FAILED_LOGIN_ALERT_COOLDOWN_SECONDS = parsePositiveInteger(
  process.env.AUTH_FAILED_LOGIN_ALERT_COOLDOWN_SECONDS,
  300
);

const FAILED_LOGIN_ALERT_WINDOW_MS = FAILED_LOGIN_ALERT_WINDOW_SECONDS * 1000;
const FAILED_LOGIN_ALERT_COOLDOWN_MS = FAILED_LOGIN_ALERT_COOLDOWN_SECONDS * 1000;

const failedLoginSeriesByIp = new Map();

const buildSeriesKey = (scope, ip) => `${String(scope || 'auth').trim()}:${String(ip || 'unknown').trim()}`;

const cleanupSeries = (timestamps, nowMs) => {
  return timestamps.filter((timestamp) => nowMs - timestamp <= FAILED_LOGIN_ALERT_WINDOW_MS);
};

const recordFailedLoginMetric = ({ scope, ip, requestId, userAgent, email }) => {
  const nowMs = Date.now();
  const seriesKey = buildSeriesKey(scope, ip);
  const currentSeries = failedLoginSeriesByIp.get(seriesKey) || {
    timestamps: [],
    lastAlertAt: 0,
  };

  const nextTimestamps = cleanupSeries(currentSeries.timestamps, nowMs);
  nextTimestamps.push(nowMs);

  const shouldAlert =
    nextTimestamps.length >= FAILED_LOGIN_ALERT_THRESHOLD &&
    nowMs - currentSeries.lastAlertAt >= FAILED_LOGIN_ALERT_COOLDOWN_MS;

  const nextSeries = {
    timestamps: nextTimestamps,
    lastAlertAt: shouldAlert ? nowMs : currentSeries.lastAlertAt,
  };

  failedLoginSeriesByIp.set(seriesKey, nextSeries);

  if (shouldAlert) {
    logSecurityAlert({
      alertType: 'FAILED_LOGIN_SPIKE',
      requestId,
      ip,
      userAgent,
      severity: 'HIGH',
      message: 'Phát hiện số lượng đăng nhập thất bại vượt ngưỡng theo IP',
      metadata: {
        scope: String(scope || 'auth').trim(),
        countWithinWindow: nextTimestamps.length,
        windowSeconds: FAILED_LOGIN_ALERT_WINDOW_SECONDS,
        threshold: FAILED_LOGIN_ALERT_THRESHOLD,
        email: String(email || '').trim().toLowerCase(),
      },
    });
  }

  return {
    countWithinWindow: nextTimestamps.length,
    threshold: FAILED_LOGIN_ALERT_THRESHOLD,
    windowSeconds: FAILED_LOGIN_ALERT_WINDOW_SECONDS,
    alerted: shouldAlert,
  };
};

module.exports = {
  recordFailedLoginMetric,
};
