export const getApiErrorPayload = (error) => error?.response?.data || {};

export const getApiRequestId = (error) => {
  const payload = getApiErrorPayload(error);
  const requestId = String(payload?.requestId || '').trim();

  if (requestId) {
    return requestId;
  }

  const headerRequestId = String(
    error?.response?.headers?.['x-request-id']
    || error?.response?.headers?.['X-Request-Id']
    || ''
  ).trim();

  return headerRequestId;
};

export const getApiErrorMessage = (error, fallbackMessage = 'Đã xảy ra lỗi, vui lòng thử lại') => {
  const payload = getApiErrorPayload(error);

  if (payload.message) {
    return payload.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const getApiErrorMessageWithRequestId = (
  error,
  fallbackMessage = 'Đã xảy ra lỗi, vui lòng thử lại'
) => {
  const message = getApiErrorMessage(error, fallbackMessage);
  const requestId = getApiRequestId(error);

  if (!requestId) {
    return message;
  }

  return `${message} (Mã yêu cầu: ${requestId})`;
};

export const getFieldErrors = (error) => {
  const payload = getApiErrorPayload(error);

  if (!Array.isArray(payload.errors)) {
    return {};
  }

  return payload.errors.reduce((accumulator, item) => {
    if (item?.field && item?.message) {
      accumulator[item.field] = item.message;
    }

    return accumulator;
  }, {});
};
