const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

const Product = require('../models/Product');
const { CATEGORY_ENUM_VALUES } = require('../config/constants');

const SORT_MAPPING = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating_desc: { rating: -1 },
  newest: { createdAt: -1 },
  popular: { numReviews: -1 },
};

const createValidationError = (message, validationErrors) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.validationErrors = validationErrors;
  return error;
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const parsePositiveInteger = (value, defaultValue) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return defaultValue;
  }

  return parsedValue;
};

const parseBooleanValue = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return undefined;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseArrayPayload = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
    try {
      return JSON.parse(trimmedValue);
    } catch (error) {
      return null;
    }
  }

  return [trimmedValue];
};

const normalizeImages = (imagesInput) => {
  const rawImages = parseArrayPayload(imagesInput);

  if (!Array.isArray(rawImages)) {
    return null;
  }

  return rawImages
    .map((image) => String(image || '').trim())
    .filter(Boolean);
};

const normalizeSpecs = (specsInput) => {
  const rawSpecs = parseArrayPayload(specsInput);

  if (!Array.isArray(rawSpecs)) {
    return {
      specs: null,
      errorMessage: 'Thông số kỹ thuật phải là mảng',
    };
  }

  const normalizedSpecs = [];

  for (let index = 0; index < rawSpecs.length; index += 1) {
    const currentSpec = rawSpecs[index];

    if (!currentSpec || typeof currentSpec !== 'object' || Array.isArray(currentSpec)) {
      return {
        specs: null,
        errorMessage: `Thông số tại vị trí ${index + 1} không hợp lệ`,
      };
    }

    const key = String(currentSpec.key || '').trim();
    const value = String(currentSpec.value || '').trim();

    if (!key || !value) {
      return {
        specs: null,
        errorMessage: `Thông số tại vị trí ${index + 1} phải có key và value`,
      };
    }

    normalizedSpecs.push({ key, value });
  }

  return {
    specs: normalizedSpecs,
    errorMessage: null,
  };
};

const isDuplicateSkuError = (error) => {
  if (!error || error.code !== 11000) {
    return false;
  }

  if (error.keyPattern && error.keyPattern.sku) {
    return true;
  }

  if (error.keyValue && hasOwn(error.keyValue, 'sku')) {
    return true;
  }

  return false;
};

const buildCreateProductPayload = (body) => {
  const validationErrors = [];
  const payload = {};

  const name = String(body.name || '').trim();
  if (!name) {
    validationErrors.push({
      field: 'name',
      message: 'Vui lòng nhập tên sản phẩm',
    });
  } else {
    payload.name = name;
  }

  const sku = String(body.sku || '').trim().toUpperCase();
  if (!sku) {
    validationErrors.push({
      field: 'sku',
      message: 'Vui lòng nhập mã SKU',
    });
  } else {
    payload.sku = sku;
  }

  const category = String(body.category || '').trim();
  if (!category) {
    validationErrors.push({
      field: 'category',
      message: 'Vui lòng chọn danh mục',
    });
  } else if (!CATEGORY_ENUM_VALUES.includes(category)) {
    validationErrors.push({
      field: 'category',
      message: 'Danh mục không hợp lệ',
    });
  } else {
    payload.category = category;
  }

  payload.subcategory = String(body.subcategory || '').trim();

  const brand = String(body.brand || '').trim();
  if (!brand) {
    validationErrors.push({
      field: 'brand',
      message: 'Vui lòng nhập thương hiệu',
    });
  } else {
    payload.brand = brand;
  }

  const normalizedImages = normalizeImages(body.images);
  if (normalizedImages == null) {
    validationErrors.push({
      field: 'images',
      message: 'Danh sách ảnh sản phẩm không hợp lệ',
    });
  } else if (normalizedImages.length === 0) {
    validationErrors.push({
      field: 'images',
      message: 'Vui lòng thêm ít nhất 1 ảnh sản phẩm',
    });
  } else {
    payload.images = normalizedImages;
  }

  if (body.price === undefined || body.price === null || String(body.price).trim() === '') {
    validationErrors.push({
      field: 'price',
      message: 'Vui lòng nhập giá sản phẩm',
    });
  } else {
    const parsedPrice = Number(body.price);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      validationErrors.push({
        field: 'price',
        message: 'Giá sản phẩm phải là số >= 0',
      });
    } else {
      payload.price = parsedPrice;
    }
  }

  if (
    body.countInStock === undefined
    || body.countInStock === null
    || String(body.countInStock).trim() === ''
  ) {
    validationErrors.push({
      field: 'countInStock',
      message: 'Vui lòng nhập số lượng tồn kho',
    });
  } else {
    const parsedCountInStock = Number(body.countInStock);

    if (!Number.isInteger(parsedCountInStock) || parsedCountInStock < 0) {
      validationErrors.push({
        field: 'countInStock',
        message: 'Số lượng tồn kho phải là số nguyên >= 0',
      });
    } else {
      payload.countInStock = parsedCountInStock;
    }
  }

  const description = String(body.description || '').trim();
  if (!description) {
    validationErrors.push({
      field: 'description',
      message: 'Vui lòng nhập mô tả sản phẩm',
    });
  } else {
    payload.description = description;
  }

  if (hasOwn(body, 'salePrice')) {
    if (body.salePrice === null || body.salePrice === '') {
      payload.salePrice = null;
    } else {
      const parsedSalePrice = Number(body.salePrice);

      if (!Number.isFinite(parsedSalePrice)) {
        validationErrors.push({
          field: 'salePrice',
          message: 'Giá khuyến mãi phải là số hợp lệ',
        });
      } else if (parsedSalePrice < 0) {
        validationErrors.push({
          field: 'salePrice',
          message: 'Giá khuyến mãi không được âm',
        });
      } else {
        payload.salePrice = parsedSalePrice;
      }
    }
  }

  if (hasOwn(body, 'isFeatured')) {
    const parsedIsFeatured = parseBooleanValue(body.isFeatured);

    if (typeof parsedIsFeatured !== 'boolean') {
      validationErrors.push({
        field: 'isFeatured',
        message: 'isFeatured phải là true hoặc false',
      });
    } else {
      payload.isFeatured = parsedIsFeatured;
    }
  }

  if (hasOwn(body, 'specs')) {
    const { specs, errorMessage } = normalizeSpecs(body.specs);

    if (errorMessage) {
      validationErrors.push({
        field: 'specs',
        message: errorMessage,
      });
    } else {
      payload.specs = specs;
    }
  }

  if (
    typeof payload.salePrice === 'number'
    && typeof payload.price === 'number'
    && payload.salePrice >= payload.price
  ) {
    validationErrors.push({
      field: 'salePrice',
      message: 'Giá khuyến mãi phải nhỏ hơn giá gốc',
    });
  }

  return { payload, validationErrors };
};

const buildUpdateProductPayload = (body, currentProduct) => {
  const validationErrors = [];
  const payload = {};

  if (hasOwn(body, 'name')) {
    const name = String(body.name || '').trim();

    if (!name) {
      validationErrors.push({
        field: 'name',
        message: 'Vui lòng nhập tên sản phẩm',
      });
    } else {
      payload.name = name;
    }
  }

  if (hasOwn(body, 'sku')) {
    const sku = String(body.sku || '').trim().toUpperCase();

    if (!sku) {
      validationErrors.push({
        field: 'sku',
        message: 'Vui lòng nhập mã SKU',
      });
    } else {
      payload.sku = sku;
    }
  }

  if (hasOwn(body, 'category')) {
    const category = String(body.category || '').trim();

    if (!category) {
      validationErrors.push({
        field: 'category',
        message: 'Vui lòng chọn danh mục',
      });
    } else if (!CATEGORY_ENUM_VALUES.includes(category)) {
      validationErrors.push({
        field: 'category',
        message: 'Danh mục không hợp lệ',
      });
    } else {
      payload.category = category;
    }
  }

  if (hasOwn(body, 'subcategory')) {
    payload.subcategory = String(body.subcategory || '').trim();
  }

  if (hasOwn(body, 'brand')) {
    const brand = String(body.brand || '').trim();

    if (!brand) {
      validationErrors.push({
        field: 'brand',
        message: 'Vui lòng nhập thương hiệu',
      });
    } else {
      payload.brand = brand;
    }
  }

  if (hasOwn(body, 'images')) {
    const normalizedImages = normalizeImages(body.images);

    if (normalizedImages == null) {
      validationErrors.push({
        field: 'images',
        message: 'Danh sách ảnh sản phẩm không hợp lệ',
      });
    } else if (normalizedImages.length === 0) {
      validationErrors.push({
        field: 'images',
        message: 'Sản phẩm phải có ít nhất 1 ảnh',
      });
    } else {
      payload.images = normalizedImages;
    }
  }

  if (hasOwn(body, 'price')) {
    if (body.price === null || body.price === '' || typeof body.price === 'undefined') {
      validationErrors.push({
        field: 'price',
        message: 'Vui lòng nhập giá sản phẩm',
      });
    } else {
      const parsedPrice = Number(body.price);

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        validationErrors.push({
          field: 'price',
          message: 'Giá sản phẩm phải là số >= 0',
        });
      } else {
        payload.price = parsedPrice;
      }
    }
  }

  if (hasOwn(body, 'salePrice')) {
    if (body.salePrice === null || body.salePrice === '') {
      payload.salePrice = null;
    } else {
      const parsedSalePrice = Number(body.salePrice);

      if (!Number.isFinite(parsedSalePrice)) {
        validationErrors.push({
          field: 'salePrice',
          message: 'Giá khuyến mãi phải là số hợp lệ',
        });
      } else if (parsedSalePrice < 0) {
        validationErrors.push({
          field: 'salePrice',
          message: 'Giá khuyến mãi không được âm',
        });
      } else {
        payload.salePrice = parsedSalePrice;
      }
    }
  }

  if (hasOwn(body, 'countInStock')) {
    const parsedCountInStock = Number(body.countInStock);

    if (!Number.isInteger(parsedCountInStock) || parsedCountInStock < 0) {
      validationErrors.push({
        field: 'countInStock',
        message: 'Số lượng tồn kho phải là số nguyên >= 0',
      });
    } else {
      payload.countInStock = parsedCountInStock;
    }
  }

  if (hasOwn(body, 'description')) {
    const description = String(body.description || '').trim();

    if (!description) {
      validationErrors.push({
        field: 'description',
        message: 'Vui lòng nhập mô tả sản phẩm',
      });
    } else {
      payload.description = description;
    }
  }

  if (hasOwn(body, 'isFeatured')) {
    const parsedIsFeatured = parseBooleanValue(body.isFeatured);

    if (typeof parsedIsFeatured !== 'boolean') {
      validationErrors.push({
        field: 'isFeatured',
        message: 'isFeatured phải là true hoặc false',
      });
    } else {
      payload.isFeatured = parsedIsFeatured;
    }
  }

  if (hasOwn(body, 'specs')) {
    const { specs, errorMessage } = normalizeSpecs(body.specs);

    if (errorMessage) {
      validationErrors.push({
        field: 'specs',
        message: errorMessage,
      });
    } else {
      payload.specs = specs;
    }
  }

  const candidatePrice = hasOwn(payload, 'price') ? payload.price : currentProduct.price;
  const candidateSalePrice = hasOwn(payload, 'salePrice')
    ? payload.salePrice
    : currentProduct.salePrice;

  if (
    typeof candidateSalePrice === 'number'
    && typeof candidatePrice === 'number'
    && candidateSalePrice >= candidatePrice
  ) {
    validationErrors.push({
      field: 'salePrice',
      message: 'Giá khuyến mãi phải nhỏ hơn giá gốc',
    });
  }

  return { payload, validationErrors };
};

const validateReviewPayload = (body) => {
  const validationErrors = [];
  let rating;
  let comment;

  if (body.rating === undefined || body.rating === null || String(body.rating).trim() === '') {
    validationErrors.push({
      field: 'rating',
      message: 'Vui lòng chọn đánh giá',
    });
  } else {
    const parsedRating = Number(body.rating);

    if (!Number.isFinite(parsedRating)) {
      validationErrors.push({
        field: 'rating',
        message: 'Đánh giá phải là số hợp lệ',
      });
    } else if (parsedRating < 1 || parsedRating > 5) {
      validationErrors.push({
        field: 'rating',
        message: 'Đánh giá phải trong khoảng từ 1 đến 5',
      });
    } else {
      rating = parsedRating;
    }
  }

  comment = String(body.comment || '').trim();

  if (!comment) {
    validationErrors.push({
      field: 'comment',
      message: 'Vui lòng nhập nhận xét',
    });
  } else if (comment.length > 1000) {
    validationErrors.push({
      field: 'comment',
      message: 'Nhận xét không được vượt quá 1000 ký tự',
    });
  }

  return {
    rating,
    comment,
    validationErrors,
  };
};

const getProducts = asyncHandler(async (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 10);
  const skip = (page - 1) * limit;

  const filters = { isActive: true };

  const keyword = String(req.query.keyword || '').trim();
  if (keyword) {
    filters.$text = { $search: keyword };
  }

  const category = String(req.query.category || '').trim();
  if (category) {
    filters.category = category;
  }

  const brand = String(req.query.brand || '').trim();
  if (brand) {
    filters.brand = {
      $regex: `^${escapeRegex(brand)}$`,
      $options: 'i',
    };
  }

  const minPrice = Number(req.query.minPrice);
  if (Number.isFinite(minPrice) && minPrice >= 0) {
    filters.price = {
      ...(filters.price || {}),
      $gte: minPrice,
    };
  }

  const maxPrice = Number(req.query.maxPrice);
  if (Number.isFinite(maxPrice) && maxPrice >= 0) {
    filters.price = {
      ...(filters.price || {}),
      $lte: maxPrice,
    };
  }

  const minRating = Number(req.query.minRating);
  if (Number.isFinite(minRating)) {
    const normalizedMinRating = Math.min(Math.max(minRating, 1), 5);
    filters.rating = { $gte: normalizedMinRating };
  }

  const isFeatured = parseBooleanValue(req.query.isFeatured);
  if (typeof isFeatured === 'boolean') {
    filters.isFeatured = isFeatured;
  }

  const sortKey = String(req.query.sort || 'newest').trim();
  const sortOption = SORT_MAPPING[sortKey] || SORT_MAPPING.newest;

  const total = await Product.countDocuments(filters);
  const products = await Product.find(filters)
    .select('-reviews -specs -description')
    .sort(sortOption)
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      page,
      limit,
      total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  });
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .select('name slug category brand images price salePrice rating numReviews');

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách sản phẩm nổi bật thành công',
    data: products,
  });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    {
      $match: { isActive: true },
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        count: -1,
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        count: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Lấy danh mục sản phẩm thành công',
    data: categories,
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  res.status(200).json({
    success: true,
    message: 'Lấy chi tiết sản phẩm thành công',
    data: product,
  });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();

  const product = await Product.findOne({
    slug,
    isActive: true,
  });

  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  res.status(200).json({
    success: true,
    message: 'Lấy chi tiết sản phẩm thành công',
    data: product,
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const { payload, validationErrors } = buildCreateProductPayload(req.body || {});

  if (validationErrors.length > 0) {
    throw createValidationError('Vui lòng nhập đầy đủ thông tin sản phẩm', validationErrors);
  }

  const existingSkuProduct = await Product.findOne({ sku: payload.sku });

  if (existingSkuProduct) {
    res.status(409);
    throw new Error('SKU đã tồn tại');
  }

  let createdProduct;

  try {
    createdProduct = await Product.create(payload);
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      res.status(409);
      throw new Error('SKU đã tồn tại');
    }

    throw error;
  }

  res.status(201).json({
    success: true,
    message: 'Tạo sản phẩm thành công',
    data: {
      _id: createdProduct._id,
      name: createdProduct.name,
      slug: createdProduct.slug,
    },
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  const product = await Product.findById(productId);

  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  const { payload, validationErrors } = buildUpdateProductPayload(req.body || {}, product);

  if (validationErrors.length > 0) {
    throw createValidationError('Dữ liệu cập nhật sản phẩm không hợp lệ', validationErrors);
  }

  if (Object.keys(payload).length === 0) {
    throw createValidationError('Dữ liệu cập nhật sản phẩm không hợp lệ', [
      {
        field: 'body',
        message: 'Vui lòng gửi ít nhất 1 trường cần cập nhật',
      },
    ]);
  }

  if (payload.sku) {
    const existingSkuProduct = await Product.findOne({
      sku: payload.sku,
      _id: { $ne: product._id },
    });

    if (existingSkuProduct) {
      res.status(409);
      throw new Error('SKU đã tồn tại');
    }
  }

  Object.assign(product, payload);

  try {
    await product.save();
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      res.status(409);
      throw new Error('SKU đã tồn tại');
    }

    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Cập nhật sản phẩm thành công',
    data: product,
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  const product = await Product.findById(productId);

  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Đã ẩn sản phẩm thành công',
    data: null,
  });
});

const createProductReview = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  const alreadyReviewed = product.reviews.some(
    (review) => review.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    res.status(400);
    throw new Error('Bạn đã đánh giá sản phẩm này rồi');
  }

  const { rating, comment, validationErrors } = validateReviewPayload(req.body || {});

  if (validationErrors.length > 0) {
    throw createValidationError('Dữ liệu đánh giá không hợp lệ', validationErrors);
  }

  product.reviews.push({
    user: req.user._id,
    name: req.user.name,
    rating,
    comment,
  });

  product.numReviews = product.reviews.length;

  const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
  product.rating = product.numReviews > 0
    ? Number((totalRating / product.numReviews).toFixed(1))
    : 0;

  await product.save();

  res.status(201).json({
    success: true,
    message: 'Đã thêm đánh giá thành công',
    data: null,
  });
});

module.exports = {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
};
