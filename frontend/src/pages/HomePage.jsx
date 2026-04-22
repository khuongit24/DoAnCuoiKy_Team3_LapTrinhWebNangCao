import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiCpu,
  FiCommand,
  FiHardDrive,
  FiHeadphones,
  FiMonitor,
  FiMousePointer,
  FiPackage,
  FiZap,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { getCategories, getFeaturedProducts } from '../api/productApi';
import Message from '../components/common/Message';
import Loader from '../components/common/Loader';
import ProductList from '../components/product/ProductList';
import { useCart } from '../hooks/useCart';
import { getApiErrorMessage } from '../utils/errorUtils';
import './HomePage.css';

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const getCategoryIcon = (categoryName) => {
  const normalizedName = String(categoryName || '').toLowerCase();

  if (normalizedName.includes('cpu') || normalizedName.includes('gpu')) {
    return FiCpu;
  }

  if (normalizedName.includes('ssd') || normalizedName.includes('hdd') || normalizedName.includes('ram')) {
    return FiHardDrive;
  }

  if (normalizedName.includes('monitor')) {
    return FiMonitor;
  }

  if (normalizedName.includes('keyboard')) {
    return FiCommand;
  }

  if (normalizedName.includes('mouse')) {
    return FiMousePointer;
  }

  if (normalizedName.includes('headset')) {
    return FiHeadphones;
  }

  if (normalizedName.includes('laptop') || normalizedName.includes('pc')) {
    return FiZap;
  }

  return FiPackage;
};

const HomePage = () => {
  const { addToCart } = useCart();

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState('');

  const [categoryStats, setCategoryStats] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchFeaturedProducts = async () => {
      setFeaturedLoading(true);
      setFeaturedError('');

      try {
        const response = await getFeaturedProducts();

        if (!isMounted) {
          return;
        }

        setFeaturedProducts(extractDataArray(response));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = getApiErrorMessage(error, 'Không thể tải sản phẩm nổi bật');
        setFeaturedError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setFeaturedLoading(false);
        }
      }
    };

    const fetchCategoryStats = async () => {
      setCategoryLoading(true);
      setCategoryError('');

      try {
        const response = await getCategories();

        if (!isMounted) {
          return;
        }

        setCategoryStats(extractDataArray(response));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = getApiErrorMessage(error, 'Không thể tải danh mục sản phẩm');
        setCategoryError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setCategoryLoading(false);
        }
      }
    };

    fetchFeaturedProducts();
    fetchCategoryStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalProductsInCategory = useMemo(
    () => categoryStats.reduce((total, item) => total + Math.max(0, Number(item?.count || 0)), 0),
    [categoryStats]
  );

  const handleAddToCart = (product) => {
    if (!product) {
      return;
    }

    addToCart(product, 1);
    toast.success('Đã thêm sản phẩm vào giỏ hàng');
  };

  return (
    <div className="home-page container">
      <section className="home-page__hero surface">
        <span className="home-page__hero-badge">Build your setup, own your performance</span>

        <h1>Chọn linh kiện và gaming gear phù hợp nhất cho bạn</h1>
        <p>
          TechShop tổng hợp laptop, PC, linh kiện và phụ kiện chính hãng. Tìm nhanh sản phẩm theo
          nhu cầu, đặt hàng dễ dàng và theo dõi đơn hàng minh bạch.
        </p>

        <div className="home-page__hero-actions">
          <Link to="/products" className="btn btn-primary">
            Khám phá sản phẩm
          </Link>
          <Link to="/register" className="btn btn-outline">
            Tạo tài khoản mới
          </Link>
        </div>

        <dl className="home-page__hero-metrics">
          <div>
            <dt>{featuredProducts.length}</dt>
            <dd>Sản phẩm nổi bật</dd>
          </div>
          <div>
            <dt>{categoryStats.length}</dt>
            <dd>Danh mục</dd>
          </div>
          <div>
            <dt>{totalProductsInCategory}</dt>
            <dd>Tổng sản phẩm</dd>
          </div>
        </dl>
      </section>

      <section className="home-page__section">
        <div className="home-page__section-header">
          <h2>Sản phẩm nổi bật</h2>
          <Link to="/products">Xem tất cả</Link>
        </div>

        {featuredLoading ? <Loader text="Đang tải sản phẩm nổi bật..." /> : null}
        {!featuredLoading && featuredError ? <Message variant="error">{featuredError}</Message> : null}
        {!featuredLoading && !featuredError ? (
          <ProductList
            products={featuredProducts}
            onAddToCart={handleAddToCart}
            emptyTitle="Chưa có sản phẩm nổi bật"
            emptyDescription="Hệ thống đang cập nhật danh sách nổi bật, vui lòng quay lại sau."
          />
        ) : null}
      </section>

      <section className="home-page__section">
        <div className="home-page__section-header">
          <h2>Danh mục sản phẩm</h2>
          <Link to="/products">Đi đến trang sản phẩm</Link>
        </div>

        {categoryLoading ? <Loader text="Đang tải danh mục..." /> : null}
        {!categoryLoading && categoryError ? <Message variant="error">{categoryError}</Message> : null}

        {!categoryLoading && !categoryError ? (
          <div className="home-page__categories">
            {categoryStats.map((item) => {
              const categoryName = item?.category || 'Khác';
              const count = Math.max(0, Number(item?.count || 0));
              const Icon = getCategoryIcon(categoryName);

              return (
                <Link
                  key={categoryName}
                  to={`/products?category=${encodeURIComponent(categoryName)}`}
                  className="home-page__category-card surface"
                >
                  <span className="home-page__category-icon">
                    <Icon />
                  </span>
                  <h3>{categoryName}</h3>
                  <p>{count} sản phẩm</p>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default HomePage;
