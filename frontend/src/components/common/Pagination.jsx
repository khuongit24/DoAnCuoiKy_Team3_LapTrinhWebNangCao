import './Pagination.css';

const clampPage = (page, pages) => {
  const normalizedPage = Number.isFinite(page) ? Math.floor(page) : 1;

  if (normalizedPage < 1) {
    return 1;
  }

  if (normalizedPage > pages) {
    return pages;
  }

  return normalizedPage;
};

const buildVisiblePages = (currentPage, totalPages, maxVisible) => {
  const normalizedMaxVisible = Math.max(5, Number(maxVisible) || 7);

  if (totalPages <= normalizedMaxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const sideCount = Math.max(1, Math.floor((normalizedMaxVisible - 3) / 2));
  let start = Math.max(2, currentPage - sideCount);
  let end = Math.min(totalPages - 1, currentPage + sideCount);

  const targetWindow = normalizedMaxVisible - 2;
  const currentWindow = end - start + 1;

  if (currentWindow < targetWindow) {
    const needed = targetWindow - currentWindow;
    start = Math.max(2, start - needed);
    end = Math.min(totalPages - 1, start + targetWindow - 1);
  }

  const pages = [1];

  if (start > 2) {
    pages.push('ellipsis-left');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis-right');
  }

  pages.push(totalPages);

  return pages;
};

const Pagination = ({
  pagination,
  onPageChange,
  maxVisible = 7,
  ariaLabel = 'Phân trang',
  itemLabel = 'sản phẩm',
}) => {
  const totalPagesRaw = Number(pagination?.pages || 0);
  const totalPages = Number.isFinite(totalPagesRaw) && totalPagesRaw > 0 ? Math.floor(totalPagesRaw) : 0;

  if (totalPages <= 1) {
    return null;
  }

  const totalItems = Number(pagination?.total || 0);
  const currentPage = clampPage(Number(pagination?.page || 1), totalPages);
  const pageItems = buildVisiblePages(currentPage, totalPages, maxVisible);

  const triggerPageChange = (nextPage) => {
    if (typeof onPageChange !== 'function') {
      return;
    }

    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }

    onPageChange(nextPage);
  };

  return (
    <nav className="pagination" aria-label={ariaLabel}>
      <button
        type="button"
        className="pagination__button"
        disabled={currentPage === 1}
        onClick={() => triggerPageChange(currentPage - 1)}
      >
        Trước
      </button>

      <div className="pagination__pages" aria-live="polite">
        {pageItems.map((item) => {
          if (typeof item !== 'number') {
            return (
              <span key={item} className="pagination__ellipsis" aria-hidden="true">
                ...
              </span>
            );
          }

          return (
            <button
              key={item}
              type="button"
              className={`pagination__button ${item === currentPage ? 'pagination__button--active' : ''}`}
              onClick={() => triggerPageChange(item)}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="pagination__button"
        disabled={currentPage === totalPages}
        onClick={() => triggerPageChange(currentPage + 1)}
      >
        Sau
      </button>

      <p className="pagination__meta">Trang {currentPage}/{totalPages} - Tổng {totalItems} {itemLabel}</p>
    </nav>
  );
};

export default Pagination;