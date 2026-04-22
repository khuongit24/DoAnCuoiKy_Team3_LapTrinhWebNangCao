import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { getAllOrders, updateOrderStatus } from '../../api/orderApi';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Message from '../../components/common/Message';
import Pagination from '../../components/common/Pagination';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { formatDateTime, formatPrice } from '../../utils/helpers';
import './OrderManage.css';

const PAGE_SIZE = 10;
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const VALID_ORDER_STATUSES = STATUS_FILTER_OPTIONS.slice(1).map((option) => option.value);

const STATUS_TRANSITION_MAP = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const parsePositiveInteger = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return fallbackValue;
  }

  return parsedValue;
};

const parseNonNegativeInteger = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return fallbackValue;
  }

  return parsedValue;
};

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.orders)) {
    return response.orders;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const extractPagination = (response, fallbackPage = 1, fallbackLimit = PAGE_SIZE) => {
  const rawPagination = response?.pagination && typeof response.pagination === 'object'
    ? response.pagination
    : response?.data?.pagination && typeof response.data.pagination === 'object'
      ? response.data.pagination
      : {};

  const page = parsePositiveInteger(rawPagination?.page, fallbackPage);
  const limit = parsePositiveInteger(rawPagination?.limit, fallbackLimit);
  const total = Math.max(0, parseNonNegativeInteger(rawPagination?.total, 0));
  const inferredPages = total === 0 ? 0 : Math.ceil(total / limit);
  const pages = Math.max(0, parseNonNegativeInteger(rawPagination?.pages, inferredPages));

  return {
    page,
    limit,
    total,
    pages,
  };
};

const normalizeStatusValue = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!VALID_ORDER_STATUSES.includes(normalizedStatus)) {
    return '';
  }

  return normalizedStatus;
};

const normalizeStatusFilter = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (VALID_ORDER_STATUSES.includes(normalizedStatus)) {
    return normalizedStatus;
  }

  return 'all';
};

const getStatusLabel = (statusValue) => {
  const matchedOption = STATUS_FILTER_OPTIONS.find((option) => option.value === statusValue);
  return matchedOption?.label || statusValue;
};

const countOrderItems = (orderItems) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return 0;
  }

  return orderItems.reduce((total, item) => total + Math.max(0, Number(item?.qty || 0)), 0);
};

const extractCustomerName = (order) => {
  const userName = String(order?.user?.name || '').trim();
  if (userName) {
    return userName;
  }

  const shippingName = String(order?.shippingAddress?.fullName || '').trim();
  if (shippingName) {
    return shippingName;
  }

  const userEmail = String(order?.user?.email || '').trim();
  if (userEmail) {
    return userEmail;
  }

  return 'Khách hàng';
};

const formatOrderCode = (orderId) => {
  const normalizedId = String(orderId || '').trim();

  if (!normalizedId) {
    return '--';
  }

  if (normalizedId.length <= 8) {
    return normalizedId.toUpperCase();
  }

  return normalizedId.slice(-8).toUpperCase();
};

const isValidStatusTransition = (currentStatus, nextStatus) => {
  const allowedStatuses = STATUS_TRANSITION_MAP[currentStatus] || [];
  return allowedStatuses.includes(nextStatus);
};

const buildInvalidTransitionMessage = (currentStatus, nextStatus) => {
  if (!currentStatus || !nextStatus) {
    return 'Trạng thái đơn hàng không hợp lệ.';
  }

  if (currentStatus === nextStatus) {
    return 'Trạng thái mới phải khác trạng thái hiện tại.';
  }

  const allowedStatuses = STATUS_TRANSITION_MAP[currentStatus] || [];

  if (allowedStatuses.length === 0) {
    return `Trạng thái "${currentStatus}" không có bước chuyển tiếp hợp lệ.`;
  }

  return `Không thể chuyển từ "${currentStatus}" sang "${nextStatus}". Cho phép: ${allowedStatuses.join(', ')}.`;
};

const OrderManage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveInteger(searchParams.get('page'), 1);
  const statusFilter = normalizeStatusFilter(searchParams.get('status'));

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusDraftById, setStatusDraftById] = useState({});
  const [savingStatusById, setSavingStatusById] = useState({});
  const [rowErrorsById, setRowErrorsById] = useState({});

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getAllOrders({
          page,
          limit: PAGE_SIZE,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        });

        if (!isMounted) {
          return;
        }

        const orderData = extractDataArray(response);
        const nextPagination = extractPagination(response, page, PAGE_SIZE);

        if (nextPagination.pages > 0 && page > nextPagination.pages) {
          setSearchParams((previousParams) => {
            const nextParams = new URLSearchParams(previousParams);
            nextParams.set('page', String(nextPagination.pages));

            if (statusFilter === 'all') {
              nextParams.delete('status');
            } else {
              nextParams.set('status', statusFilter);
            }

            return nextParams;
          }, { replace: true });
          return;
        }

        setOrders(orderData);
        setPagination(nextPagination);
        setStatusDraftById((previousDrafts) => {
          const nextDrafts = {};

          orderData.forEach((order) => {
            const orderId = String(order?._id || '').trim();
            if (!orderId) {
              return;
            }

            const currentStatus = normalizeStatusValue(order?.status);
            const previousDraft = normalizeStatusValue(previousDrafts[orderId]);

            nextDrafts[orderId] = previousDraft || currentStatus;
          });

          return nextDrafts;
        });
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setOrders([]);
        setPagination({
          page,
          pages: 0,
          total: 0,
          limit: PAGE_SIZE,
        });
        setError(getApiErrorMessage(requestError, 'Không thể tải danh sách đơn hàng admin'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [page, setSearchParams, statusFilter]);

  const hasOrders = useMemo(() => Array.isArray(orders) && orders.length > 0, [orders]);

  const handleFilterChange = (event) => {
    const nextStatusFilter = normalizeStatusFilter(event.target.value);

    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set('page', '1');

      if (nextStatusFilter === 'all') {
        nextParams.delete('status');
      } else {
        nextParams.set('status', nextStatusFilter);
      }

      return nextParams;
    });
  };

  const handlePageChange = (nextPage) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set('page', String(nextPage));

      if (statusFilter === 'all') {
        nextParams.delete('status');
      } else {
        nextParams.set('status', statusFilter);
      }

      return nextParams;
    });
  };

  const handleStatusDraftChange = (orderId, nextStatus) => {
    const normalizedStatus = normalizeStatusValue(nextStatus);

    setStatusDraftById((previousDrafts) => ({
      ...previousDrafts,
      [orderId]: normalizedStatus,
    }));

    setRowErrorsById((previousErrors) => {
      if (!previousErrors[orderId]) {
        return previousErrors;
      }

      const nextErrors = { ...previousErrors };
      delete nextErrors[orderId];
      return nextErrors;
    });
  };

  const handleSaveOrderStatus = async (order) => {
    const orderId = String(order?._id || '').trim();

    if (!orderId) {
      return;
    }

    const currentStatus = normalizeStatusValue(order?.status);
    const nextStatus = normalizeStatusValue(statusDraftById[orderId]) || currentStatus;

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      setRowErrorsById((previousErrors) => ({
        ...previousErrors,
        [orderId]: buildInvalidTransitionMessage(currentStatus, nextStatus),
      }));
      return;
    }

    setSavingStatusById((previousState) => ({
      ...previousState,
      [orderId]: true,
    }));

    try {
      const response = await updateOrderStatus(orderId, nextStatus);
      const updatedStatus = normalizeStatusValue(response?.data?.status || response?.status || nextStatus) || nextStatus;

      setOrders((previousOrders) => previousOrders.map((item) => {
        if (String(item?._id || '').trim() !== orderId) {
          return item;
        }

        return {
          ...item,
          status: updatedStatus,
        };
      }));

      setStatusDraftById((previousDrafts) => ({
        ...previousDrafts,
        [orderId]: updatedStatus,
      }));

      setRowErrorsById((previousErrors) => {
        if (!previousErrors[orderId]) {
          return previousErrors;
        }

        const nextErrors = { ...previousErrors };
        delete nextErrors[orderId];
        return nextErrors;
      });
    } catch (requestError) {
      setRowErrorsById((previousErrors) => ({
        ...previousErrors,
        [orderId]: getApiErrorMessage(requestError, 'Không thể cập nhật trạng thái đơn hàng'),
      }));
    } finally {
      setSavingStatusById((previousState) => ({
        ...previousState,
        [orderId]: false,
      }));
    }
  };

  if (loading && !hasOrders) {
    return <Loader fullPage text="Đang tải danh sách đơn hàng admin..." />;
  }

  return (
    <section className="admin-page order-manage" aria-labelledby="admin-order-manage-title">
      <header className="order-manage__header">
        <div>
          <h1 id="admin-order-manage-title" className="admin-page__title">Quản lý đơn hàng</h1>
          <p className="admin-page__description">Theo dõi, lọc và cập nhật trạng thái đơn hàng trên hệ thống.</p>
        </div>
      </header>

      <section className="order-manage__toolbar surface" aria-label="Bộ lọc đơn hàng admin">
        <div className="form-group order-manage__filter-group">
          <label className="form-label" htmlFor="admin-order-status-filter">Lọc theo trạng thái</label>
          <select
            id="admin-order-status-filter"
            className="form-select"
            value={statusFilter}
            onChange={handleFilterChange}
            aria-label="Lọc đơn hàng theo trạng thái"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? (
        <Message variant="error" onClose={() => setError('')}>
          {error}
        </Message>
      ) : null}

      {loading && hasOrders ? <Loader inline text="Đang cập nhật danh sách đơn hàng..." /> : null}

      {!loading && !error && !hasOrders ? (
        <EmptyState
          title="Không có đơn hàng phù hợp"
          description="Thử đổi trạng thái lọc hoặc quay lại sau để kiểm tra đơn hàng mới."
        />
      ) : null}

      {hasOrders ? (
        <>
          <div className="order-manage__table-wrap surface" role="region" aria-label="Bảng đơn hàng admin">
            <table className="order-manage__table">
              <caption className="sr-only">Danh sách đơn hàng trong trang quản trị</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Số lượng SP</th>
                  <th scope="col">Tổng tiền</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Hành động</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order, index) => {
                  const orderId = String(order?._id || '').trim();
                  const currentStatus = normalizeStatusValue(order?.status);
                  const selectedStatus = normalizeStatusValue(statusDraftById[orderId]) || currentStatus;
                  const isSavingStatus = Boolean(savingStatusById[orderId]);
                  const canSave =
                    Boolean(orderId) &&
                    Boolean(currentStatus) &&
                    Boolean(selectedStatus) &&
                    selectedStatus !== currentStatus &&
                    !isSavingStatus;
                  const rowError = rowErrorsById[orderId];

                  return (
                    <tr key={orderId || `${order?.createdAt || 'order'}-${index + 1}`}>
                      <td>
                        {orderId ? (
                          <Link
                            to={`/orders/${orderId}`}
                            className="order-manage__order-id"
                            title={orderId}
                            aria-label={`Xem chi tiết đơn hàng ${orderId}`}
                          >
                            #{formatOrderCode(orderId)}
                          </Link>
                        ) : (
                          <span>--</span>
                        )}
                      </td>
                      <td>{extractCustomerName(order)}</td>
                      <td>{countOrderItems(order?.orderItems)}</td>
                      <td>{formatPrice(order?.totalPrice || 0)}</td>
                      <td>
                        <OrderStatusBadge status={currentStatus} />
                      </td>
                      <td>{formatDateTime(order?.createdAt)}</td>
                      <td>
                        <div className="order-manage__actions">
                          {orderId ? (
                            <Link
                              to={`/orders/${orderId}`}
                              className="btn btn-outline order-manage__view-btn"
                              aria-label={`Mở chi tiết đơn hàng ${orderId}`}
                            >
                              Xem chi tiết
                            </Link>
                          ) : (
                            <span className="order-manage__action-unavailable">Không có liên kết</span>
                          )}

                          <div className="order-manage__status-editor">
                            <label htmlFor={`order-status-${orderId || index}`} className="sr-only">
                              Chọn trạng thái mới cho đơn hàng
                            </label>
                            <select
                              id={`order-status-${orderId || index}`}
                              className="form-select order-manage__status-select"
                              value={selectedStatus}
                              onChange={(event) => handleStatusDraftChange(orderId, event.target.value)}
                              disabled={!orderId || isSavingStatus}
                              aria-label={`Chọn trạng thái mới cho đơn ${orderId || formatOrderCode(orderId)}`}
                            >
                              {VALID_ORDER_STATUSES.map((statusValue) => (
                                <option key={statusValue} value={statusValue}>
                                  {getStatusLabel(statusValue)}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="btn btn-primary order-manage__save-btn"
                              onClick={() => handleSaveOrderStatus(order)}
                              disabled={!canSave}
                              aria-label={`Lưu trạng thái đơn ${orderId || formatOrderCode(orderId)}`}
                            >
                              {isSavingStatus ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </div>

                          {rowError ? (
                            <p className="order-manage__row-error" role="alert">
                              {rowError}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading ? (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
                ariaLabel="Phân trang đơn hàng admin"
                itemLabel="đơn hàng"
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default OrderManage;
