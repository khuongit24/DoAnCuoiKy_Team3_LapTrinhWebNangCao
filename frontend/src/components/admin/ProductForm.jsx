import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

import { createProduct, updateProduct } from '../../api/productApi';
import { CATEGORIES } from '../../utils/constants';
import { getApiErrorMessage, getFieldErrors } from '../../utils/errorUtils';
import ImageUploader from './ImageUploader';
import './ProductForm.css';

const EMPTY_SPEC_ROW = {
  key: '',
  value: '',
};

const parseFiniteNumber = (value) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
};

const parseNonNegativeInteger = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
};

const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const normalizeSpecsRows = (specs) => {
  if (!Array.isArray(specs)) {
    return [
      {
        ...EMPTY_SPEC_ROW,
      },
    ];
  }

  const nextSpecsRows = specs
    .map((spec) => ({
      key: String(spec?.key || '').trim(),
      value: String(spec?.value || '').trim(),
    }))
    .filter((spec) => spec.key || spec.value);

  if (nextSpecsRows.length === 0) {
    return [
      {
        ...EMPTY_SPEC_ROW,
      },
    ];
  }

  return nextSpecsRows;
};

const createDefaultFormState = () => ({
  name: '',
  sku: '',
  category: CATEGORIES[0] || '',
  subcategory: '',
  brand: '',
  images: [],
  price: '',
  salePrice: '',
  countInStock: '0',
  specs: [
    {
      ...EMPTY_SPEC_ROW,
    },
  ],
  description: '',
  isFeatured: false,
});

const mapInitialDataToFormState = (initialData) => {
  if (!initialData || typeof initialData !== 'object') {
    return createDefaultFormState();
  }

  const fallbackCategory = CATEGORIES[0] || '';
  const nextCategory = String(initialData.category || '').trim();

  return {
    name: String(initialData.name || '').trim(),
    sku: String(initialData.sku || '').trim().toUpperCase(),
    category: CATEGORIES.includes(nextCategory) ? nextCategory : fallbackCategory,
    subcategory: String(initialData.subcategory || '').trim(),
    brand: String(initialData.brand || '').trim(),
    images: normalizeImages(initialData.images),
    price: Number.isFinite(Number(initialData.price)) ? String(Number(initialData.price)) : '',
    salePrice:
      initialData.salePrice === null || initialData.salePrice === '' || initialData.salePrice === undefined
        ? ''
        : Number.isFinite(Number(initialData.salePrice))
          ? String(Number(initialData.salePrice))
          : '',
    countInStock: Number.isFinite(Number(initialData.countInStock))
      ? String(Math.max(0, Number.parseInt(initialData.countInStock, 10)))
      : '0',
    specs: normalizeSpecsRows(initialData.specs),
    description: String(initialData.description || '').trim(),
    isFeatured: Boolean(initialData.isFeatured),
  };
};

const ProductForm = ({
  mode = 'create',
  initialData = null,
  onSuccess,
  onCancel,
}) => {
  const [formValues, setFormValues] = useState(createDefaultFormState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = mode === 'edit';

  const productId = useMemo(
    () => String(initialData?._id || initialData?.id || '').trim(),
    [initialData?._id, initialData?.id]
  );

  useEffect(() => {
    setFormValues(mapInitialDataToFormState(initialData));
    setFieldErrors({});
    setSubmitError('');
  }, [initialData, mode]);

  const clearFieldError = (fieldName) => {
    setFieldErrors((previousErrors) => {
      if (!previousErrors[fieldName]) {
        return previousErrors;
      }

      const nextErrors = {
        ...previousErrors,
      };

      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  const handleFieldChange = (fieldName, value) => {
    let nextValue = value;

    if (fieldName === 'sku') {
      nextValue = String(value || '').toUpperCase();
    }

    setFormValues((previousValues) => ({
      ...previousValues,
      [fieldName]: nextValue,
    }));

    clearFieldError(fieldName);
  };

  const handleImagesChange = (nextImages) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      images: normalizeImages(nextImages),
    }));

    clearFieldError('images');
  };

  const handleSpecRowChange = (index, fieldName, value) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      specs: previousValues.specs.map((spec, currentIndex) => {
        if (currentIndex !== index) {
          return spec;
        }

        return {
          ...spec,
          [fieldName]: value,
        };
      }),
    }));

    clearFieldError('specs');
  };

  const handleAddSpecRow = () => {
    setFormValues((previousValues) => ({
      ...previousValues,
      specs: [
        ...previousValues.specs,
        {
          ...EMPTY_SPEC_ROW,
        },
      ],
    }));

    clearFieldError('specs');
  };

  const handleRemoveSpecRow = (index) => {
    setFormValues((previousValues) => {
      const nextSpecs = previousValues.specs.filter((_, currentIndex) => currentIndex !== index);

      return {
        ...previousValues,
        specs: nextSpecs.length > 0
          ? nextSpecs
          : [
            {
              ...EMPTY_SPEC_ROW,
            },
          ],
      };
    });

    clearFieldError('specs');
  };

  const validateAndBuildPayload = () => {
    const nextErrors = {};

    const name = formValues.name.trim();
    const sku = formValues.sku.trim().toUpperCase();
    const category = String(formValues.category || '').trim();
    const subcategory = formValues.subcategory.trim();
    const brand = formValues.brand.trim();
    const images = normalizeImages(formValues.images);
    const description = formValues.description.trim();

    if (!name) {
      nextErrors.name = 'Vui lòng nhập tên sản phẩm';
    }

    if (!sku) {
      nextErrors.sku = 'Vui lòng nhập SKU';
    }

    if (!category) {
      nextErrors.category = 'Vui lòng chọn danh mục';
    } else if (!CATEGORIES.includes(category)) {
      nextErrors.category = 'Danh mục không hợp lệ';
    }

    if (!brand) {
      nextErrors.brand = 'Vui lòng nhập thương hiệu';
    }

    if (images.length === 0) {
      nextErrors.images = 'Sản phẩm cần ít nhất 1 ảnh';
    }

    const price = parseFiniteNumber(formValues.price);

    if (String(formValues.price).trim() === '') {
      nextErrors.price = 'Vui lòng nhập giá sản phẩm';
    } else if (price === null || price < 0) {
      nextErrors.price = 'Giá sản phẩm phải là số >= 0';
    }

    const salePriceRaw = String(formValues.salePrice || '').trim();
    const salePrice = salePriceRaw ? parseFiniteNumber(salePriceRaw) : null;

    if (salePriceRaw && (salePrice === null || salePrice < 0)) {
      nextErrors.salePrice = 'Giá khuyến mãi phải là số >= 0';
    } else if (salePrice !== null && price !== null && Number.isFinite(price) && salePrice >= price) {
      nextErrors.salePrice = 'Giá khuyến mãi phải nhỏ hơn giá gốc';
    }

    const countInStock = parseNonNegativeInteger(formValues.countInStock);

    if (String(formValues.countInStock).trim() === '') {
      nextErrors.countInStock = 'Vui lòng nhập tồn kho';
    } else if (countInStock === null) {
      nextErrors.countInStock = 'Tồn kho phải là số nguyên >= 0';
    }

    if (!description) {
      nextErrors.description = 'Vui lòng nhập mô tả sản phẩm';
    }

    const normalizedSpecs = [];
    let hasInvalidSpec = false;

    formValues.specs.forEach((spec) => {
      const key = String(spec?.key || '').trim();
      const value = String(spec?.value || '').trim();

      if (!key && !value) {
        return;
      }

      if (!key || !value) {
        hasInvalidSpec = true;
        return;
      }

      normalizedSpecs.push({ key, value });
    });

    if (hasInvalidSpec) {
      nextErrors.specs = 'Mỗi dòng thông số phải có đầy đủ tên và giá trị';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return {
        payload: null,
      };
    }

    return {
      payload: {
        name,
        sku,
        category,
        subcategory,
        brand,
        images,
        price,
        salePrice,
        countInStock,
        specs: normalizedSpecs,
        description,
        isFeatured: Boolean(formValues.isFeatured),
      },
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { payload } = validateAndBuildPayload();

    if (!payload) {
      return;
    }

    if (isEditMode && !productId) {
      const message = 'Không tìm thấy ID sản phẩm để cập nhật';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = isEditMode
        ? await updateProduct(productId, payload)
        : await createProduct(payload);

      toast.success(isEditMode ? 'Cập nhật sản phẩm thành công' : 'Tạo sản phẩm thành công');

      if (typeof onSuccess === 'function') {
        onSuccess(response);
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Không thể lưu sản phẩm. Vui lòng thử lại.');

      setSubmitError(message);
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        ...getFieldErrors(requestError),
      }));
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting
    ? isEditMode
      ? 'Đang cập nhật...'
      : 'Đang tạo...'
    : isEditMode
      ? 'Cập nhật sản phẩm'
      : 'Tạo sản phẩm';

  return (
    <form className="product-form" onSubmit={handleSubmit} noValidate>
      {submitError ? (
        <p className="product-form__submit-error" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="product-form__grid">
        <div className="form-group product-form__field product-form__field--span-2">
          <label className="form-label" htmlFor="product-name">Tên sản phẩm</label>
          <input
            id="product-name"
            type="text"
            className="form-input"
            value={formValues.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            placeholder="Ví dụ: Laptop Gaming ABC"
            disabled={submitting}
          />
          {fieldErrors.name ? <small className="text-danger">{fieldErrors.name}</small> : null}
        </div>

        <div className="form-group product-form__field">
          <label className="form-label" htmlFor="product-sku">SKU</label>
          <input
            id="product-sku"
            type="text"
            className="form-input"
            value={formValues.sku}
            onChange={(event) => handleFieldChange('sku', event.target.value)}
            placeholder="VD: ABC-001"
            disabled={submitting}
          />
          {fieldErrors.sku ? <small className="text-danger">{fieldErrors.sku}</small> : null}
        </div>

        <div className="form-group product-form__field">
          <label className="form-label" htmlFor="product-category">Danh mục</label>
          <select
            id="product-category"
            className="form-select"
            value={formValues.category}
            onChange={(event) => handleFieldChange('category', event.target.value)}
            disabled={submitting}
          >
            {CATEGORIES.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
          {fieldErrors.category ? <small className="text-danger">{fieldErrors.category}</small> : null}
        </div>

        <div className="form-group product-form__field">
          <label className="form-label" htmlFor="product-subcategory">Danh mục phụ</label>
          <input
            id="product-subcategory"
            type="text"
            className="form-input"
            value={formValues.subcategory}
            onChange={(event) => handleFieldChange('subcategory', event.target.value)}
            placeholder="Tùy chọn"
            disabled={submitting}
          />
        </div>

        <div className="form-group product-form__field">
          <label className="form-label" htmlFor="product-brand">Thương hiệu</label>
          <input
            id="product-brand"
            type="text"
            className="form-input"
            value={formValues.brand}
            onChange={(event) => handleFieldChange('brand', event.target.value)}
            placeholder="Ví dụ: ASUS"
            disabled={submitting}
          />
          {fieldErrors.brand ? <small className="text-danger">{fieldErrors.brand}</small> : null}
        </div>

        <div className="form-group product-form__field">
          <label className="form-label" htmlFor="product-price">Giá gốc</label>
          <input
            id="product-price"
            type="number"
            min="0"
            step="1000"
            className="form-input"
            value={formValues.price}
            onChange={(event) => handleFieldChange('price', event.target.value)}
            placeholder="0"
            disabled={submitting}
          />
          {fieldErrors.price ? <small className="text-danger">{fieldErrors.price}</small> : null}
        </div>

        <div className="form-group product-form__field">
          <label className="form-label" htmlFor="product-sale-price">Giá khuyến mãi</label>
          <input
            id="product-sale-price"
            type="number"
            min="0"
            step="1000"
            className="form-input"
            value={formValues.salePrice}
            onChange={(event) => handleFieldChange('salePrice', event.target.value)}
            placeholder="Bỏ trống nếu không dùng"
            disabled={submitting}
          />
          {fieldErrors.salePrice ? <small className="text-danger">{fieldErrors.salePrice}</small> : null}
        </div>

        <div className="form-group product-form__field">
          <label className="form-label" htmlFor="product-stock">Tồn kho</label>
          <input
            id="product-stock"
            type="number"
            min="0"
            step="1"
            className="form-input"
            value={formValues.countInStock}
            onChange={(event) => handleFieldChange('countInStock', event.target.value)}
            disabled={submitting}
          />
          {fieldErrors.countInStock ? <small className="text-danger">{fieldErrors.countInStock}</small> : null}
        </div>

        <div className="product-form__field product-form__checkbox-field">
          <label className="product-form__checkbox-label" htmlFor="product-is-featured">
            <input
              id="product-is-featured"
              type="checkbox"
              checked={Boolean(formValues.isFeatured)}
              onChange={(event) => handleFieldChange('isFeatured', event.target.checked)}
              disabled={submitting}
            />
            <span>Đánh dấu sản phẩm nổi bật</span>
          </label>
        </div>

        <div className="form-group product-form__field product-form__field--span-2">
          <label className="form-label">Hình ảnh sản phẩm</label>
          <ImageUploader images={formValues.images} onChange={handleImagesChange} disabled={submitting} />
          {fieldErrors.images ? <small className="text-danger">{fieldErrors.images}</small> : null}
        </div>

        <div className="form-group product-form__field product-form__field--span-2">
          <label className="form-label" htmlFor="product-description">Mô tả</label>
          <textarea
            id="product-description"
            className="form-textarea"
            value={formValues.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            rows={5}
            placeholder="Nhập mô tả ngắn gọn và đầy đủ cho sản phẩm"
            disabled={submitting}
          />
          {fieldErrors.description ? <small className="text-danger">{fieldErrors.description}</small> : null}
        </div>

        <div className="form-group product-form__field product-form__field--span-2">
          <div className="product-form__specs-head">
            <label className="form-label">Thông số kỹ thuật</label>
            <button
              type="button"
              className="btn btn-outline product-form__add-spec"
              onClick={handleAddSpecRow}
              disabled={submitting}
              aria-label="Thêm dòng thông số"
            >
              <FiPlus />
              <span>Thêm dòng</span>
            </button>
          </div>

          <div className="product-form__specs-list">
            {formValues.specs.map((spec, index) => {
              const canRemove = formValues.specs.length > 1;

              return (
                <div key={`spec-row-${index + 1}`} className="product-form__spec-row">
                  <input
                    type="text"
                    className="form-input"
                    value={spec.key}
                    onChange={(event) => handleSpecRowChange(index, 'key', event.target.value)}
                    placeholder="Tên thông số"
                    disabled={submitting}
                    aria-label={`Tên thông số dòng ${index + 1}`}
                  />

                  <input
                    type="text"
                    className="form-input"
                    value={spec.value}
                    onChange={(event) => handleSpecRowChange(index, 'value', event.target.value)}
                    placeholder="Giá trị"
                    disabled={submitting}
                    aria-label={`Giá trị thông số dòng ${index + 1}`}
                  />

                  <button
                    type="button"
                    className="product-form__remove-spec"
                    onClick={() => handleRemoveSpecRow(index)}
                    disabled={submitting || !canRemove}
                    aria-label={`Xóa dòng thông số ${index + 1}`}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              );
            })}
          </div>

          {fieldErrors.specs ? <small className="text-danger">{fieldErrors.specs}</small> : null}
        </div>
      </div>

      <div className="product-form__actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={typeof onCancel === 'function' ? onCancel : undefined}
          disabled={submitting}
        >
          Hủy
        </button>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
