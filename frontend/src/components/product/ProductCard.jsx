import { FiShoppingCart } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { formatPrice, getDiscountPercent, getEffectivePrice } from '../../utils/helpers';
import Rating from './Rating';
import './ProductCard.css';

const FALLBACK_IMAGE = 'https://placehold.co/640x640?text=TechShop';

const ProductCard = ({ product, onAddToCart }) => {
  const price = Number(product?.price || 0);
  const salePrice = Number(product?.salePrice);
  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = Number.isFinite(salePrice) && salePrice > 0 && salePrice < price;
  const stock = Math.max(0, Number(product?.countInStock || 0));
  const primaryImage = product?.images?.[0] || FALLBACK_IMAGE;
  const productLink = product?.slug ? `/products/${product.slug}` : '/products';
  const reviewCount = Math.max(0, Number(product?.numReviews || 0));

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (stock <= 0 || typeof onAddToCart !== 'function') {
      return;
    }

    onAddToCart(product);
  };

  return (
    <article className="product-card surface">
      <Link to={productLink} className="product-card__image-wrap" aria-label={`Xem chi tiết ${product?.name || 'sản phẩm'}`}>
        <img
          className="product-card__image"
          src={primaryImage}
          alt={product?.name || 'Sản phẩm TechShop'}
          loading="lazy"
        />
        {product?.category ? <span className="product-card__category">{product.category}</span> : null}
      </Link>

      <div className="product-card__body">
        <h3 className="product-card__title">
          <Link to={productLink}>{product?.name || 'Sản phẩm đang cập nhật'}</Link>
        </h3>

        <div className="product-card__price-wrap">
          <strong className="product-card__price">{formatPrice(effectivePrice)}</strong>
          {hasDiscount ? <span className="product-card__price-old">{formatPrice(price)}</span> : null}
          {hasDiscount ? <span className="product-card__discount">{getDiscountPercent(price, salePrice)}</span> : null}
        </div>

        <Rating
          value={product?.rating || 0}
          text={`${reviewCount} đánh giá`}
          className="product-card__rating"
        />

        <button
          type="button"
          className={`btn ${stock > 0 ? 'btn-primary' : 'btn-outline'} product-card__add-btn`}
          disabled={stock <= 0}
          onClick={handleAddToCart}
        >
          <FiShoppingCart />
          {stock > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;