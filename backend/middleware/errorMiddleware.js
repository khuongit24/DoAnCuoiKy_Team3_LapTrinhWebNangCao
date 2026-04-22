const { logAdminAuditFailure } = require('./adminAuditMiddleware');

const notFound = (req, res, next) => {
  const error = new Error(`Không tìm thấy - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Lỗi server';
  let errors;

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Không tìm thấy tài nguyên - ID không hợp lệ';
  }

  if (err.validationErrors) {
    statusCode = 400;
    message = err.message || 'Dữ liệu không hợp lệ';
    errors = err.validationErrors;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Dữ liệu không hợp lệ';
    errors = Object.values(err.errors).map((validationError) => ({
      field: validationError.path,
      message: validationError.message,
    }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${duplicateField} đã tồn tại`;
  }

  if (err.name === 'MulterError') {
    statusCode = 400;

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Kích thước file vượt quá giới hạn 5MB';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Số lượng file vượt quá giới hạn cho phép';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Trường file upload không hợp lệ';
    } else {
      message = 'Dữ liệu upload không hợp lệ';
    }
  }

  logAdminAuditFailure(req, res, err, statusCode);

  const payload = {
    success: false,
    message,
    requestId: req.requestId || req.context?.requestId || '',
  };

  if (errors) {
    payload.errors = errors;
  }

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  notFound,
  errorHandler,
};
