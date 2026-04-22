import { format } from 'date-fns';

import { SHIPPING_FLAT_FEE, SHIPPING_FREE_THRESHOLD } from './constants';

export const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0 \u20AB';
  }

  return `${new Intl.NumberFormat('vi-VN').format(number)} \u20AB`;
};

export const formatDate = (dateString) => {
  if (!dateString) {
    return '--/--/----';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '--/--/----';
  }

  return format(date, 'dd/MM/yyyy');
};

export const formatDateTime = (dateString) => {
  if (!dateString) {
    return '--/--/---- --:--';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '--/--/---- --:--';
  }

  return format(date, 'dd/MM/yyyy HH:mm');
};

export const truncateText = (text, maxLength = 120) => {
  const normalizedText = String(text || '');

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

export const getDiscountPercent = (price, salePrice) => {
  const normalPrice = Number(price);
  const discountPrice = Number(salePrice);

  if (!Number.isFinite(normalPrice) || !Number.isFinite(discountPrice) || normalPrice <= 0) {
    return '0%';
  }

  if (discountPrice >= normalPrice) {
    return '0%';
  }

  const percent = Math.round(((normalPrice - discountPrice) / normalPrice) * 100);
  return `-${percent}%`;
};

export const getEffectivePrice = (item = {}) => {
  const salePrice = Number(item?.salePrice);

  if (Number.isFinite(salePrice) && salePrice >= 0) {
    return salePrice;
  }

  const originalPrice = Number(item?.price);

  if (Number.isFinite(originalPrice) && originalPrice >= 0) {
    return originalPrice;
  }

  return 0;
};

export const calculateShippingFee = (subtotal) => {
  const normalizedSubtotal = Number(subtotal);

  if (!Number.isFinite(normalizedSubtotal) || normalizedSubtotal <= 0) {
    return SHIPPING_FLAT_FEE;
  }

  return normalizedSubtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT_FEE;
};

export const calculateCartTotals = (items = []) => {
  const normalizedItems = Array.isArray(items) ? items : [];

  const itemsCount = normalizedItems.reduce(
    (total, item) => total + Math.max(0, Number(item?.qty || 0)),
    0
  );

  const subtotal = normalizedItems.reduce((total, item) => {
    const qty = Math.max(0, Number(item?.qty || 0));
    return total + getEffectivePrice(item) * qty;
  }, 0);

  const shippingFee = normalizedItems.length > 0 ? calculateShippingFee(subtotal) : 0;

  return {
    itemsCount,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
  };
};
