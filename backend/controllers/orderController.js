const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

const Order = require('../models/Order');
const Product = require('../models/Product');
const {
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  SHIPPING_FREE_THRESHOLD,
  SHIPPING_FLAT_FEE,
} = require('../config/constants');

const STATUS_NEXT_STEP = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

const createValidationError = (message, validationErrors) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.validationErrors = validationErrors;
  return error;
};

const parsePositiveInteger = (value, defaultValue) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return defaultValue;
  }

  return parsedValue;
};

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: total === 0 ? 0 : Math.ceil(total / limit),
});

const normalizeShippingAddress = (shippingAddressRaw) => {
  const address = shippingAddressRaw && typeof shippingAddressRaw === 'object'
    ? shippingAddressRaw
    : {};

  const shippingAddress = {
    fullName: String(address.fullName || '').trim(),
    phone: String(address.phone || '').trim(),
    address: String(address.address || '').trim(),
    city: String(address.city || '').trim(),
    province: String(address.province || '').trim(),
  };

  const validationErrors = [];

  if (!shippingAddress.fullName) {
    validationErrors.push({
      field: 'shippingAddress.fullName',
      message: 'Vui lòng nhập họ tên người nhận',
    });
  }

  if (!shippingAddress.phone) {
    validationErrors.push({
      field: 'shippingAddress.phone',
      message: 'Vui lòng nhập số điện thoại',
    });
  }

  if (!shippingAddress.address) {
    validationErrors.push({
      field: 'shippingAddress.address',
      message: 'Vui lòng nhập địa chỉ giao hang',
    });
  }

  if (!shippingAddress.city) {
    validationErrors.push({
      field: 'shippingAddress.city',
      message: 'Vui lòng nhập quận/huyện',
    });
  }

  if (!shippingAddress.province) {
    validationErrors.push({
      field: 'shippingAddress.province',
      message: 'Vui lòng nhập tỉnh/thành phố',
    });
  }

  return {
    shippingAddress,
    validationErrors,
  };
};

const normalizeOrderItems = (orderItemsRaw) => {
  if (!Array.isArray(orderItemsRaw)) {
    return {
      orderItems: [],
      validationErrors: [
        {
          field: 'orderItems',
          message: 'Danh sách sản phẩm không hợp lệ',
        },
      ],
    };
  }

  if (orderItemsRaw.length === 0) {
    return {
      orderItems: [],
      validationErrors: [
        {
          field: 'orderItems',
          message: 'Đơn hàng không có sản phẩm nào',
        },
      ],
    };
  }

  const validationErrors = [];
  const itemMap = new Map();

  orderItemsRaw.forEach((item, index) => {
    const fieldBase = `orderItems[${index}]`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      validationErrors.push({
        field: fieldBase,
        message: 'Sản phẩm trong đơn hàng không hợp lệ',
      });
      return;
    }

    const productId = String(item.product || '').trim();
    const qty = Number(item.qty);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      validationErrors.push({
        field: `${fieldBase}.product`,
        message: 'ID sản phẩm không hợp lệ',
      });
    }

    if (!Number.isInteger(qty) || qty < 1) {
      validationErrors.push({
        field: `${fieldBase}.qty`,
        message: 'Số lượng phải là số nguyên >= 1',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId) || !Number.isInteger(qty) || qty < 1) {
      return;
    }

    const existingItem = itemMap.get(productId);

    if (existingItem) {
      existingItem.qty += qty;
      return;
    }

    itemMap.set(productId, {
      product: productId,
      qty,
    });
  });

  return {
    orderItems: Array.from(itemMap.values()),
    validationErrors,
  };
};

const buildOrderOwnerId = (orderUser) => {
  if (!orderUser) {
    return '';
  }

  if (typeof orderUser === 'string') {
    return orderUser;
  }

  if (orderUser._id) {
    return orderUser._id.toString();
  }

  return orderUser.toString();
};

const isOrderOwnerOrAdmin = (order, currentUser) => {
  if (!currentUser) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  const ownerId = buildOrderOwnerId(order.user);
  return ownerId === currentUser._id.toString();
};

const restoreStockForAppliedItems = async (appliedDecrements) => {
  if (appliedDecrements.length === 0) {
    return;
  }

  await Promise.allSettled(
    appliedDecrements.map((item) => Product.updateOne(
      { _id: item.product },
      { $inc: { countInStock: item.qty } }
    ))
  );
};

const validateStatusTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) {
    return {
      valid: false,
      message: 'Trạng thái mới phải khác trạng thái hiện tại',
    };
  }

  if (targetStatus === 'cancelled') {
    if (currentStatus === 'delivered') {
      return {
        valid: false,
        message: 'Không thể chuyển từ trạng thái "delivered" sang "cancelled"',
      };
    }

    return { valid: true };
  }

  if (STATUS_NEXT_STEP[currentStatus] === targetStatus) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Không thể chuyển từ trạng thái "${currentStatus}" sang "${targetStatus}"`,
  };
};

const createOrder = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const {
    orderItems: rawOrderItems,
    shippingAddress: rawShippingAddress,
    paymentMethod: rawPaymentMethod,
  } = req.body || {};

  const { orderItems: normalizedOrderItems, validationErrors: orderItemsValidationErrors } =
    normalizeOrderItems(rawOrderItems);

  const { shippingAddress, validationErrors: shippingValidationErrors } =
    normalizeShippingAddress(rawShippingAddress);

  const paymentMethod = String(rawPaymentMethod || '').trim();
  const payloadValidationErrors = [
    ...orderItemsValidationErrors,
    ...shippingValidationErrors,
  ];

  if (!paymentMethod) {
    payloadValidationErrors.push({
      field: 'paymentMethod',
      message: 'Vui lòng chọn phương thức thanh toán',
    });
  } else if (!PAYMENT_METHOD_VALUES.includes(paymentMethod)) {
    payloadValidationErrors.push({
      field: 'paymentMethod',
      message: 'Phương thức thanh toán không hợp lệ',
    });
  }

  if (payloadValidationErrors.length > 0) {
    throw createValidationError('Dữ liệu đơn hàng không hợp lệ', payloadValidationErrors);
  }

  const productIds = normalizedOrderItems.map((item) => item.product);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  }).select('_id name images price salePrice countInStock isActive');

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const missingProductId = productIds.find((productId) => !productMap.has(productId));
  if (missingProductId) {
    res.status(404);
    throw new Error(`Không tìm thấy sản phẩm với ID: ${missingProductId}`);
  }

  const orderItems = [];
  let itemsPrice = 0;

  for (const item of normalizedOrderItems) {
    const product = productMap.get(item.product);
    const itemPrice = product.salePrice != null ? product.salePrice : product.price;
    const itemImage = Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : '';

    if (!Number.isFinite(itemPrice) || itemPrice < 0) {
      res.status(400);
      throw new Error(`Giá sản phẩm "${product.name}" không hợp lệ`);
    }

    if (!itemImage) {
      res.status(400);
      throw new Error(`Sản phẩm "${product.name}" thiếu ảnh snapshot`);
    }

    if (product.countInStock < item.qty) {
      res.status(400);
      throw new Error(
        `Sản phẩm "${product.name}" không đủ hàng trong kho (còn ${product.countInStock}, yêu cầu ${item.qty})`
      );
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      image: itemImage,
      price: itemPrice,
      qty: item.qty,
    });

    itemsPrice += itemPrice * item.qty;
  }

  const normalizedItemsPrice = roundCurrency(itemsPrice);
  const shippingPrice = normalizedItemsPrice >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT_FEE;
  const totalPrice = roundCurrency(normalizedItemsPrice + shippingPrice);

  const createdOrder = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice: normalizedItemsPrice,
    shippingPrice,
    totalPrice,
  });

  const appliedDecrements = [];
  let failedStockItem = null;
  let stockUpdateError = null;

  for (const item of orderItems) {
    let stockUpdateResult;

    try {
      stockUpdateResult = await Product.updateOne(
        {
          _id: item.product,
          isActive: true,
          countInStock: { $gte: item.qty },
        },
        {
          $inc: { countInStock: -item.qty },
        }
      );
    } catch (error) {
      stockUpdateError = error;
      break;
    }

    if (stockUpdateResult.modifiedCount !== 1) {
      const latestProduct = await Product.findById(item.product)
        .select('countInStock isActive')
        .lean();

      failedStockItem = {
        name: item.name,
        qty: item.qty,
        available: latestProduct && latestProduct.isActive
          ? Number(latestProduct.countInStock || 0)
          : 0,
      };

      break;
    }

    appliedDecrements.push({
      product: item.product,
      qty: item.qty,
    });
  }

  if (stockUpdateError || failedStockItem) {
    await restoreStockForAppliedItems(appliedDecrements);
    await Order.deleteOne({ _id: createdOrder._id });

    if (failedStockItem) {
      res.status(400);
      throw new Error(
        `Sản phẩm "${failedStockItem.name}" không đủ hàng trong kho (còn ${failedStockItem.available}, yêu cầu ${failedStockItem.qty})`
      );
    }

    throw stockUpdateError;
  }

  res.status(201).json({
    success: true,
    message: 'Đặt hàng thành công',
    data: createdOrder,
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 10);
  const skip = (page - 1) * limit;

  const filters = {
    user: req.user._id,
  };

  const total = await Order.countDocuments(filters);
  const orders = await Order.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: buildPagination(page, limit, total),
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }

  const order = await Order.findById(orderId).populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (!isOrderOwnerOrAdmin(order, req.user)) {
    res.status(403);
    throw new Error('Không có quyền xem đơn hàng này');
  }

  res.status(200).json({
    success: true,
    message: 'Lấy chi tiết đơn hàng thành công',
    data: order,
  });
});

const getAllOrders = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Không có quyền thực hiện hành động này');
  }

  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 10);
  const skip = (page - 1) * limit;

  const status = String(req.query.status || '').trim().toLowerCase();
  const filters = {};

  if (status) {
    if (!ORDER_STATUS_VALUES.includes(status)) {
      throw createValidationError('Dữ liệu lọc trạng thái không hợp lệ', [
        {
          field: 'status',
          message: 'Trạng thái phải thuộc pending, processing, shipped, delivered hoặc cancelled',
        },
      ]);
    }

    filters.status = status;
  }

  const total = await Order.countDocuments(filters);
  const orders = await Order.find(filters)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: buildPagination(page, limit, total),
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Không có quyền thực hiện hành động này');
  }

  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }

  const targetStatus = String(req.body?.status || '').trim().toLowerCase();
  if (!ORDER_STATUS_VALUES.includes(targetStatus)) {
    throw createValidationError('Dữ liệu cập nhật trạng thái không hợp lệ', [
      {
        field: 'status',
        message: 'Trạng thái phải thuộc pending, processing, shipped, delivered hoặc cancelled',
      },
    ]);
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }

  const transitionResult = validateStatusTransition(order.status, targetStatus);
  if (!transitionResult.valid) {
    res.status(400);
    throw new Error(transitionResult.message);
  }

  if (targetStatus === 'cancelled') {
    const stockRestoreItems = order.orderItems.map((item) => ({
      product: item.product,
      qty: item.qty,
    }));

    await restoreStockForAppliedItems(stockRestoreItems);
  }

  order.status = targetStatus;
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Cập nhật trạng thái thành công',
    data: {
      _id: order._id,
      status: order.status,
    },
  });
});

const updateOrderToPaid = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }

  const order = await Order.findById(orderId).populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (!isOrderOwnerOrAdmin(order, req.user)) {
    res.status(403);
    throw new Error('Không có quyền cập nhật đơn hàng này');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Đơn hàng đã được thanh toán');
  }

  const paymentResultPayload = {};
  ['id', 'status', 'update_time', 'email_address'].forEach((key) => {
    const value = String(req.body?.[key] || '').trim();
    if (value) {
      paymentResultPayload[key] = value;
    }
  });

  order.isPaid = true;
  order.paidAt = new Date();

  if (Object.keys(paymentResultPayload).length > 0) {
    order.paymentResult = paymentResultPayload;
  }

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Thanh toán thành công',
    data: {
      _id: order._id,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
    },
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid,
};
