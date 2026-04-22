import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { formatPrice, getEffectivePrice } from '../../utils/helpers';
import './CartItem.css';

const FALLBACK_IMAGE = 'https://placehold.co/300x300?text=TechShop';

const getProductId = (item) => item?._id || item?.id;

const CartItem = ({ item, onQuantityChange, onRemove }) => {
  const productId = getProductId(item);
  const parsedStock = Number(item?.countInStock);
  const maxQty = Number.isFinite(parsedStock)
    ? Math.max(1, Math.floor(parsedStock))
    : Math.max(1, Math.floor(Number(item?.qty || 1)));
  const currentQty = Math.min(maxQty, Math.max(1, Number(item?.qty || 1)));
  const unitPrice = getEffectivePrice(item);
  const subTotal = unitPrice * currentQty;
  const image = item?.images?.[0] || item?.image || FALLBACK_IMAGE;
  const productLink = item?.slug ? `/products/${item.slug}` : '/products';

  const triggerQuantityChange = (nextQty) => {
    if (!productId || typeof onQuantityChange !== 'function') {
      return;
    }

    const normalizedQty = Math.min(maxQty, Math.max(1, Number(nextQty) || 1));
    onQuantityChange(productId, normalizedQty);
  };

  const handleRemove = () => {
    if (!productId || typeof onRemove !== 'function') {
      return;
    }

    const shouldRemove = window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?');

    if (shouldRemove) {
      onRemove(productId);
    }
  };

  return (
    <article className="cart-item surface">
      <Link className="cart-item__image" to={productLink}>
        <img src={image} alt={item?.name || 'Sản phẩm trong giỏ hàng'} loading="lazy" />
      </Link>

      <div className="cart-item__content">
        <h3>
          <Link to={productLink}>{item?.name || 'Sản phẩm đang cập nhật'}</Link>
        </h3>
        <p className="cart-item__price">Đơn giá: {formatPrice(unitPrice)}</p>
        <p className="cart-item__stock">Tồn kho: {maxQty}</p>
      </div>

      <div className="cart-item__controls">
        <div className="cart-item__qty" aria-label="Điều chỉnh số lượng sản phẩm">
          <button type="button" onClick={() => triggerQuantityChange(currentQty - 1)} disabled={currentQty <= 1}>
            <FiMinus />
          </button>

          <input
            type="number"
            min="1"
            max={maxQty}
            value={currentQty}
            onChange={(event) => triggerQuantityChange(event.target.value)}
          />

          <button
            type="button"
            onClick={() => triggerQuantityChange(currentQty + 1)}
            disabled={currentQty >= maxQty}
          >
            <FiPlus />
          </button>
        </div>

        <strong className="cart-item__subtotal">{formatPrice(subTotal)}</strong>

        <button type="button" className="cart-item__remove" onClick={handleRemove} aria-label="Xóa sản phẩm">
          <FiTrash2 />
          Xóa
        </button>
      </div>
    </article>
  );
};

export default CartItem;