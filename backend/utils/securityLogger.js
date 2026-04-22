const normalizeText = (value) => String(value || '').trim();

const safeEmail = (value) => normalizeText(value).toLowerCase();

const logStructured = (level, payload) => {
  const logLine = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (level === 'error') {
    console.error(logLine);
    return;
  }

  if (level === 'warn') {
    console.warn(logLine);
    return;
  }

  console.log(logLine);
};

const logAuthEvent = ({
  event,
  status,
  requestId,
  ip,
  userAgent,
  userId,
  email,
  role,
  errorCode,
  message,
  metadata,
}) => {
  const normalizedStatus = normalizeText(status).toUpperCase() || 'UNKNOWN';
  const level = normalizedStatus === 'FAILED' ? 'warn' : 'info';

  logStructured(level, {
    channel: 'auth_security',
    event: normalizeText(event) || 'AUTH_EVENT',
    status: normalizedStatus,
    requestId: normalizeText(requestId),
    ip: normalizeText(ip),
    userAgent: normalizeText(userAgent),
    userId: normalizeText(userId),
    email: safeEmail(email),
    role: normalizeText(role).toLowerCase(),
    errorCode: normalizeText(errorCode),
    message: normalizeText(message),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  });
};

const logSecurityAlert = ({
  alertType,
  requestId,
  ip,
  userAgent,
  severity,
  message,
  metadata,
}) => {
  logStructured('warn', {
    channel: 'security_alert',
    alertType: normalizeText(alertType) || 'UNKNOWN_ALERT',
    severity: normalizeText(severity).toUpperCase() || 'HIGH',
    requestId: normalizeText(requestId),
    ip: normalizeText(ip),
    userAgent: normalizeText(userAgent),
    message: normalizeText(message),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  });
};

module.exports = {
  logAuthEvent,
  logSecurityAlert,
};
