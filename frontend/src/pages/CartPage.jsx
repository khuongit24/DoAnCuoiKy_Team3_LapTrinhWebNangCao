import toast from 'react-hot-toast';
import { FiTrash2 } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { cartItems, updateQty, removeFromCart, clearCart } = useCart();

  const hasItems = Array.isArray(cartItems) && cartItems.length > 0;

  const handleQuantityChange = (productId, qty) => {
    updateQty(productId, qty);
  };

  const handleRemoveItem = (productId) => {
    removeFromCart(productId);
    toast('Đã xóa sản phẩm khỏi giỏ hàng');
  };

  const handleClearCart = () => {
    const shouldClear = window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?');

    if (!shouldClear) {
      return;
    }

    clearCart();
    toast.success('Đã xóa toàn bộ giỏ hàng');
  };

  const handleCheckout = () => {
    if (!hasItems) {
      return;
    }

    if (isAuthenticated) {
      navigate('/checkout');
      return;
    }

    navigate('/login', {
      state: {
        from: {
          pathname: '/checkout',
        },
      },
    });
  };

  if (!hasItems) {
    return (
      <section className="cart-page container">
        <EmptyState
          title="Giỏ hàng của bạn trống"
          description="Hãy khám phá danh sách sản phẩm và thêm những món bạn quan tâm vào giỏ hàng."
          action={
            <Link to="/products" className="btn btn-primary">
              Tiếp tục mua sắm
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="cart-page container">
      <header className="cart-page__header">
        <h1>Giỏ hàng của bạn</h1>

        <button type="button" className="btn btn-outline" onClick={handleClearCart}>
          <FiTrash2 /> Xóa tất cả
        </button>
      </header>

      <div className="cart-page__layout">
        <div className="cart-page__items">
          {cartItems.map((item) => {
            const productId = item?._id || item?.id || item?.slug;

            return (
              <CartItem
                key={productId}
                item={item}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
              />
            );
          })}
        </div>

        <CartSummary cartItems={cartItems} onCheckout={handleCheckout} />
      </div>
    </section>
  );
};

export default CartPage;