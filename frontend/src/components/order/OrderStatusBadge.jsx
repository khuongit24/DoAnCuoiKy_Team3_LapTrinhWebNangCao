import './OrderStatusBadge.css';

const STATUS_META = {
  pending: {
    label: 'Chờ xác nhận',
    className: 'order-status-badge--pending',
  },
  processing: {
    label: 'Đang xử lý',
    className: 'order-status-badge--processing',
  },
  shipped: {
    label: 'Đang giao',
    className: 'order-status-badge--shipped',
  },
  delivered: {
    label: 'Đã giao',
    className: 'order-status-badge--delivered',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'order-status-badge--cancelled',
  },
};

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const OrderStatusBadge = ({ status }) => {
  const normalizedStatus = normalizeStatus(status);
  const meta = STATUS_META[normalizedStatus] || {
    label: 'Không xác định',
    className: 'order-status-badge--unknown',
  };

  return <span className={`order-status-badge ${meta.className}`}>{meta.label}</span>;
};

export default OrderStatusBadge;
