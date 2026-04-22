const CATEGORY_ENUM_VALUES = [
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
  'Cooler',
  'Monitor',
  'Keyboard',
  'Mouse',
  'Headset',
];

const ORDER_STATUS_VALUES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const PAYMENT_METHOD_VALUES = ['COD', 'BankTransfer', 'Stripe'];

const USER_ROLE_VALUES = ['user', 'admin'];

const SHIPPING_FREE_THRESHOLD = 2000000;
const SHIPPING_FLAT_FEE = 30000;

module.exports = {
  CATEGORY_ENUM_VALUES,
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  USER_ROLE_VALUES,
  SHIPPING_FREE_THRESHOLD,
  SHIPPING_FLAT_FEE,
};
