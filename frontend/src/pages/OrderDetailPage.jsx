import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiCreditCard } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';

import { getOrderById, updateOrderToPaid } from '../api/orderApi';
import Loader from '../components/common/Loader';
import Message from '../components/common/Message';
import OrderItemList from '../components/order/OrderItemList';
import OrderStatusBadge from '../components/order/OrderStatusBadge';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../utils/errorUtils';
import { formatDateTime, formatPrice } from '../utils/helpers';
import './OrderDetailPage.css';

const ONLINE_PAYMENT_METHODS = new Set(['BankTransfer', 'Stripe']);

const extractDataObject = (response) => {
  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return response;
  }

  return null;
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getOrderById(id);

        if (!isMounted) {
          return;
        }

        setOrder(extractDataObject(response));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setOrder(null);
        setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết đơn hàng'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const canPayOnline = useMemo(() => {
    if (!order) {
      return false;
    }

    return !order.isPaid && ONLINE_PAYMENT_METHODS.has(order.paymentMethod);
  }, [order]);

  const handleMarkPaid = async () => {
    if (!order?._id || !canPayOnline) {
      return;
    }

    const shouldMarkPaid = window.confirm('Xác nhận cập nhật đơn hàng này đã thanh toán?');

    if (!shouldMarkPaid) {
      return;
    }

    setPaying(true);

    try {
      const response = await updateOrderToPaid(order._id, {
        id: `manual-${Date.now()}`,
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: String(user?.email || '').trim(),
      });

      const paymentData = extractDataObject(response) || {};

      setOrder((previous) => ({
        ...previous,
        isPaid: paymentData.isPaid ?? true,
        paidAt: paymentData.paidAt || new Date().toISOString(),
      }));

      toast.success(response?.message || 'Cập nhật thanh toán thành công');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Không thể cập nhật trạng thái thanh toán'));
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <Loader fullPage text="Đang tải chi tiết đơn hàng..." />;
  }

  if (!order || error) {
    return (
      <section className="order-detail-page container">
        <Message variant="error">{error || 'Không tìm thấy đơn hàng'}</Message>

        <Link to="/orders" className="btn btn-outline">
          Quay lại danh sách đơn hàng
        </Link>
      </section>
    );
  }

  return (
    <section className="order-detail-page container">
      <header className="order-detail-page__header">
        <div>
          <h1>Chi tiết đơn hàng</h1>
          <p>Mã đơn: {order._id}</p>
          <p>Ngày tạo: {formatDateTime(order.createdAt)}</p>
        </div>

        <OrderStatusBadge status={order.status} />
      </header>

      <div className="order-detail-page__layout">
        <div className="order-detail-page__main surface">
          <section className="order-detail-page__section">
            <h2>Sản phẩm trong đơn</h2>
            <OrderItemList items={order.orderItems || []} />
          </section>
        </div>

        <aside className="order-detail-page__sidebar">
          <section className="order-detail-page__card surface">
            <h2>Giao hàng</h2>
            <p>
              <strong>{order.shippingAddress?.fullName || '--'}</strong>
            </p>
            <p>{order.shippingAddress?.phone || '--'}</p>
            <p>
              {order.shippingAddress?.address || '--'}, {order.shippingAddress?.city || '--'},{' '}
              {order.shippingAddress?.province || '--'}
            </p>
          </section>

          <section className="order-detail-page__card surface">
            <h2>Thanh toán</h2>
            <p>Phương thức: {order.paymentMethod || '--'}</p>
            <p>
              Trạng thái:{' '}
              {order.isPaid ? (
                <strong className="order-detail-page__paid-text">
                  Đã thanh toán ({formatDateTime(order.paidAt)})
                </strong>
              ) : (
                <strong className="order-detail-page__unpaid-text">Chưa thanh toán</strong>
              )}
            </p>

            {canPayOnline ? (
              <button type="button" className="btn btn-primary" onClick={handleMarkPaid} disabled={paying}>
                <FiCreditCard /> {paying ? 'Đang xử lý...' : 'Thanh toán'}
              </button>
            ) : null}
          </section>

          <section className="order-detail-page__card surface">
            <h2>Tổng kết thanh toán</h2>

            <dl>
              <div>
                <dt>Tiền hàng</dt>
                <dd>{formatPrice(order.itemsPrice || 0)}</dd>
              </div>
              <div>
                <dt>Vận chuyển</dt>
                <dd>{(order.shippingPrice || 0) === 0 ? 'Miễn phí' : formatPrice(order.shippingPrice)}</dd>
              </div>
              <div className="order-detail-page__total-row">
                <dt>Tổng cộng</dt>
                <dd>{formatPrice(order.totalPrice || 0)}</dd>
              </div>
            </dl>
          </section>

          <Link to="/orders" className="btn btn-outline order-detail-page__back-btn">
            <FiCheckCircle /> Về danh sách đơn hàng
          </Link>
        </aside>
      </div>
    </section>
  );
};

export default OrderDetailPage;
