export const CATEGORIES = [
  'Laptop',
  'PC',
  'CPU',
  'GPU',
  'RAM',
  'SSD',
  'HDD',
  'Mainboard',
  'PSU',
  'Case',
  'Tản nhiệt',
  'Màn hình',
  'Bàn phím',
  'Chuột máy tính',
  'Tai nghe',
];

export const ORDER_STATUSES = {
  pending: {
    label: 'Chờ xác nhận',
    color: '#d97706',
  },
  processing: {
    label: 'Đang xử lý',
    color: '#2563eb',
  },
  shipped: {
    label: 'Đang giao',
    color: '#0284c7',
  },
  delivered: {
    label: 'Đã giao',
    color: '#16a34a',
  },
  cancelled: {
    label: 'Đã hủy',
    color: '#dc2626',
  },
};

export const SORT_OPTIONS = [
  { label: 'Mới nhất', value: 'newest' },
  { label: 'Giá tăng dần', value: 'price_asc' },
  { label: 'Giá giảm dần', value: 'price_desc' },
  { label: 'Đánh giá cao nhất', value: 'rating_desc' },
  { label: 'Phổ biến nhất', value: 'popular' },
];

export const PAYMENT_METHODS = [
  { label: 'Thanh toán khi nhận hàng', value: 'COD' },
  { label: 'Chuyển khoản ngân hàng', value: 'BankTransfer' },
  { label: 'Thanh toán Stripe', value: 'Stripe' },
];

export const SHIPPING_FREE_THRESHOLD = 2000000;
export const SHIPPING_FLAT_FEE = 30000;

export const ADMIN_PANEL_ACCESS_PERMISSION = 'admin:panel:access';

export const ADMIN_AUDIT_ACTION_OPTIONS = [
  { value: 'PRODUCT_CREATE', label: 'Tạo sản phẩm' },
  { value: 'PRODUCT_UPDATE', label: 'Cập nhật sản phẩm' },
  { value: 'PRODUCT_DELETE', label: 'Xóa sản phẩm' },
  { value: 'ORDER_STATUS_UPDATE', label: 'Đổi trạng thái đơn hàng' },
  { value: 'USER_ROLE_UPDATE', label: 'Đổi vai trò người dùng' },
  { value: 'USER_DELETE', label: 'Xóa người dùng' },
];

export const ADMIN_AUDIT_RESOURCE_TYPE_OPTIONS = [
  { value: 'product', label: 'Sản phẩm' },
  { value: 'order', label: 'Đơn hàng' },
  { value: 'user', label: 'Người dùng' },
];

export const ADMIN_AUDIT_STATUS_OPTIONS = [
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'FAILED', label: 'Thất bại' },
];

export const ADMIN_NAV_ITEMS = [
  { label: 'Bảng điều khiển', path: '/admin/dashboard' },
  { label: 'Sản phẩm', path: '/admin/products' },
  { label: 'Đơn hàng', path: '/admin/orders' },
  { label: 'Người dùng', path: '/admin/users' },
  { label: 'Nhật ký kiểm toán', path: '/admin/audit-logs' },
];
