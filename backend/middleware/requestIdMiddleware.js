const crypto = require('crypto');

const HEADER_NAME = 'x-request-id';

const sanitizeRequestId = (requestId) => {
  const normalizedRequestId = String(requestId || '').trim();

  if (!normalizedRequestId) {
    return '';
  }

  if (normalizedRequestId.length > 100) {
    return '';
  }

  return normalizedRequestId;
};

const attachRequestId = (req, res, next) => {
  const requestIdFromHeader = sanitizeRequestId(req.headers[HEADER_NAME]);
  const requestId = requestIdFromHeader || crypto.randomUUID();

  req.requestId = requestId;
  req.context = {
    ...(req.context || {}),
    requestId,
  };

  res.setHeader('X-Request-Id', requestId);

  next();
};

module.exports = {
  attachRequestId,
};
