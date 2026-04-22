const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { admin, adminWithPermission } = require('../middleware/adminMiddleware');
const { ADMIN_PERMISSIONS } = require('../config/adminPermissions');
const {
  adminLoginRateLimiter,
  adminRefreshRateLimiter,
} = require('../middleware/rateLimitMiddleware');
const {
  adminLogin,
  adminRefresh,
  adminLogout,
  adminLogoutAll,
  adminIncidentRevokeAllSessions,
} = require('../controllers/adminAuthController');

const router = express.Router();

router.post('/login', adminLoginRateLimiter, adminLogin);
router.post('/refresh', adminRefreshRateLimiter, adminRefresh);
router.post('/logout', protect, admin, adminLogout);
router.post('/logout-all', protect, admin, adminLogoutAll);
router.post(
  '/incident-revoke-all',
  protect,
  adminWithPermission(ADMIN_PERMISSIONS.SECURITY_INCIDENT),
  adminIncidentRevokeAllSessions
);

module.exports = router;
