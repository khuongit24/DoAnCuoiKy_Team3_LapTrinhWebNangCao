const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { adminWithPermission } = require('../middleware/adminMiddleware');
const { ADMIN_PERMISSIONS } = require('../config/adminPermissions');
const { getAuditLogs } = require('../controllers/adminAuditController');

const router = express.Router();

router.get('/', protect, adminWithPermission(ADMIN_PERMISSIONS.AUDIT_READ), getAuditLogs);

module.exports = router;
