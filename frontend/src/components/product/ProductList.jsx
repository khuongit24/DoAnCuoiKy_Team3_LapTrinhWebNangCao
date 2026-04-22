import EmptyState from '../common/EmptyState';
import Loader from '../common/Loader';
import ProductCard from './ProductCard';
import './ProductList.css';

const ProductList = ({
  products = [],
  isLoading = false,
  emptyTitle = 'Không tìm thấy sản phẩm',
  emptyDescription = 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.',
  onAddToCart,
}) => {
  if (isLoading) {
    return <Loader text="Đang tải danh sách sản phẩm..." />;
  }

  if (!Array.isArray(products) || products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="product-list">
      {products.map((product) => {
        const productId = product?._id || product?.id || product?.slug;

        return <ProductCard key={productId} product={product} onAddToCart={onAddToCart} />;
      })}
    </div>
  );
};

export default ProductList;