import { formatPrice } from '../../utils/helpers';
import EmptyState from '../common/EmptyState';
import './OrderItemList.css';

const getProductKey = (item, index) => {
  const product = item?.product;

  if (product && typeof product === 'object' && product._id) {
    return String(product._id);
  }

  if (product) {
    return String(product);
  }

  if (item?.name) {
    return `${item.name}-${index}`;
  }

  return `order-item-${index}`;
};

const OrderItemList = ({ items = [] }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <EmptyState
        title="Đơn hàng chưa có sản phẩm"
        description="Không tìm thấy thông tin sản phẩm trong đơn hàng này."
      />
    );
  }

  return (
    <div className="order-item-list">
      {items.map((item, index) => {
        const qty = Math.max(1, Number(item?.qty || 1));
        const price = Number(item?.price || 0);
        const subtotal = qty * price;

        return (
          <article key={getProductKey(item, index)} className="order-item-list__item">
            <img
              src={item?.image || 'https://placehold.co/120x120?text=No+Image'}
              alt={item?.name || 'Sản phẩm'}
              loading="lazy"
            />

            <div className="order-item-list__main">
              <h3>{item?.name || 'Sản phẩm không rõ tên'}</h3>
              <p>Số lượng: {qty}</p>
            </div>

            <div className="order-item-list__price">
              <p>{formatPrice(price)} x {qty}</p>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default OrderItemList;
