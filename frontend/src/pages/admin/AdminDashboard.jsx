import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDollarSign, FiPackage, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { getAllOrders } from '../../api/orderApi';
import { getProducts } from '../../api/productApi';
import { getUsers } from '../../api/userApi';
import StatsCard from '../../components/admin/StatsCard';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Message from '../../components/common/Message';
import { useAuth } from '../../hooks/useAuth';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { getApiErrorMessageWithRequestId } from '../../utils/errorUtils';
import { formatDateTime, formatPrice } from '../../utils/helpers';
import './AdminDashboard.css';

const RECENT_ORDERS_LIMIT = 10;
const COUNT_QUERY_LIMIT = 1;

const INITIAL_DASHBOARD_STATE = {
  totalOrders: 0,
  totalRevenue: 0,
  totalUsers: 0,
  totalProducts: 0,
  recentOrders: [],
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

const toFiniteNumber = (value, fallbackValue = 0) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }

  return parsedValue;
};

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const extractPagination = (response, fallbackPage = 1, fallbackLimit = RECENT_ORDERS_LIMIT) => {
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

const sumOrderRevenue = (orders) => {
  const normalizedOrders = Array.isArray(orders) ? orders : [];

  return normalizedOrders.reduce((sum, order) => {
    const currentTotal = Math.max(0, toFiniteNumber(order?.totalPrice, 0));
    return sum + currentTotal;
  }, 0);
};

const countOrderItems = (orderItems) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return 0;
  }

  return orderItems.reduce((total, item) => total + Math.max(0, toFiniteNumber(item?.qty, 0)), 0);
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

const toTimestamp = (dateValue) => {
  const timestamp = new Date(dateValue).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return timestamp;
};

const sortOrdersByNewest = (orders) => {
  const normalizedOrders = Array.isArray(orders) ? orders : [];

  return normalizedOrders.slice().sort((firstOrder, secondOrder) => {
    return toTimestamp(secondOrder?.createdAt) - toTimestamp(firstOrder?.createdAt);
  });
};

const fetchRevenueAcrossAllOrderPages = async (firstPageResponse) => {
  const firstPageOrders = extractDataArray(firstPageResponse);
  const firstPagePagination = extractPagination(firstPageResponse, 1, RECENT_ORDERS_LIMIT);

  let totalRevenue = sumOrderRevenue(firstPageOrders);
  const failedPages = [];

  if (firstPagePagination.pages <= 1) {
    return { totalRevenue, failedPages };
  }

  const pageNumbers = Array.from({ length: firstPagePagination.pages - 1 }, (_, index) => index + 2);

  const pageResults = await Promise.allSettled(
    pageNumbers.map((pageNumber) => getAllOrders({
      page: pageNumber,
      limit: firstPagePagination.limit,
    }))
  );

  pageResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      totalRevenue += sumOrderRevenue(extractDataArray(result.value));
      return;
    }

    failedPages.push(pageNumbers[index]);
  });

  return {
    totalRevenue,
    failedPages,
  };
};

const formatCount = (value) => {
  const normalizedValue = Math.max(0, parseNonNegativeInteger(value, 0));
  return new Intl.NumberFormat('vi-VN').format(normalizedValue);
};

const AdminDashboard = () => {
  const { isAdminSessionAuthenticated } = useAuth();
  const [dashboardState, setDashboardState] = useState(INITIAL_DASHBOARD_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      if (!isAdminSessionAuthenticated) {
        setDashboardState(INITIAL_DASHBOARD_STATE);
        setError('');
        setWarning('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setWarning('');

      const nextState = {
        ...INITIAL_DASHBOARD_STATE,
      };

      const warningMessages = [];
      const errorMessages = [];

      const [ordersResult, usersResult, productsResult] = await Promise.allSettled([
        getAllOrders({
          page: 1,
          limit: RECENT_ORDERS_LIMIT,
        }),
        getUsers({
          page: 1,
          limit: COUNT_QUERY_LIMIT,
        }),
        getProducts({
          page: 1,
          limit: COUNT_QUERY_LIMIT,
        }),
      ]);

      if (!isMounted) {
        return;
      }

      if (ordersResult.status === 'fulfilled') {
        const orderResponse = ordersResult.value;
        const newestOrders = sortOrdersByNewest(extractDataArray(orderResponse));
        const orderPagination = extractPagination(orderResponse, 1, RECENT_ORDERS_LIMIT);

        nextState.recentOrders = newestOrders.slice(0, RECENT_ORDERS_LIMIT);
        nextState.totalOrders = orderPagination.total > 0 ? orderPagination.total : nextState.recentOrders.length;

        const revenueResult = await fetchRevenueAcrossAllOrderPages(orderResponse);

        if (!isMounted) {
          return;
        }

        nextState.totalRevenue = revenueResult.totalRevenue;

        if (revenueResult.failedPages.length > 0) {
          warningMessages.push(
            `Doanh thu đang là tạm tính. Không thể tải dữ liệu ở trang đơn hàng: ${revenueResult.failedPages.join(', ')}.`
          );
        }
      } else {
        errorMessages.push(
          getApiErrorMessageWithRequestId(
            ordersResult.reason,
            'Không thể tải dữ liệu đơn hàng trên bảng điều khiển admin.'
          )
        );
      }

      if (usersResult.status === 'fulfilled') {
        const usersPagination = extractPagination(usersResult.value, 1, COUNT_QUERY_LIMIT);
        const users = extractDataArray(usersResult.value);

        nextState.totalUsers = usersPagination.total > 0 ? usersPagination.total : users.length;
      } else {
        warningMessages.push(
          getApiErrorMessageWithRequestId(usersResult.reason, 'Không thể tải tổng số người dùng.')
        );
      }

      if (productsResult.status === 'fulfilled') {
        const productsPagination = extractPagination(productsResult.value, 1, COUNT_QUERY_LIMIT);
        const products = extractDataArray(productsResult.value);

        nextState.totalProducts = productsPagination.total > 0 ? productsPagination.total : products.length;
      } else {
        warningMessages.push(
          getApiErrorMessageWithRequestId(productsResult.reason, 'Không thể tải tổng số sản phẩm.')
        );
      }

      if (!isMounted) {
        return;
      }

      setDashboardState(nextState);

      if (errorMessages.length > 0) {
        const nextError = errorMessages.join(' ');
        setError(nextError);
        toast.error(nextError);
      }

      if (warningMessages.length > 0) {
        const nextWarning = warningMessages.join(' ');
        setWarning(nextWarning);
        toast(nextWarning);
      }

      setLoading(false);
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [isAdminSessionAuthenticated]);

  const hasRecentOrders = dashboardState.recentOrders.length > 0;

  const statsCards = useMemo(
    () => [
      {
        key: 'orders',
        icon: <FiShoppingBag />,
        value: formatCount(dashboardState.totalOrders),
        label: 'Tổng đơn hàng',
        color: 'var(--color-primary-600)',
      },
      {
        key: 'revenue',
        icon: <FiDollarSign />,
        value: formatPrice(dashboardState.totalRevenue),
        label: 'Doanh thu',
        color: 'var(--color-accent-600)',
      },
      {
        key: 'users',
        icon: <FiUsers />,
        value: formatCount(dashboardState.totalUsers),
        label: 'Người dùng',
        color: 'var(--color-info-500)',
      },
      {
        key: 'products',
        icon: <FiPackage />,
        value: formatCount(dashboardState.totalProducts),
        label: 'Sản phẩm',
        color: 'var(--color-success-500)',
      },
    ],
    [dashboardState.totalOrders, dashboardState.totalProducts, dashboardState.totalRevenue, dashboardState.totalUsers]
  );

  return (
    <section className="admin-page admin-dashboard" aria-labelledby="admin-dashboard-title">
      <header className="admin-dashboard__header">
        <div>
          <h1 id="admin-dashboard-title" className="admin-page__title">Tổng quan bảng điều khiển</h1>
          <p className="admin-page__description">Theo dõi nhanh doanh thu, đơn hàng và các chỉ số hệ thống.</p>
        </div>
      </header>

      {loading ? <Loader text="Đang tải dữ liệu bảng điều khiển admin..." /> : null}

      <div className="admin-dashboard__messages" aria-live="polite">
        {error ? (
          <Message variant="error" onClose={() => setError('')}>
            {error}
          </Message>
        ) : null}

        {warning ? (
          <Message variant="warning" onClose={() => setWarning('')}>
            {warning}
          </Message>
        ) : null}
      </div>

      <section className="admin-dashboard__stats-grid" aria-label="Thống kê tổng quan admin">
        {statsCards.map((card) => (
          <StatsCard
            key={card.key}
            icon={card.icon}
            value={card.value}
            label={card.label}
            color={card.color}
          />
        ))}
      </section>

      <section className="admin-dashboard__recent surface" aria-labelledby="admin-dashboard-recent-title">
        <div className="admin-dashboard__recent-head">
          <h2 id="admin-dashboard-recent-title">Đơn hàng gần nhất</h2>
          <p>{hasRecentOrders ? `Hiển thị ${dashboardState.recentOrders.length} đơn mới nhất.` : 'Chưa có đơn hàng gần đây.'}</p>
        </div>

        {!loading && !hasRecentOrders ? (
          <EmptyState
            title="Chưa có đơn hàng"
            description="Khi có đơn hàng mới, bảng đơn hàng gần nhất sẽ hiển thị tại đây."
          />
        ) : null}

        {hasRecentOrders ? (
          <div className="admin-dashboard__table-wrap" role="region" aria-label="Bảng đơn hàng gần nhất">
            <table className="admin-dashboard__table">
              <caption className="sr-only">Danh sách đơn hàng gần nhất</caption>
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Số SP</th>
                  <th scope="col">Tổng tiền</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Hành động</th>
                </tr>
              </thead>

              <tbody>
                {dashboardState.recentOrders.map((order, index) => {
                  const orderId = String(order?._id || '').trim();
                  const orderCode = formatOrderCode(orderId);

                  return (
                    <tr key={orderId || `${order?.createdAt || 'order'}-${index + 1}`}>
                      <td>
                        {orderId ? (
                          <Link
                            to={`/orders/${orderId}`}
                            className="admin-dashboard__order-code"
                            title={orderId}
                            aria-label={`Xem chi tiết đơn hàng ${orderId}`}
                          >
                            #{orderCode}
                          </Link>
                        ) : (
                          <span>#{orderCode}</span>
                        )}
                      </td>
                      <td>{extractCustomerName(order)}</td>
                      <td>{countOrderItems(order?.orderItems)}</td>
                      <td>{formatPrice(order?.totalPrice || 0)}</td>
                      <td>
                        <OrderStatusBadge status={order?.status} />
                      </td>
                      <td>{formatDateTime(order?.createdAt)}</td>
                      <td>
                        {orderId ? (
                          <Link
                            to={`/orders/${orderId}`}
                            className="btn btn-outline admin-dashboard__action-link"
                            aria-label={`Mở trang chi tiết đơn hàng ${orderId}`}
                          >
                            Xem chi tiết
                          </Link>
                        ) : (
                          <span className="admin-dashboard__action-unavailable">Không có liên kết</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
};

export default AdminDashboard;
