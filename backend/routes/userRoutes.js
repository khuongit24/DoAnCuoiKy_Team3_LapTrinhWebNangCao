const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { adminWithPermission } = require('../middleware/adminMiddleware');
const { trackAdminAudit } = require('../middleware/adminAuditMiddleware');
const { ADMIN_PERMISSIONS } = require('../config/adminPermissions');
const {
  getUserProfile,
  updateUserProfile,
  updateShippingAddress,
  deleteShippingAddress,
  changePassword,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/profile/address', protect, updateShippingAddress);
router.delete('/profile/address/:addressId', protect, deleteShippingAddress);
router.put('/profile/password', protect, changePassword);

router.get('/', protect, adminWithPermission(ADMIN_PERMISSIONS.USERS_READ), getUsers);

router.route('/:id')
  .get(protect, adminWithPermission(ADMIN_PERMISSIONS.USERS_READ), getUserById)
  .put(
    protect,
    adminWithPermission(ADMIN_PERMISSIONS.USERS_WRITE),
    trackAdminAudit('USER_ROLE_UPDATE', 'user'),
    updateUser
  )
  .delete(
    protect,
    adminWithPermission(ADMIN_PERMISSIONS.USERS_WRITE),
    trackAdminAudit('USER_DELETE', 'user'),
    deleteUser
  );

module.exports = router;
