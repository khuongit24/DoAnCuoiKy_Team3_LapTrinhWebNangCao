const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { adminWithPermission } = require('../middleware/adminMiddleware');
const { trackAdminAudit } = require('../middleware/adminAuditMiddleware');
const { ADMIN_PERMISSIONS } = require('../config/adminPermissions');
const {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
} = require('../controllers/productController');

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(
    protect,
    adminWithPermission(ADMIN_PERMISSIONS.PRODUCTS_WRITE),
    trackAdminAudit('PRODUCT_CREATE', 'product'),
    createProduct
  );

router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/slug/:slug', getProductBySlug);

router.post('/:id/reviews', protect, createProductReview);

router.route('/:id')
  .get(getProductById)
  .put(
    protect,
    adminWithPermission(ADMIN_PERMISSIONS.PRODUCTS_WRITE),
    trackAdminAudit('PRODUCT_UPDATE', 'product'),
    updateProduct
  )
  .delete(
    protect,
    adminWithPermission(ADMIN_PERMISSIONS.PRODUCTS_WRITE),
    trackAdminAudit('PRODUCT_DELETE', 'product'),
    deleteProduct
  );

module.exports = router;
