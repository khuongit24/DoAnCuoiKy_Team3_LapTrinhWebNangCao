const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

const AuditLog = require('../models/AuditLog');

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

const parseDateValue = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const getAuditLogs = asyncHandler(async (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = Math.min(parsePositiveInteger(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const filters = {};

  const action = String(req.query.action || '').trim();
  if (action) {
    filters.action = action;
  }

  const status = String(req.query.status || '').trim().toUpperCase();
  if (status) {
    if (!['SUCCESS', 'FAILED'].includes(status)) {
      res.status(400);
      throw new Error('status chỉ nhận SUCCESS hoặc FAILED');
    }

    filters.status = status;
  }

  const resourceType = String(req.query.resourceType || '').trim();
  if (resourceType) {
    filters['resource.type'] = resourceType;
  }

  const resourceId = String(req.query.resourceId || '').trim();
  if (resourceId) {
    filters['resource.id'] = resourceId;
  }

  const actorId = String(req.query.actorId || '').trim();
  if (actorId) {
    if (!mongoose.Types.ObjectId.isValid(actorId)) {
      res.status(400);
      throw new Error('actorId không hợp lệ');
    }

    filters['actor.userId'] = actorId;
  }

  const requestId = String(req.query.requestId || '').trim();
  if (requestId) {
    filters.requestId = requestId;
  }

  const from = parseDateValue(req.query.from);
  const to = parseDateValue(req.query.to);

  if (req.query.from && !from) {
    res.status(400);
    throw new Error('from không hợp lệ, yêu cầu định dạng ngày hợp lệ');
  }

  if (req.query.to && !to) {
    res.status(400);
    throw new Error('to không hợp lệ, yêu cầu định dạng ngày hợp lệ');
  }

  if (from || to) {
    filters.timestamp = {};

    if (from) {
      filters.timestamp.$gte = from;
    }

    if (to) {
      filters.timestamp.$lte = to;
    }
  }

  const total = await AuditLog.countDocuments(filters);
  const logs = await AuditLog.find(filters)
    .sort({ timestamp: -1, _id: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    message: 'Lấy nhật ký kiểm toán thành công',
    data: logs,
    pagination: buildPagination(page, limit, total),
  });
});

module.exports = {
  getAuditLogs,
};
