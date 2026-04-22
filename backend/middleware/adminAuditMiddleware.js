const { writeAuditLog, resolveAuditErrorCode, normalizeAuditErrorMessage } = require('../utils/auditLogger');

const resolveActor = (req) => ({
  userId: req.user?._id,
  email: req.user?.email,
  role: req.user?.role,
});

const resolveResourceId = (req, res, customResolver) => {
  if (typeof customResolver === 'function') {
    return String(customResolver(req, res) || '').trim();
  }

  if (res.locals.adminAuditResourceId) {
    return String(res.locals.adminAuditResourceId).trim();
  }

  if (req.params?.id) {
    return String(req.params.id).trim();
  }

  return '';
};

const buildMetadata = (req, res, startedAt, customBuilder) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.ip || '').split(',')[0].trim();

  const baseMetadata = {
    method: req.method,
    path: req.originalUrl,
    statusCode: res.statusCode,
    durationMs: Date.now() - startedAt,
    ip,
    userAgent: String(req.headers['user-agent'] || '').trim(),
  };

  if (typeof customBuilder !== 'function') {
    return baseMetadata;
  }

  try {
    const additionalMetadata = customBuilder(req, res);
    if (!additionalMetadata || typeof additionalMetadata !== 'object') {
      return baseMetadata;
    }

    return {
      ...baseMetadata,
      ...additionalMetadata,
    };
  } catch (error) {
    return baseMetadata;
  }
};

const trackAdminAudit = (action, resourceType, options = {}) => {
  return (req, res, next) => {
    const startedAt = Date.now();

    req.adminAudit = {
      action,
      resourceType,
      logged: false,
      resourceIdResolver: options.resourceIdResolver,
      metadataBuilder: options.metadataBuilder,
      startedAt,
    };

    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      const resourceIdFromBody =
        payload?.data?._id ||
        payload?.data?.id ||
        payload?.data?.sid ||
        payload?.data?.resourceId;

      if (resourceIdFromBody) {
        res.locals.adminAuditResourceId = String(resourceIdFromBody);
      }

      return originalJson(payload);
    };

    res.on('finish', () => {
      const context = req.adminAudit;

      if (!context || context.logged || res.statusCode >= 400) {
        return;
      }

      context.logged = true;

      void writeAuditLog({
        actor: resolveActor(req),
        action: context.action,
        resource: {
          type: context.resourceType,
          id: resolveResourceId(req, res, context.resourceIdResolver),
        },
        status: 'SUCCESS',
        requestId: req.requestId,
        metadata: buildMetadata(req, res, context.startedAt, context.metadataBuilder),
      });
    });

    next();
  };
};

const logAdminAuditFailure = (req, res, error, statusCode) => {
  const context = req.adminAudit;

  if (!context || context.logged) {
    return;
  }

  context.logged = true;

  void writeAuditLog({
    actor: resolveActor(req),
    action: context.action,
    resource: {
      type: context.resourceType,
      id: resolveResourceId(req, res, context.resourceIdResolver),
    },
    status: 'FAILED',
    requestId: req.requestId,
    errorCode: resolveAuditErrorCode(error, statusCode),
    errorMessage: normalizeAuditErrorMessage(error?.message),
    metadata: buildMetadata(req, res, context.startedAt, context.metadataBuilder),
  });
};

module.exports = {
  trackAdminAudit,
  logAdminAuditFailure,
};
