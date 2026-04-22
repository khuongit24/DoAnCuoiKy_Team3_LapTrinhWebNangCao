import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';

import { getProductBySlug } from '../api/productApi';
import Loader from '../components/common/Loader';
import Message from '../components/common/Message';
import ProductImageGallery from '../components/product/ProductImageGallery';
import ProductSpecs from '../components/product/ProductSpecs';
import Rating from '../components/product/Rating';
import ReviewForm from '../components/product/ReviewForm';
import ReviewList from '../components/product/ReviewList';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { getApiErrorMessage } from '../utils/errorUtils';
import { formatPrice, getDiscountPercent, getEffectivePrice } from '../utils/helpers';
import './ProductPage.css';

const extractDataObject = (response) => {
  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return response;
  }

  return null;
};

const clampQuantity = (value, maxValue) => {
  const normalizedValue = Number.parseInt(value, 10);

  if (Number.isNaN(normalizedValue) || normalizedValue <= 1) {
    return 1;
  }

  return Math.min(normalizedValue, Math.max(1, maxValue));
};

const getStockMeta = (countInStock) => {
  const normalizedStock = Math.max(0, Number(countInStock || 0));

  if (normalizedStock <= 0) {
    return {
      label: 'Hết hàng',
      className: 'is-out',
    };
  }

  if (normalizedStock <= 5) {
    return {
      label: 'Còn ít hàng',
      className: 'is-low',
    };
  }

  return {
    label: 'Còn hàng',
    className: 'is-in',
  };
};

const toCartPayload = (product) => ({
  _id: product?._id,
  slug: product?.slug,
  name: product?.name,
  category: product?.category,
  brand: product?.brand,
  images: Array.isArray(product?.images) ? product.images : [],
  image: Array.isArray(product?.images) ? product.images[0] : '',
  price: Number(product?.price || 0),
  salePrice: product?.salePrice == null ? null : Number(product.salePrice),
  countInStock: Math.max(0, Number(product?.countInStock || 0)),
});

const ProductPage = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [reviewRefreshToken, setReviewRefreshToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getProductBySlug(slug);

        if (!isMounted) {
          return;
        }

        setProduct(extractDataObject(response));
        setQuantity(1);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setProduct(null);
        setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết sản phẩm'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [reviewRefreshToken, slug]);

  const stock = Math.max(0, Number(product?.countInStock || 0));
  const stockMeta = getStockMeta(stock);
  const price = Number(product?.price || 0);
  const salePrice = Number(product?.salePrice);
  const hasDiscount = Number.isFinite(salePrice) && salePrice > 0 && salePrice < price;
  const displayPrice = getEffectivePrice(product || {});

  const hasReviewed = useMemo(() => {
    if (!isAuthenticated || !user?._id || !Array.isArray(product?.reviews)) {
      return false;
    }

    return product.reviews.some((review) => String(review?.user) === String(user._id));
  }, [isAuthenticated, product?.reviews, user?._id]);

  const handleAddToCart = () => {
    if (!product || stock <= 0) {
      return;
    }

    setAdding(true);

    addToCart(toCartPayload(product), quantity);
    toast.success('Đã thêm sản phẩm vào giỏ hàng');

    setAdding(false);
  };

  const handleReviewSubmitted = () => {
    setReviewRefreshToken((previous) => previous + 1);
  };

  if (loading) {
    return <Loader fullPage text="Đang tải chi tiết sản phẩm..." />;
  }

  if (error || !product) {
    return (
      <section className="product-page container">
        <Message variant="error">{error || 'Không tìm thấy sản phẩm'}</Message>
        <Link className="btn btn-outline" to="/products">
          Quay lại danh sách sản phẩm
        </Link>
      </section>
    );
  }

  return (
    <section className="product-page container">
      <nav className="product-page__breadcrumb" aria-label="Đường dẫn điều hướng">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link
          to={
            product?.category
              ? `/products?category=${encodeURIComponent(product.category)}`
              : '/products'
          }
        >
          {product?.category || 'Danh mục'}
        </Link>
        <span>/</span>
        <strong>{product?.name || 'Chi tiết sản phẩm'}</strong>
      </nav>

      <div className="product-page__main surface">
        <div className="product-page__gallery">
          <ProductImageGallery images={product?.images || []} productName={product?.name || 'Sản phẩm'} />
        </div>

        <div className="product-page__info">
          <h1>{product?.name}</h1>
          <p className="product-page__brand">Thương hiệu: {product?.brand || 'Đang cập nhật'}</p>

          <div className="product-page__meta-row">
            <span className="product-page__category">{product?.category || 'Khác'}</span>
            <Rating
              value={product?.rating || 0}
              text={`${Math.max(0, Number(product?.numReviews || 0))} đánh giá`}
            />
          </div>

          <div className="product-page__price-wrap">
            <strong>{formatPrice(displayPrice)}</strong>
            {hasDiscount ? <span className="product-page__price-old">{formatPrice(price)}</span> : null}
            {hasDiscount ? <span className="product-page__discount">{getDiscountPercent(price, salePrice)}</span> : null}
          </div>

          <p className={`product-page__stock ${stockMeta.className}`}>
            {stockMeta.label} ({stock})
          </p>

          <div className="product-page__qty-wrap">
            <span>Số lượng</span>
            <div className="product-page__qty-control">
              <button
                type="button"
                onClick={() => setQuantity((current) => clampQuantity(current - 1, stock))}
                disabled={stock <= 0}
              >
                <FiMinus />
              </button>
              <input
                type="number"
                min="1"
                max={Math.max(1, stock)}
                value={quantity}
                onChange={(event) => setQuantity(clampQuantity(event.target.value, stock))}
                disabled={stock <= 0}
              />
              <button
                type="button"
                onClick={() => setQuantity((current) => clampQuantity(current + 1, stock))}
                disabled={stock <= 0}
              >
                <FiPlus />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary product-page__add-btn"
            onClick={handleAddToCart}
            disabled={stock <= 0 || adding}
          >
            <FiShoppingCart />
            {adding ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
          </button>
        </div>
      </div>

      <section className="product-page__section surface">
        <h2>Thông số kỹ thuật</h2>
        <ProductSpecs specs={product?.specs} />
      </section>

      <section className="product-page__section surface">
        <h2>Mô tả sản phẩm</h2>
        <p className="product-page__description">{product?.description || 'Đang cập nhật mô tả sản phẩm.'}</p>
      </section>

      <section className="product-page__section surface">
        <h2>Đánh giá sản phẩm</h2>
        <ReviewForm productId={product?._id} hasReviewed={hasReviewed} onSubmitted={handleReviewSubmitted} />
        <ReviewList reviews={product?.reviews || []} />
      </section>
    </section>
  );
};

export default ProductPage;