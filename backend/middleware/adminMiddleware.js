const asyncHandler = require('express-async-handler');

const AdminSession = require('../models/AdminSession');
const { ADMIN_PERMISSIONS } = require('../config/adminPermissions');

const normalizeRequiredPermissions = (requiredPermissions) => {
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.filter(Boolean);
  }

  if (typeof requiredPermissions === 'string' && requiredPermissions.trim()) {
    return [requiredPermissions.trim()];
  }

  return [ADMIN_PERMISSIONS.PANEL_ACCESS];
};

const normalizePermissionsVersion = (value) => {
  const parsedVersion = Number.parseInt(value, 10);

  if (Number.isNaN(parsedVersion) || parsedVersion < 1) {
    return 1;
  }

  return parsedVersion;
};

const adminWithPermission = (requiredPermissionsInput) => {
  const requiredPermissions = normalizeRequiredPermissions(requiredPermissionsInput);

  return asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      const error = new Error('Không có quyền thực hiện hành động này');
      res.status(403);
      next(error);
      return;
    }

    const claims = req.authClaims || {};

    if (
      claims.role !== 'admin' ||
      !Array.isArray(claims.permissions) ||
      !claims.sid ||
      !claims.permissionsVersion
    ) {
      res.status(401);
      throw new Error('Phiên đăng nhập quản trị không hợp lệ');
    }

    const hasAllRequiredPermissions = requiredPermissions.every((permission) => {
      return claims.permissions.includes(permission);
    });

    if (!hasAllRequiredPermissions) {
      const error = new Error('Không có quyền thực hiện hành động này');
      res.status(403);
      next(error);
      return;
    }

    const claimPermissionsVersion = normalizePermissionsVersion(claims.permissionsVersion);
    const userPermissionsVersion = normalizePermissionsVersion(req.user.permissionsVersion);

    if (claimPermissionsVersion !== userPermissionsVersion) {
      res.status(401);
      throw new Error('Phiên đăng nhập quản trị không hợp lệ');
    }

    const activeSession = await AdminSession.findOne({
      sid: String(claims.sid).trim(),
      userId: req.user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!activeSession) {
      res.status(401);
      throw new Error('Phiên đăng nhập quản trị không hợp lệ');
    }

    const sessionPermissionsVersion = normalizePermissionsVersion(activeSession.permissionsVersion);

    if (sessionPermissionsVersion !== userPermissionsVersion) {
      res.status(401);
      throw new Error('Phiên đăng nhập quản trị không hợp lệ');
    }

    req.adminSession = activeSession;
    next();
  });
};

const admin = adminWithPermission(ADMIN_PERMISSIONS.PANEL_ACCESS);

module.exports = {
  admin,
  adminWithPermission,
};