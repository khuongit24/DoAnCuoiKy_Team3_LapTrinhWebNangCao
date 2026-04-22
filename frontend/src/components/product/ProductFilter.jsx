import { useMemo, useState } from 'react';
import { FiChevronDown, FiFilter, FiRotateCcw, FiStar } from 'react-icons/fi';

import { CATEGORIES } from '../../utils/constants';
import './ProductFilter.css';

const RATING_OPTIONS = [4, 3, 2, 1];

const ProductFilter = ({ filters, categories = [], onChange, onClear }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const safeFilters = {
    category: filters?.category || '',
    brand: filters?.brand || '',
    minPrice: filters?.minPrice || '',
    maxPrice: filters?.maxPrice || '',
    minRating: filters?.minRating || '',
  };

  const categoryCountMap = useMemo(() => {
    const nextMap = new Map();

    if (!Array.isArray(categories)) {
      return nextMap;
    }

    categories.forEach((item) => {
      const categoryName = String(item?.category || '').trim();

      if (!categoryName) {
        return;
      }

      nextMap.set(categoryName, Math.max(0, Number(item?.count || 0)));
    });

    return nextMap;
  }, [categories]);

  const categoryOptions = useMemo(
    () => CATEGORIES.map((category) => ({ category, count: categoryCountMap.get(category) || 0 })),
    [categoryCountMap]
  );

  const isFilterActive = Boolean(
    safeFilters.category
    || safeFilters.brand
    || safeFilters.minPrice
    || safeFilters.maxPrice
    || safeFilters.minRating
  );

  const updateFilters = (nextFilters) => {
    if (typeof onChange !== 'function') {
      return;
    }

    onChange(nextFilters);
  };

  const handleFieldChange = (fieldName, value) => {
    updateFilters({
      ...safeFilters,
      [fieldName]: value,
    });
  };

  const handleClear = () => {
    if (typeof onClear === 'function') {
      onClear();
      return;
    }

    updateFilters({
      category: '',
      brand: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
    });
  };

  return (
    <aside className="product-filter surface">
      <button
        type="button"
        className="product-filter__toggle"
        onClick={() => setIsMobileOpen((previous) => !previous)}
        aria-expanded={isMobileOpen}
      >
        <span>
          <FiFilter /> Bộ lọc sản phẩm
        </span>
        <FiChevronDown className={isMobileOpen ? 'is-open' : ''} />
      </button>

      <div className={`product-filter__content ${isMobileOpen ? 'product-filter__content--open' : ''}`}>
        <section className="product-filter__group">
          <h3>Danh mục</h3>
          <div className="product-filter__checks">
            {categoryOptions.map((item) => {
              const isChecked = safeFilters.category === item.category;

              return (
                <label key={item.category} className="product-filter__check">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleFieldChange('category', isChecked ? '' : item.category)}
                  />
                  <span>{item.category}</span>
                  <small>{item.count}</small>
                </label>
              );
            })}
          </div>
        </section>

        <section className="product-filter__group">
          <h3>Thương hiệu</h3>
          <input
            className="form-input"
            type="text"
            value={safeFilters.brand}
            onChange={(event) => handleFieldChange('brand', event.target.value)}
            placeholder="Ví dụ: Intel, MSI..."
          />
        </section>

        <section className="product-filter__group">
          <h3>Khoảng giá (VND)</h3>
          <div className="product-filter__price-row">
            <input
              className="form-input"
              type="number"
              min="0"
              value={safeFilters.minPrice}
              onChange={(event) => handleFieldChange('minPrice', event.target.value)}
              placeholder="Từ"
            />
            <input
              className="form-input"
              type="number"
              min="0"
              value={safeFilters.maxPrice}
              onChange={(event) => handleFieldChange('maxPrice', event.target.value)}
              placeholder="Đến"
            />
          </div>
        </section>

        <section className="product-filter__group">
          <h3>Đánh giá</h3>
          <div className="product-filter__rating-list">
            {RATING_OPTIONS.map((rating) => {
              const isActive = String(safeFilters.minRating) === String(rating);

              return (
                <button
                  key={rating}
                  type="button"
                  className={`product-filter__rating ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleFieldChange('minRating', isActive ? '' : String(rating))}
                >
                  <FiStar /> Từ {rating} sao
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          className="btn btn-outline product-filter__clear"
          onClick={handleClear}
          disabled={!isFilterActive}
        >
          <FiRotateCcw /> Xóa bộ lọc
        </button>
      </div>
    </aside>
  );
};

export default ProductFilter;