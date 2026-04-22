import { FiArrowRight } from 'react-icons/fi';

import { SHIPPING_FREE_THRESHOLD } from '../../utils/constants';
import { calculateCartTotals, formatPrice } from '../../utils/helpers';
import './CartSummary.css';

const CartSummary = ({ cartItems = [], onCheckout }) => {
  const { itemsCount, subtotal, shippingFee, total } = calculateCartTotals(cartItems);
  const isEmptyCart = !Array.isArray(cartItems) || cartItems.length === 0;

  return (
    <aside className="cart-summary surface">
      <h2>Tóm tắt giỏ hàng</h2>

      <dl>
        <div>
          <dt>Số lượng sản phẩm</dt>
          <dd>{itemsCount}</dd>
        </div>
        <div>
          <dt>Tạm tính</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div>
          <dt>Phí vận chuyển</dt>
          <dd>{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</dd>
        </div>
      </dl>

      <p className="cart-summary__note">
        Miễn phí vận chuyển cho đơn từ {formatPrice(SHIPPING_FREE_THRESHOLD)} trở lên.
      </p>

      <div className="cart-summary__total">
        <span>Tổng cộng</span>
        <strong>{formatPrice(total)}</strong>
      </div>

      <button type="button" className="btn btn-primary" disabled={isEmptyCart} onClick={onCheckout}>
        Tiến hành đặt hàng <FiArrowRight />
      </button>
    </aside>
  );
};

export default CartSummary;