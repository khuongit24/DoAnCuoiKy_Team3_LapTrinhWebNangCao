import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

import { getCategories, getProducts } from '../api/productApi';
import Message from '../components/common/Message';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import ProductFilter from '../components/product/ProductFilter';
import ProductList from '../components/product/ProductList';
import { useCart } from '../hooks/useCart';
import { getApiErrorMessage } from '../utils/errorUtils';
import { SORT_OPTIONS } from '../utils/constants';
import './ProductListPage.css';

const PAGE_SIZE = 12;

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
};

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const ProductListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const searchParamsString = searchParams.toString();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  const queryState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);

    return {
      keyword: params.get('keyword') || '',
      category: params.get('category') || '',
      brand: params.get('brand') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      minRating: params.get('minRating') || '',
      sort: params.get('sort') || 'newest',
      page: parsePositiveInteger(params.get('page'), 1),
    };
  }, [searchParamsString]);

  const updateSearchParams = useCallback(
    (updater, options = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          updater(next);

          if (!next.get('sort')) {
            next.set('sort', 'newest');
          }

          if (!next.get('page')) {
            next.set('page', '1');
          }

          return next;
        },
        {
          replace: Boolean(options.replace),
        }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const response = await getCategories();

        if (!isMounted) {
          return;
        }

        setCategories(extractDataArray(response));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        toast.error(getApiErrorMessage(requestError, 'Không thể tải danh mục cho bộ lọc'));
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      const query = {
        page: queryState.page,
        limit: PAGE_SIZE,
        sort: queryState.sort,
      };

      if (queryState.keyword) {
        query.keyword = queryState.keyword;
      }

      if (queryState.category) {
        query.category = queryState.category;
      }

      if (queryState.brand) {
        query.brand = queryState.brand;
      }

      if (queryState.minPrice) {
        query.minPrice = queryState.minPrice;
      }

      if (queryState.maxPrice) {
        query.maxPrice = queryState.maxPrice;
      }

      if (queryState.minRating) {
        query.minRating = queryState.minRating;
      }

      try {
        const response = await getProducts(query);

        if (!isMounted) {
          return;
        }

        const productItems = extractDataArray(response);
        const paginationPayload = response?.pagination || {};
        const totalPages = Math.max(0, Number(paginationPayload?.pages || 0));
        const totalItems = Math.max(0, Number(paginationPayload?.total || 0));
        const currentPage = parsePositiveInteger(paginationPayload?.page, queryState.page);

        if (totalPages > 0 && queryState.page > totalPages) {
          updateSearchParams(
            (next) => {
              next.set('page', String(totalPages));
            },
            { replace: true }
          );
          return;
        }

        setProducts(productItems);
        setPagination({
          page: currentPage,
          pages: totalPages,
          total: totalItems,
          limit: parsePositiveInteger(paginationPayload?.limit, PAGE_SIZE),
        });
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setProducts([]);
        setPagination({
          page: queryState.page,
          pages: 0,
          total: 0,
          limit: PAGE_SIZE,
        });
        setError(getApiErrorMessage(requestError, 'Không thể tải danh sách sản phẩm'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [queryState, updateSearchParams]);

  const handleFilterChange = (nextFilters) => {
    updateSearchParams((next) => {
      ['category', 'brand', 'minPrice', 'maxPrice', 'minRating'].forEach((key) => {
        const value = String(nextFilters?.[key] || '').trim();

        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      });

      next.set('page', '1');
    });
  };

  const handleClearFilters = () => {
    updateSearchParams((next) => {
      ['category', 'brand', 'minPrice', 'maxPrice', 'minRating'].forEach((key) => next.delete(key));
      next.set('page', '1');
    });
  };

  const handleSortChange = (event) => {
    const sortValue = event.target.value;

    updateSearchParams((next) => {
      if (sortValue) {
        next.set('sort', sortValue);
      } else {
        next.delete('sort');
      }
      next.set('page', '1');
    });
  };

  const handleKeywordSearch = (keyword) => {
    updateSearchParams((next) => {
      const normalizedKeyword = String(keyword || '').trim();

      if (normalizedKeyword) {
        next.set('keyword', normalizedKeyword);
      } else {
        next.delete('keyword');
      }

      next.set('page', '1');
    });
  };

  const handlePageChange = (nextPage) => {
    updateSearchParams((next) => {
      next.set('page', String(nextPage));
    });
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    toast.success('Đã thêm sản phẩm vào giỏ hàng');
  };

  const productRangeText = useMemo(() => {
    if (pagination.total <= 0 || products.length === 0) {
      return 'Không tìm thấy sản phẩm phù hợp';
    }

    const start = (pagination.page - 1) * PAGE_SIZE + 1;
    const end = start + products.length - 1;

    return `Hiển thị ${start}-${end} trên ${pagination.total} sản phẩm`;
  }, [pagination.page, pagination.total, products.length]);

  return (
    <section className="product-list-page container">
      <header className="product-list-page__header">
        <div>
          <h1>Danh sách sản phẩm</h1>
          <p>{productRangeText}</p>
        </div>
        <div className="product-list-page__search">
          <SearchBar
            initialValue={queryState.keyword}
            onSearch={handleKeywordSearch}
            placeholder="Tìm laptop, CPU, màn hình..."
          />
        </div>
      </header>

      <div className="product-list-page__layout">
        <aside className="product-list-page__sidebar">
          <ProductFilter
            filters={{
              category: queryState.category,
              brand: queryState.brand,
              minPrice: queryState.minPrice,
              maxPrice: queryState.maxPrice,
              minRating: queryState.minRating,
            }}
            categories={categories}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </aside>

        <div className="product-list-page__content">
          <div className="product-list-page__toolbar surface">
            <p>{productRangeText}</p>

            <label className="product-list-page__sort">
              <span>Sắp xếp:</span>
              <select className="form-select" value={queryState.sort} onChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <Message variant="error">{error}</Message> : null}

          <ProductList
            products={products}
            isLoading={loading}
            onAddToCart={handleAddToCart}
            emptyTitle="Không tìm thấy sản phẩm"
            emptyDescription="Hãy thử thay đổi bộ lọc, sắp xếp hoặc từ khóa tìm kiếm."
          />

          {!loading ? <Pagination pagination={pagination} onPageChange={handlePageChange} /> : null}
        </div>
      </div>
    </section>
  );
};

export default ProductListPage;