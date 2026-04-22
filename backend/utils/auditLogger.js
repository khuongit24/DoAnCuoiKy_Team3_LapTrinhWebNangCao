const AuditLog = require('../models/AuditLog');

const resolveAuditErrorCode = (error, statusCode) => {
  if (error?.code === 11000) {
    return 'DUPLICATE_KEY';
  }

  if (error?.validationErrors || error?.name === 'ValidationError') {
    return 'VALIDATION_ERROR';
  }

  if (statusCode === 400) {
    return 'BAD_REQUEST';
  }

  if (statusCode === 401) {
    return 'UNAUTHORIZED';
  }

  if (statusCode === 403) {
    return 'FORBIDDEN';
  }

  if (statusCode === 404) {
    return 'NOT_FOUND';
  }

  if (statusCode === 409) {
    return 'CONFLICT';
  }

  if (statusCode >= 500) {
    return 'INTERNAL_SERVER_ERROR';
  }

  return 'UNKNOWN_ERROR';
};

const normalizeAuditErrorMessage = (errorMessage) => {
  const normalizedMessage = String(errorMessage || '').trim();

  if (!normalizedMessage) {
    return 'Không xác định được nguyên nhân lỗi';
  }

  return normalizedMessage;
};

const writeAuditLog = async ({
  actor,
  action,
  resource,
  status,
  requestId,
  errorCode,
  errorMessage,
  metadata,
}) => {
  if (!actor?.userId || !action || !resource?.type || !status) {
    return;
  }

  const logPayload = {
    actor: {
      userId: actor.userId,
      email: String(actor.email || '').trim().toLowerCase(),
      role: String(actor.role || '').trim(),
    },
    action: String(action).trim(),
    resource: {
      type: String(resource.type).trim(),
      id: String(resource.id || '').trim(),
    },
    status,
    requestId: String(requestId || '').trim(),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    timestamp: new Date(),
  };

  if (status === 'FAILED') {
    logPayload.errorCode = String(errorCode || 'UNKNOWN_ERROR').trim();
    logPayload.errorMessage = normalizeAuditErrorMessage(errorMessage);
  }

  try {
    await AuditLog.create(logPayload);
  } catch (error) {
    console.error('[audit] Không thể ghi nhật ký kiểm toán:', error.message);
  }
};

module.exports = {
  writeAuditLog,
  resolveAuditErrorCode,
  normalizeAuditErrorMessage,
};
