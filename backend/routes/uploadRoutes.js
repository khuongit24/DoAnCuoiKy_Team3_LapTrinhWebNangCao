const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { adminWithPermission } = require('../middleware/adminMiddleware');
const { ADMIN_PERMISSIONS } = require('../config/adminPermissions');
const { upload, uploadMultiple } = require('../middleware/uploadMiddleware');
const {
  uploadSingleImage,
  uploadMultipleImages,
} = require('../controllers/uploadController');

const router = express.Router();

router.post(
  '/',
  protect,
  adminWithPermission(ADMIN_PERMISSIONS.PRODUCTS_WRITE),
  upload,
  uploadSingleImage
);
router.post(
  '/multiple',
  protect,
  adminWithPermission(ADMIN_PERMISSIONS.PRODUCTS_WRITE),
  uploadMultiple,
  uploadMultipleImages
);

module.exports = router;
