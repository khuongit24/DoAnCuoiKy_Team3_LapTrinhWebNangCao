const ADMIN_PERMISSIONS = Object.freeze({
  PANEL_ACCESS: 'admin:panel:access',
  PRODUCTS_READ: 'admin:products:read',
  PRODUCTS_WRITE: 'admin:products:write',
  ORDERS_READ: 'admin:orders:read',
  ORDERS_WRITE: 'admin:orders:write',
  USERS_READ: 'admin:users:read',
  USERS_WRITE: 'admin:users:write',
  AUDIT_READ: 'admin:audit:read',
  SECURITY_INCIDENT: 'admin:security:incident',
});

const getDefaultAdminPermissions = () => [
  ADMIN_PERMISSIONS.PANEL_ACCESS,
  ADMIN_PERMISSIONS.PRODUCTS_READ,
  ADMIN_PERMISSIONS.PRODUCTS_WRITE,
  ADMIN_PERMISSIONS.ORDERS_READ,
  ADMIN_PERMISSIONS.ORDERS_WRITE,
  ADMIN_PERMISSIONS.USERS_READ,
  ADMIN_PERMISSIONS.USERS_WRITE,
  ADMIN_PERMISSIONS.AUDIT_READ,
  ADMIN_PERMISSIONS.SECURITY_INCIDENT,
];

module.exports = {
  ADMIN_PERMISSIONS,
  getDefaultAdminPermissions,
};
