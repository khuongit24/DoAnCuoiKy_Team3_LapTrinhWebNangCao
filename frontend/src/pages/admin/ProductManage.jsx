import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';

import { deleteProduct, getProductById, getProducts } from '../../api/productApi';
import ProductForm from '../../components/admin/ProductForm';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Message from '../../components/common/Message';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { formatPrice } from '../../utils/helpers';
import './ProductManage.css';

const PAGE_SIZE = 10;
const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%23f3f4f6%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-size=%2212%22 fill=%22%236b7280%22%3EProduct%3C/text%3E%3C/svg%3E';

const parsePositiveInteger = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return fallbackValue;
  }

  return parsedValue;
};

const parseNonNegativeInteger = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return fallbackValue;
  }

  return parsedValue;
};

const normalizeKeyword = (value) => String(value || '').trim();

const normalizeProductId = (product) => String(product?._id || product?.id || '').trim();

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.products)) {
    return response.products;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const extractDataObject = (response) => {
  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response?.product && typeof response.product === 'object') {
    return response.product;
  }

  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return response;
  }

  return null;
};

const extractPagination = (response, fallbackPage = 1, fallbackLimit = PAGE_SIZE) => {
  const rawPagination = response?.pagination && typeof response.pagination === 'object'
    ? response.pagination
    : response?.data?.pagination && typeof response.data.pagination === 'object'
      ? response.data.pagination
      : {};

  const page = parsePositiveInteger(rawPagination?.page, fallbackPage);
  const limit = parsePositiveInteger(rawPagination?.limit, fallbackLimit);
  const total = Math.max(0, parseNonNegativeInteger(rawPagination?.total, 0));
  const inferredPages = total === 0 ? 0 : Math.ceil(total / limit);
  const pages = Math.max(0, parseNonNegativeInteger(rawPagination?.pages, inferredPages));

  return {
    page,
    limit,
    total,
    pages,
  };
};

const ProductManage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveInteger(searchParams.get('page'), 1);
  const keyword = normalizeKeyword(searchParams.get('keyword'));

  const [keywordInput, setKeywordInput] = useState(keyword);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [deletingById, setDeletingById] = useState({});
  const [rowErrorsById, setRowErrorsById] = useState({});

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitialData, setFormInitialData] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getProducts({
          page,
          limit: PAGE_SIZE,
          ...(keyword ? { keyword } : {}),
        });

        if (!isMounted) {
          return;
        }

        const productData = extractDataArray(response);
        const nextPagination = extractPagination(response, page, PAGE_SIZE);

        if (nextPagination.pages > 0 && page > nextPagination.pages) {
          setSearchParams((previousParams) => {
            const nextParams = new URLSearchParams(previousParams);
            nextParams.set('page', String(nextPagination.pages));

            if (keyword) {
              nextParams.set('keyword', keyword);
            } else {
              nextParams.delete('keyword');
            }

            return nextParams;
          }, { replace: true });
          return;
        }

        setProducts(productData);
        setPagination(nextPagination);
        setDeletingById({});
        setRowErrorsById({});
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setProducts([]);
        setPagination({
          page,
          pages: 0,
          total: 0,
          limit: PAGE_SIZE,
        });
        setError(getApiErrorMessage(requestError, 'Không thể tải danh sách sản phẩm admin'));
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
  }, [keyword, page, refreshTick, setSearchParams]);

  const hasProducts = useMemo(() => Array.isArray(products) && products.length > 0, [products]);

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setFormMode('create');
    setFormInitialData(null);
    setFormLoading(false);
    setFormError('');
  };

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setFormInitialData(null);
    setFormLoading(false);
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = async (productRow) => {
    const productId = normalizeProductId(productRow);

    if (!productId) {
      return;
    }

    setFormMode('edit');
    setFormInitialData(null);
    setFormLoading(true);
    setFormError('');
    setIsFormModalOpen(true);

    try {
      const response = await getProductById(productId);
      const productDetail = extractDataObject(response);

      if (!productDetail || !normalizeProductId(productDetail)) {
        throw new Error('Không tìm thấy dữ liệu chi tiết sản phẩm');
      }

      setFormInitialData(productDetail);
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError, 'Không thể tải chi tiết sản phẩm để cập nhật'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormSuccess = () => {
    const modeAtSubmit = formMode;
    closeFormModal();

    if (modeAtSubmit === 'create' && page !== 1) {
      setSearchParams((previousParams) => {
        const nextParams = new URLSearchParams(previousParams);
        nextParams.set('page', '1');

        if (keyword) {
          nextParams.set('keyword', keyword);
        } else {
          nextParams.delete('keyword');
        }

        return nextParams;
      });
    }

    setRefreshTick((previousTick) => previousTick + 1);
  };

  const handlePageChange = (nextPage) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set('page', String(nextPage));

      if (keyword) {
        nextParams.set('keyword', keyword);
      } else {
        nextParams.delete('keyword');
      }

      return nextParams;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const nextKeyword = normalizeKeyword(keywordInput);

    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set('page', '1');

      if (nextKeyword) {
        nextParams.set('keyword', nextKeyword);
      } else {
        nextParams.delete('keyword');
      }

      return nextParams;
    });
  };

  const handleClearSearch = () => {
    setKeywordInput('');

    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set('page', '1');
      nextParams.delete('keyword');
      return nextParams;
    });
  };

  const handleDeleteProduct = async (productRow) => {
    const productId = normalizeProductId(productRow);

    if (!productId) {
      return;
    }

    const productName = String(productRow?.name || '').trim() || 'sản phẩm này';
    const isConfirmed = window.confirm(`Bạn có chắc chắn muốn xóa (ẩn) ${productName}?`);

    if (!isConfirmed) {
      return;
    }

    setDeletingById((previousState) => ({
      ...previousState,
      [productId]: true,
    }));

    try {
      await deleteProduct(productId);
      toast.success('Đã ẩn sản phẩm thành công');

      setRowErrorsById((previousErrors) => {
        if (!previousErrors[productId]) {
          return previousErrors;
        }

        const nextErrors = { ...previousErrors };
        delete nextErrors[productId];
        return nextErrors;
      });

      setRefreshTick((previousTick) => previousTick + 1);
    } catch (requestError) {
      setRowErrorsById((previousErrors) => ({
        ...previousErrors,
        [productId]: getApiErrorMessage(requestError, 'Không thể xóa sản phẩm'),
      }));
    } finally {
      setDeletingById((previousState) => ({
        ...previousState,
        [productId]: false,
      }));
    }
  };

  if (loading && !hasProducts) {
    return <Loader fullPage text="Đang tải danh sách sản phẩm admin..." />;
  }

  return (
    <>
      <section className="admin-page product-manage" aria-labelledby="admin-product-manage-title">
        <header className="product-manage__header">
          <div>
            <h1 id="admin-product-manage-title" className="admin-page__title">Quản lý sản phẩm</h1>
            <p className="admin-page__description">
              Tìm kiếm, tạo mới, cập nhật và ẩn sản phẩm trong hệ thống.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary product-manage__add-btn"
            onClick={handleOpenCreateModal}
            aria-label="Thêm sản phẩm mới"
          >
            <FiPlus />
            <span>Thêm sản phẩm</span>
          </button>
        </header>

        <form className="product-manage__search surface" onSubmit={handleSearchSubmit} aria-label="Tìm kiếm sản phẩm">
          <div className="form-group product-manage__search-field">
            <label htmlFor="admin-product-keyword" className="sr-only">Tìm theo tên hoặc SKU</label>

            <div className="product-manage__search-input-wrap">
              <FiSearch aria-hidden="true" />
              <input
                id="admin-product-keyword"
                type="search"
                className="form-input"
                placeholder="Nhập tên hoặc SKU..."
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                aria-label="Nhập từ khóa tìm sản phẩm"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary product-manage__search-btn" aria-label="Tìm kiếm sản phẩm">
            Tìm
          </button>

          <button
            type="button"
            className="btn btn-outline product-manage__clear-btn"
            onClick={handleClearSearch}
            disabled={!keyword && !normalizeKeyword(keywordInput)}
            aria-label="Xóa bộ lọc tìm kiếm sản phẩm"
          >
            Xóa lọc
          </button>
        </form>

        {error ? (
          <Message variant="error" onClose={() => setError('')}>
            {error}
          </Message>
        ) : null}

        {loading && hasProducts ? <Loader inline text="Đang cập nhật danh sách sản phẩm..." /> : null}

        {!loading && !error && !hasProducts ? (
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Thử đổi từ khóa tìm kiếm hoặc tạo mới sản phẩm để tiếp tục quản lý."
          />
        ) : null}

        {hasProducts ? (
          <>
            <div className="product-manage__table-wrap surface" role="region" aria-label="Bảng sản phẩm admin">
              <table className="product-manage__table">
                <caption className="sr-only">Danh sách sản phẩm trong trang quản trị</caption>

                <thead>
                  <tr>
                    <th scope="col">Ảnh</th>
                    <th scope="col">Tên</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Danh mục</th>
                    <th scope="col">Giá</th>
                    <th scope="col">Tồn kho</th>
                    <th scope="col">Nổi bật</th>
                    <th scope="col">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((productRow, index) => {
                    const productId = normalizeProductId(productRow);
                    const productName = String(productRow?.name || '').trim() || 'Sản phẩm';
                    const productSku = String(productRow?.sku || '--').toUpperCase();
                    const category = String(productRow?.category || '--').trim();
                    const subcategory = String(productRow?.subcategory || '').trim();
                    const imageUrl = String(productRow?.images?.[0] || '').trim() || FALLBACK_IMAGE;
                    const price = Number(productRow?.price || 0);
                    const salePrice = Number(productRow?.salePrice);
                    const hasSalePrice = Number.isFinite(salePrice) && salePrice >= 0 && salePrice < price;
                    const displayPrice = hasSalePrice ? salePrice : price;
                    const stock = Math.max(0, Number.parseInt(productRow?.countInStock, 10) || 0);
                    const isFeatured = Boolean(productRow?.isFeatured);
                    const isDeleting = Boolean(deletingById[productId]);
                    const rowError = rowErrorsById[productId];

                    return (
                      <tr key={productId || `${productName}-${index + 1}`}>
                        <td>
                          <img
                            src={imageUrl}
                            alt={`Ảnh ${productName}`}
                            className="product-manage__thumb"
                            loading="lazy"
                          />
                        </td>

                        <td>
                          <p className="product-manage__name">{productName}</p>
                          {subcategory ? <p className="product-manage__subcategory">{subcategory}</p> : null}
                        </td>

                        <td>
                          <code className="product-manage__sku">{productSku}</code>
                        </td>

                        <td>{category}</td>

                        <td>
                          <div className="product-manage__price">
                            <strong>{formatPrice(displayPrice)}</strong>
                            {hasSalePrice ? <span>{formatPrice(price)}</span> : null}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`product-manage__stock ${stock === 0 ? 'is-out' : stock < 5 ? 'is-low' : ''}`}
                          >
                            {stock}
                          </span>
                        </td>

                        <td>
                          <span className={`product-manage__featured ${isFeatured ? 'is-on' : 'is-off'}`}>
                            {isFeatured ? 'Có' : 'Không'}
                          </span>
                        </td>

                        <td>
                          <div className="product-manage__actions">
                            <button
                              type="button"
                              className="btn btn-outline product-manage__action-btn"
                              onClick={() => handleOpenEditModal(productRow)}
                              disabled={!productId || isDeleting}
                              aria-label={`Cập nhật ${productName}`}
                            >
                              <FiEdit2 />
                              <span>Sửa</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline product-manage__action-btn product-manage__action-btn--danger"
                              onClick={() => handleDeleteProduct(productRow)}
                              disabled={!productId || isDeleting}
                              aria-label={`Xóa ${productName}`}
                            >
                              <FiTrash2 />
                              <span>{isDeleting ? 'Đang xóa...' : 'Xóa'}</span>
                            </button>

                            {rowError ? (
                              <p className="product-manage__row-error" role="alert">
                                {rowError}
                              </p>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!loading ? (
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                ariaLabel="Phân trang sản phẩm admin"
                itemLabel="sản phẩm"
              />
            ) : null}
          </>
        ) : null}
      </section>

      <Modal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title={formMode === 'edit' ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
        closeOnEscape={!formLoading}
        closeOnOverlayClick={!formLoading}
      >
        {formLoading ? (
          <div className="product-manage__modal-state">
            <Loader inline text="Đang tải chi tiết sản phẩm..." />
          </div>
        ) : formError ? (
          <div className="product-manage__modal-state">
            <Message variant="error">{formError}</Message>
            <button type="button" className="btn btn-outline" onClick={closeFormModal}>
              Đóng
            </button>
          </div>
        ) : (
          <ProductForm
            mode={formMode}
            initialData={formInitialData}
            onSuccess={handleFormSuccess}
            onCancel={closeFormModal}
          />
        )}
      </Modal>
    </>
  );
};

export default ProductManage;
