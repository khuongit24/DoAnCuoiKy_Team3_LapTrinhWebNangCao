const parsePositiveInteger = (value, defaultValue) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) || parsedValue < 1 ? defaultValue : parsedValue;
};

const LOGIN_LOCKOUT_THRESHOLD = parsePositiveInteger(process.env.AUTH_LOGIN_LOCKOUT_THRESHOLD, 5);
const LOGIN_LOCKOUT_WINDOW_MINUTES = parsePositiveInteger(
  process.env.AUTH_LOGIN_LOCKOUT_WINDOW_MINUTES,
  15
);
const LOGIN_LOCKOUT_BASE_SECONDS = parsePositiveInteger(
  process.env.AUTH_LOGIN_LOCKOUT_BASE_SECONDS,
  30
);
const LOGIN_LOCKOUT_MAX_SECONDS = parsePositiveInteger(process.env.AUTH_LOGIN_LOCKOUT_MAX_SECONDS, 1800);

const LOGIN_LOCKOUT_WINDOW_MS = LOGIN_LOCKOUT_WINDOW_MINUTES * 60 * 1000;
const LOGIN_LOCKOUT_BASE_MS = LOGIN_LOCKOUT_BASE_SECONDS * 1000;
const LOGIN_LOCKOUT_MAX_MS = LOGIN_LOCKOUT_MAX_SECONDS * 1000;

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const normalizeAuthSecurityState = (user) => {
  const authSecurity = user?.authSecurity || {};

  return {
    failedLoginAttempts: Number.isInteger(authSecurity.failedLoginAttempts)
      ? Math.max(authSecurity.failedLoginAttempts, 0)
      : 0,
    firstFailedLoginAt: normalizeDate(authSecurity.firstFailedLoginAt),
    lastFailedLoginAt: normalizeDate(authSecurity.lastFailedLoginAt),
    lockoutUntil: normalizeDate(authSecurity.lockoutUntil),
  };
};

const isUserLoginLocked = (user) => {
  const nowMs = Date.now();
  const authSecurityState = normalizeAuthSecurityState(user);
  const lockoutUntilMs = authSecurityState.lockoutUntil ? authSecurityState.lockoutUntil.getTime() : 0;
  const locked = lockoutUntilMs > nowMs;

  return {
    locked,
    failedLoginAttempts: authSecurityState.failedLoginAttempts,
    lockoutUntil: authSecurityState.lockoutUntil,
    remainingSeconds: locked ? Math.ceil((lockoutUntilMs - nowMs) / 1000) : 0,
  };
};

const registerFailedLoginAttempt = async (user) => {
  if (!user) {
    return {
      locked: false,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      remainingSeconds: 0,
    };
  }

  const nowMs = Date.now();
  const nowDate = new Date(nowMs);
  const authSecurityState = normalizeAuthSecurityState(user);

  const shouldResetCounter =
    !authSecurityState.firstFailedLoginAt ||
    nowMs - authSecurityState.firstFailedLoginAt.getTime() > LOGIN_LOCKOUT_WINDOW_MS;

  const failedLoginAttempts = shouldResetCounter
    ? 1
    : authSecurityState.failedLoginAttempts + 1;

  const firstFailedLoginAt = shouldResetCounter ? nowDate : authSecurityState.firstFailedLoginAt;

  let lockoutUntil = null;

  if (failedLoginAttempts >= LOGIN_LOCKOUT_THRESHOLD) {
    const lockoutExponent = failedLoginAttempts - LOGIN_LOCKOUT_THRESHOLD;
    const lockoutDurationMs = Math.min(
      LOGIN_LOCKOUT_BASE_MS * (2 ** lockoutExponent),
      LOGIN_LOCKOUT_MAX_MS
    );

    lockoutUntil = new Date(nowMs + lockoutDurationMs);
  }

  user.authSecurity = {
    failedLoginAttempts,
    firstFailedLoginAt,
    lastFailedLoginAt: nowDate,
    lockoutUntil,
  };

  await user.save();

  return {
    locked: Boolean(lockoutUntil),
    failedLoginAttempts,
    lockoutUntil,
    remainingSeconds: lockoutUntil ? Math.ceil((lockoutUntil.getTime() - nowMs) / 1000) : 0,
  };
};

const resetFailedLoginAttempts = async (user) => {
  if (!user) {
    return;
  }

  const authSecurityState = normalizeAuthSecurityState(user);

  if (
    authSecurityState.failedLoginAttempts === 0 &&
    !authSecurityState.firstFailedLoginAt &&
    !authSecurityState.lastFailedLoginAt &&
    !authSecurityState.lockoutUntil
  ) {
    return;
  }

  user.authSecurity = {
    failedLoginAttempts: 0,
    firstFailedLoginAt: null,
    lastFailedLoginAt: null,
    lockoutUntil: null,
  };

  await user.save();
};

module.exports = {
  isUserLoginLocked,
  registerFailedLoginAttempt,
  resetFailedLoginAttempts,
  LOGIN_LOCKOUT_THRESHOLD,
  LOGIN_LOCKOUT_WINDOW_MINUTES,
  LOGIN_LOCKOUT_BASE_SECONDS,
  LOGIN_LOCKOUT_MAX_SECONDS,
};
