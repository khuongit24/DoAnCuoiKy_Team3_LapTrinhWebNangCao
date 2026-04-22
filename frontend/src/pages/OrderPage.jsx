import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { getMyOrders } from '../api/orderApi';
import EmptyState from '../components/common/EmptyState';
import Loader from '../components/common/Loader';
import Message from '../components/common/Message';
import Pagination from '../components/common/Pagination';
import OrderStatusBadge from '../components/order/OrderStatusBadge';
import { getApiErrorMessage } from '../utils/errorUtils';
import { formatDateTime, formatPrice } from '../utils/helpers';
import './OrderPage.css';

const PAGE_SIZE = 10;

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
};

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const countOrderItems = (orderItems) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return 0;
  }

  return orderItems.reduce((total, item) => total + Math.max(0, Number(item?.qty || 0)), 0);
};

const formatOrderCode = (orderId) => {
  const normalized = String(orderId || '');

  if (normalized.length <= 8) {
    return normalized;
  }

  return normalized.slice(-8).toUpperCase();
};

const OrderPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveInteger(searchParams.get('page'), 1);

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getMyOrders({
          page,
          limit: PAGE_SIZE,
        });

        if (!isMounted) {
          return;
        }

        const orderData = extractDataArray(response);
        const paginationPayload = response?.pagination || {};
        const totalPages = Math.max(0, Number(paginationPayload.pages || 0));
        const totalItems = Math.max(0, Number(paginationPayload.total || 0));
        const currentPage = parsePositiveInteger(paginationPayload.page, page);

        if (totalPages > 0 && page > totalPages) {
          setSearchParams({ page: String(totalPages) }, { replace: true });
          return;
        }

        setOrders(orderData);
        setPagination({
          page: currentPage,
          pages: totalPages,
          total: totalItems,
          limit: parsePositiveInteger(paginationPayload.limit, PAGE_SIZE),
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
        setError(getApiErrorMessage(requestError, 'Không thể tải danh sách đơn hàng'));
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
  }, [page, setSearchParams]);

  const hasOrders = useMemo(() => Array.isArray(orders) && orders.length > 0, [orders]);

  const handlePageChange = (nextPage) => {
    setSearchParams({ page: String(nextPage) });
  };

  if (loading && !hasOrders) {
    return <Loader fullPage text="Đang tải danh sách đơn hàng..." />;
  }

  return (
    <section className="order-page container">
      <header className="order-page__header">
        <h1>Đơn hàng của tôi</h1>
        <p>Theo dõi trạng thái xử lý và lịch sử mua sắm của bạn.</p>
      </header>

      {error ? (
        <Message variant="error" onClose={() => setError('')}>
          {error}
        </Message>
      ) : null}

      {!loading && !error && !hasOrders ? (
        <EmptyState
          title="Bạn chưa có đơn hàng nào"
          description="Hãy khám phá danh sách sản phẩm và đặt đơn đầu tiên của bạn."
          action={
            <Link to="/products" className="btn btn-primary">
              Xem sản phẩm
            </Link>
          }
        />
      ) : null}

      {hasOrders ? (
        <>
          <div className="order-page__table-wrap surface">
            <table className="order-page__table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Số sản phẩm</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order?._id}>
                    <td>
                      <Link to={`/orders/${order?._id}`} className="order-page__code-link">
                        #{formatOrderCode(order?._id)}
                      </Link>
                    </td>
                    <td>{countOrderItems(order?.orderItems)}</td>
                    <td>{formatPrice(order?.totalPrice || 0)}</td>
                    <td>
                      <OrderStatusBadge status={order?.status} />
                    </td>
                    <td>{formatDateTime(order?.createdAt)}</td>
                    <td>
                      <Link to={`/orders/${order?._id}`} className="btn btn-outline order-page__detail-btn">
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading ? (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              ariaLabel="Phân trang đơn hàng"
              itemLabel="đơn hàng"
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default OrderPage;
