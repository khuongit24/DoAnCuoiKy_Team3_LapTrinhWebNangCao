const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

const User = require('../models/User');
const { USER_ROLE_VALUES } = require('../config/constants');

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const PHONE_REGEX = /^(0[35789])[0-9]{8}$/;

const PROFILE_ALLOWED_FIELDS = ['name', 'email', 'avatar'];
const PROFILE_BLOCKED_FIELDS = ['password', 'role'];

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

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: total === 0 ? 0 : Math.ceil(total / limit),
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

  return null;
};

const buildProfileUpdatePayload = (rawBody) => {
  const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
  const validationErrors = [];
  const payload = {};

  PROFILE_BLOCKED_FIELDS.forEach((field) => {
    if (hasOwn(body, field)) {
      validationErrors.push({
        field,
        message: `Không được cập nhật trường ${field} ở endpoint này`,
      });
    }
  });

  Object.keys(body)
    .filter((field) => !PROFILE_ALLOWED_FIELDS.includes(field) && !PROFILE_BLOCKED_FIELDS.includes(field))
    .forEach((field) => {
      validationErrors.push({
        field,
        message: `Trường ${field} không được phép cập nhật`,
      });
    });

  if (hasOwn(body, 'name')) {
    const name = String(body.name || '').trim();

    if (!name) {
      validationErrors.push({
        field: 'name',
        message: 'Vui lòng nhập tên',
      });
    } else {
      payload.name = name;
    }
  }

  if (hasOwn(body, 'email')) {
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      validationErrors.push({
        field: 'email',
        message: 'Vui lòng nhập email',
      });
    } else if (!EMAIL_REGEX.test(email)) {
      validationErrors.push({
        field: 'email',
        message: 'Email không hợp lệ',
      });
    } else {
      payload.email = email;
    }
  }

  if (hasOwn(body, 'avatar')) {
    payload.avatar = String(body.avatar || '').trim();
  }

  if (Object.keys(payload).length === 0 && validationErrors.length === 0) {
    validationErrors.push({
      field: 'body',
      message: 'Không có dữ liệu hợp lệ để cập nhật',
    });
  }

  return {
    payload,
    validationErrors,
  };
};

const buildShippingAddressPayload = (rawBody) => {
  const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};

  const fullName = String(body.fullName || '').trim();
  const phone = String(body.phone || '').trim();
  const address = String(body.address || '').trim();
  const city = String(body.city || '').trim();
  const province = String(body.province || '').trim();

  const validationErrors = [];

  if (!fullName) {
    validationErrors.push({
      field: 'fullName',
      message: 'Vui lòng nhập họ tên người nhận',
    });
  }

  if (!phone) {
    validationErrors.push({
      field: 'phone',
      message: 'Vui lòng nhập số điện thoại',
    });
  } else if (!PHONE_REGEX.test(phone)) {
    validationErrors.push({
      field: 'phone',
      message: 'Số điện thoại không hợp lệ',
    });
  }

  if (!address) {
    validationErrors.push({
      field: 'address',
      message: 'Vui lòng nhập địa chỉ',
    });
  }

  if (!city) {
    validationErrors.push({
      field: 'city',
      message: 'Vui lòng nhập quận/huyện',
    });
  }

  if (!province) {
    validationErrors.push({
      field: 'province',
      message: 'Vui lòng nhập tỉnh/thành phố',
    });
  }

  const parsedIsDefault = hasOwn(body, 'isDefault')
    ? parseBooleanValue(body.isDefault)
    : undefined;

  if (parsedIsDefault === null) {
    validationErrors.push({
      field: 'isDefault',
      message: 'isDefault phải là true hoặc false',
    });
  }

  const addressId = hasOwn(body, 'addressId')
    ? String(body.addressId || '').trim()
    : '';

  if (hasOwn(body, 'addressId') && !addressId) {
    validationErrors.push({
      field: 'addressId',
      message: 'addressId không hợp lệ',
    });
  }

  return {
    addressId,
    fullName,
    phone,
    address,
    city,
    province,
    isDefault: parsedIsDefault,
    validationErrors,
  };
};

const ensureAdminUser = (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Không có quyền thực hiện hành động này');
  }
};

const getUserProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin người dùng thành công',
    data: req.user,
  });
});

const updateUserProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const { payload, validationErrors } = buildProfileUpdatePayload(req.body || {});

  if (validationErrors.length > 0) {
    throw createValidationError('Dữ liệu cập nhật profile không hợp lệ', validationErrors);
  }

  if (payload.email && payload.email !== req.user.email) {
    const emailInUse = await User.findOne({
      email: payload.email,
      _id: { $ne: req.user._id },
    });

    if (emailInUse) {
      res.status(409);
      throw new Error('Email đã được sử dụng');
    }
  }

  Object.assign(req.user, payload);
  const updatedUser = await req.user.save();

  res.status(200).json({
    success: true,
    message: 'Cập nhật profile thành công',
    data: updatedUser,
  });
});

const updateShippingAddress = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const {
    addressId,
    fullName,
    phone,
    address,
    city,
    province,
    isDefault,
    validationErrors,
  } = buildShippingAddressPayload(req.body || {});

  if (validationErrors.length > 0) {
    throw createValidationError('Vui lòng nhập đầy đủ thông tin địa chỉ', validationErrors);
  }

  const user = req.user;

  if (addressId) {
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      res.status(404);
      throw new Error('Không tìm thấy địa chỉ');
    }

    const existingAddress = user.shippingAddresses.id(addressId);

    if (!existingAddress) {
      res.status(404);
      throw new Error('Không tìm thấy địa chỉ');
    }

    if (isDefault === true) {
      user.shippingAddresses.forEach((item) => {
        item.isDefault = false;
      });
    }

    existingAddress.fullName = fullName;
    existingAddress.phone = phone;
    existingAddress.address = address;
    existingAddress.city = city;
    existingAddress.province = province;

    if (typeof isDefault === 'boolean') {
      existingAddress.isDefault = isDefault;
    }
  } else {
    if (isDefault === true) {
      user.shippingAddresses.forEach((item) => {
        item.isDefault = false;
      });
    }

    user.shippingAddresses.push({
      fullName,
      phone,
      address,
      city,
      province,
      isDefault: typeof isDefault === 'boolean' ? isDefault : false,
    });
  }

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    message: 'Cập nhật địa chỉ thành công',
    data: {
      shippingAddresses: updatedUser.shippingAddresses,
    },
  });
});

const deleteShippingAddress = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const addressId = req.params.addressId;

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    res.status(404);
    throw new Error('Không tìm thấy địa chỉ');
  }

  const user = req.user;
  const existingAddress = user.shippingAddresses.id(addressId);

  if (!existingAddress) {
    res.status(404);
    throw new Error('Không tìm thấy địa chỉ');
  }

  const wasDefault = existingAddress.isDefault;

  user.shippingAddresses.pull(addressId);

  if (wasDefault && user.shippingAddresses.length > 0) {
    user.shippingAddresses[0].isDefault = true;
  }

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    message: 'Đã xóa địa chỉ thành công',
    data: {
      shippingAddresses: updatedUser.shippingAddresses,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Không có quyền truy cập, vui lòng đăng nhập');
  }

  const { currentPassword, newPassword } = req.body || {};
  const validationErrors = [];

  if (!currentPassword || !String(currentPassword).trim()) {
    validationErrors.push({
      field: 'currentPassword',
      message: 'Vui lòng nhập mật khẩu hiện tại',
    });
  }

  if (!newPassword || !String(newPassword).trim()) {
    validationErrors.push({
      field: 'newPassword',
      message: 'Vui lòng nhập mật khẩu mới',
    });
  } else if (String(newPassword).length < 6) {
    validationErrors.push({
      field: 'newPassword',
      message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
    });
  }

  if (validationErrors.length > 0) {
    throw createValidationError('Dữ liệu đổi mật khẩu không hợp lệ', validationErrors);
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Không tìm thấy user');
  }

  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    res.status(401);
    throw new Error('Mật khẩu hiện tại không đúng');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Đổi mật khẩu thành công',
    data: null,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  ensureAdminUser(req, res);

  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 10);
  const skip = (page - 1) * limit;

  const keyword = String(req.query.keyword || '').trim();
  const filters = {};

  if (keyword) {
    filters.$or = [
      {
        name: {
          $regex: escapeRegex(keyword),
          $options: 'i',
        },
      },
      {
        email: {
          $regex: escapeRegex(keyword),
          $options: 'i',
        },
      },
    ];
  }

  const total = await User.countDocuments(filters);
  const users = await User.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: users,
    pagination: buildPagination(page, limit, total),
  });
});

const getUserById = asyncHandler(async (req, res) => {
  ensureAdminUser(req, res);

  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(404);
    throw new Error('Không tìm thấy user');
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('Không tìm thấy user');
  }

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin người dùng thành công',
    data: user,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  ensureAdminUser(req, res);

  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(404);
    throw new Error('Không tìm thấy user');
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};

  const bodyKeys = Object.keys(body);

  if (bodyKeys.length === 0) {
    throw createValidationError('Dữ liệu cập nhật user không hợp lệ', [
      {
        field: 'role',
        message: 'Vui lòng chọn role cần cập nhật',
      },
    ]);
  }

  const forbiddenFields = bodyKeys.filter((field) => field !== 'role');

  if (forbiddenFields.length > 0) {
    throw createValidationError('Chỉ được phép cập nhật role', forbiddenFields.map((field) => ({
      field,
      message: `Không được cập nhật trường ${field} ở endpoint này`,
    })));
  }

  const role = String(body.role || '').trim().toLowerCase();

  if (!USER_ROLE_VALUES.includes(role)) {
    throw createValidationError('Dữ liệu cập nhật user không hợp lệ', [
      {
        field: 'role',
        message: 'Role phải là user hoặc admin',
      },
    ]);
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('Không tìm thấy user');
  }

  const roleChanged = user.role !== role;

  user.role = role;

  if (roleChanged) {
    const currentPermissionsVersion = Number.parseInt(user.permissionsVersion, 10);
    user.permissionsVersion = Number.isNaN(currentPermissionsVersion) || currentPermissionsVersion < 1
      ? 2
      : currentPermissionsVersion + 1;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Cập nhật user thành công',
    data: {
      _id: user._id,
      name: user.name,
      role: user.role,
      permissionsVersion: user.permissionsVersion,
    },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  ensureAdminUser(req, res);

  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(404);
    throw new Error('Không tìm thấy user');
  }

  if (req.user._id.toString() === userId) {
    res.status(400);
    throw new Error('Không thể tự xóa chính mình');
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('Không tìm thấy user');
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Đã xóa user thành công',
    data: null,
  });
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateShippingAddress,
  deleteShippingAddress,
  changePassword,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};