const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { adminWithPermission } = require('../middleware/adminMiddleware');
const { trackAdminAudit } = require('../middleware/adminAuditMiddleware');
const { ADMIN_PERMISSIONS } = require('../config/adminPermissions');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid,
} = require('../controllers/orderController');

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, adminWithPermission(ADMIN_PERMISSIONS.ORDERS_READ), getAllOrders);

router.get('/my', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put(
  '/:id/status',
  protect,
  adminWithPermission(ADMIN_PERMISSIONS.ORDERS_WRITE),
  trackAdminAudit('ORDER_STATUS_UPDATE', 'order'),
  updateOrderStatus
);
router.put('/:id/pay', protect, updateOrderToPaid);

module.exports = router;
