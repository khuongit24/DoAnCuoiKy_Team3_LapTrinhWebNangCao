import { useEffect, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';

import { getAuditLogs } from '../../api/adminAuditApi';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Message from '../../components/common/Message';
import Pagination from '../../components/common/Pagination';
import {
  ADMIN_AUDIT_ACTION_OPTIONS,
  ADMIN_AUDIT_RESOURCE_TYPE_OPTIONS,
  ADMIN_AUDIT_STATUS_OPTIONS,
} from '../../utils/constants';
import { getApiErrorMessageWithRequestId } from '../../utils/errorUtils';
import { formatDateTime, truncateText } from '../../utils/helpers';
import './AuditLogManage.css';

const PAGE_SIZE = 20;

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

const normalizeSearchValue = (value) => String(value || '').trim();

const normalizeUpperFilter = (value, validValues) => {
  const normalizedValue = String(value || '').trim().toUpperCase();

  if (!normalizedValue || !validValues.includes(normalizedValue)) {
    return 'all';
  }

  return normalizedValue;
};

const normalizeFilter = (value, validValues) => {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue || !validValues.includes(normalizedValue)) {
    return 'all';
  }

  return normalizedValue;
};

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.logs)) {
    return response.logs;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
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

const getStatusLabel = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  const matchedOption = ADMIN_AUDIT_STATUS_OPTIONS.find((option) => option.value === normalizedStatus);
  return matchedOption?.label || normalizedStatus || '--';
};

const getActionLabel = (action) => {
  const normalizedAction = String(action || '').trim();
  const matchedOption = ADMIN_AUDIT_ACTION_OPTIONS.find((option) => option.value === normalizedAction);
  return matchedOption?.label || normalizedAction || '--';
};

const getActorDisplay = (log) => {
  const actorEmail = String(log?.actor?.email || '').trim();

  if (actorEmail) {
    return actorEmail;
  }

  const actorUserId = String(log?.actor?.userId || '').trim();

  if (actorUserId) {
    return `ID: ${actorUserId}`;
  }

  return '--';
};

const getResourceDisplay = (log) => {
  const resourceType = String(log?.resource?.type || '').trim();
  const resourceId = String(log?.resource?.id || '').trim();

  if (!resourceType && !resourceId) {
    return '--';
  }

  if (!resourceId) {
    return resourceType;
  }

  return `${resourceType} - ${resourceId}`;
};

const AuditLogManage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const actionFilter = normalizeFilter(
    searchParams.get('action'),
    ADMIN_AUDIT_ACTION_OPTIONS.map((option) => option.value)
  );
  const statusFilter = normalizeUpperFilter(
    searchParams.get('status'),
    ADMIN_AUDIT_STATUS_OPTIONS.map((option) => option.value)
  );
  const resourceTypeFilter = normalizeFilter(
    searchParams.get('resourceType'),
    ADMIN_AUDIT_RESOURCE_TYPE_OPTIONS.map((option) => option.value)
  );
  const requestIdFilter = normalizeSearchValue(searchParams.get('requestId'));
  const page = parsePositiveInteger(searchParams.get('page'), 1);

  const [requestIdInput, setRequestIdInput] = useState(requestIdFilter);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setRequestIdInput(requestIdFilter);
  }, [requestIdFilter]);

  useEffect(() => {
    let isMounted = true;

    const fetchAuditLogs = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getAuditLogs({
          page,
          limit: PAGE_SIZE,
          ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(resourceTypeFilter !== 'all' ? { resourceType: resourceTypeFilter } : {}),
          ...(requestIdFilter ? { requestId: requestIdFilter } : {}),
        });

        if (!isMounted) {
          return;
        }

        const nextLogs = extractDataArray(response);
        const nextPagination = extractPagination(response, page, PAGE_SIZE);

        if (nextPagination.pages > 0 && page > nextPagination.pages) {
          setSearchParams((previousParams) => {
            const nextParams = new URLSearchParams(previousParams);
            nextParams.set('page', String(nextPagination.pages));
            return nextParams;
          }, { replace: true });
          return;
        }

        setLogs(nextLogs);
        setPagination(nextPagination);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setLogs([]);
        setPagination({
          page,
          pages: 0,
          total: 0,
          limit: PAGE_SIZE,
        });
        setError(getApiErrorMessageWithRequestId(requestError, 'Không thể tải nhật ký kiểm toán'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAuditLogs();

    return () => {
      isMounted = false;
    };
  }, [actionFilter, page, requestIdFilter, resourceTypeFilter, setSearchParams, statusFilter]);

  const hasLogs = useMemo(() => Array.isArray(logs) && logs.length > 0, [logs]);

  const updateSearchParams = (nextFilters) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set('page', String(nextFilters.page || 1));

      if (nextFilters.action && nextFilters.action !== 'all') {
        nextParams.set('action', nextFilters.action);
      } else {
        nextParams.delete('action');
      }

      if (nextFilters.status && nextFilters.status !== 'all') {
        nextParams.set('status', nextFilters.status);
      } else {
        nextParams.delete('status');
      }

      if (nextFilters.resourceType && nextFilters.resourceType !== 'all') {
        nextParams.set('resourceType', nextFilters.resourceType);
      } else {
        nextParams.delete('resourceType');
      }

      if (nextFilters.requestId) {
        nextParams.set('requestId', nextFilters.requestId);
      } else {
        nextParams.delete('requestId');
      }

      return nextParams;
    });
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();

    updateSearchParams({
      page: 1,
      action: actionFilter,
      status: statusFilter,
      resourceType: resourceTypeFilter,
      requestId: normalizeSearchValue(requestIdInput),
    });
  };

  const handleClearFilters = () => {
    setRequestIdInput('');
    setSearchParams(new URLSearchParams({ page: '1' }));
  };

  const handleFilterSelectChange = (fieldName, value) => {
    updateSearchParams({
      page: 1,
      action: fieldName === 'action' ? value : actionFilter,
      status: fieldName === 'status' ? value : statusFilter,
      resourceType: fieldName === 'resourceType' ? value : resourceTypeFilter,
      requestId: requestIdFilter,
    });
  };

  const handlePageChange = (nextPage) => {
    updateSearchParams({
      page: nextPage,
      action: actionFilter,
      status: statusFilter,
      resourceType: resourceTypeFilter,
      requestId: requestIdFilter,
    });
  };

  if (loading && !hasLogs) {
    return <Loader fullPage text="Đang tải nhật ký kiểm toán..." />;
  }

  return (
    <section className="admin-page audit-log-manage" aria-labelledby="admin-audit-log-title">
      <header className="audit-log-manage__header">
        <div>
          <h1 id="admin-audit-log-title" className="admin-page__title">Nhật ký kiểm toán</h1>
          <p className="admin-page__description">
            Theo dõi tất cả thao tác ghi dữ liệu của quản trị viên với bộ lọc và phân trang.
          </p>
        </div>
      </header>

      <form className="audit-log-manage__filters surface" onSubmit={handleFilterSubmit} aria-label="Bộ lọc nhật ký kiểm toán">
        <div className="form-group audit-log-manage__filter-item">
          <label className="form-label" htmlFor="audit-action-filter">Hành động</label>
          <select
            id="audit-action-filter"
            className="form-select"
            value={actionFilter}
            onChange={(event) => handleFilterSelectChange('action', event.target.value)}
          >
            <option value="all">Tất cả</option>
            {ADMIN_AUDIT_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group audit-log-manage__filter-item">
          <label className="form-label" htmlFor="audit-status-filter">Trạng thái</label>
          <select
            id="audit-status-filter"
            className="form-select"
            value={statusFilter}
            onChange={(event) => handleFilterSelectChange('status', event.target.value)}
          >
            <option value="all">Tất cả</option>
            {ADMIN_AUDIT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group audit-log-manage__filter-item">
          <label className="form-label" htmlFor="audit-resource-filter">Tài nguyên</label>
          <select
            id="audit-resource-filter"
            className="form-select"
            value={resourceTypeFilter}
            onChange={(event) => handleFilterSelectChange('resourceType', event.target.value)}
          >
            <option value="all">Tất cả</option>
            {ADMIN_AUDIT_RESOURCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group audit-log-manage__filter-item audit-log-manage__filter-item--wide">
          <label className="form-label" htmlFor="audit-request-id">Request ID</label>
          <div className="audit-log-manage__request-id-input-wrap">
            <FiSearch aria-hidden="true" />
            <input
              id="audit-request-id"
              type="search"
              className="form-input"
              value={requestIdInput}
              onChange={(event) => setRequestIdInput(event.target.value)}
              placeholder="Nhập requestId để truy vết"
            />
          </div>
        </div>

        <div className="audit-log-manage__actions">
          <button type="submit" className="btn btn-primary">Áp dụng</button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleClearFilters}
            disabled={
              actionFilter === 'all'
              && statusFilter === 'all'
              && resourceTypeFilter === 'all'
              && !requestIdFilter
            }
          >
            Xóa lọc
          </button>
        </div>
      </form>

      {error ? (
        <Message variant="error" onClose={() => setError('')}>
          {error}
        </Message>
      ) : null}

      {loading && hasLogs ? <Loader inline text="Đang cập nhật nhật ký kiểm toán..." /> : null}

      {!loading && !error && !hasLogs ? (
        <EmptyState
          title="Không có nhật ký phù hợp"
          description="Thử thay đổi bộ lọc để xem thêm dữ liệu kiểm toán."
        />
      ) : null}

      {hasLogs ? (
        <>
          <div className="audit-log-manage__table-wrap surface" role="region" aria-label="Bảng nhật ký kiểm toán">
            <table className="audit-log-manage__table">
              <caption className="sr-only">Danh sách nhật ký kiểm toán</caption>
              <thead>
                <tr>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Hành động</th>
                  <th scope="col">Tài nguyên</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Request ID</th>
                  <th scope="col">Lỗi</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log, index) => {
                  const logId = String(log?._id || '').trim();
                  const status = String(log?.status || '').trim().toUpperCase();
                  const errorMessage = String(log?.errorMessage || '').trim();
                  const errorCode = String(log?.errorCode || '').trim();
                  const requestId = String(log?.requestId || '').trim();

                  return (
                    <tr key={logId || `audit-log-${index + 1}`}>
                      <td>{formatDateTime(log?.timestamp)}</td>
                      <td>{getActionLabel(log?.action)}</td>
                      <td>{getResourceDisplay(log)}</td>
                      <td>{getActorDisplay(log)}</td>
                      <td>
                        <span className={`audit-log-manage__status audit-log-manage__status--${status.toLowerCase()}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td>
                        <span className="audit-log-manage__request-id" title={requestId || 'Không có request ID'}>
                          {requestId || '--'}
                        </span>
                      </td>
                      <td>
                        {status === 'FAILED' ? (
                          <p className="audit-log-manage__error" title={errorMessage || 'Không có mô tả lỗi'}>
                            {truncateText(`${errorCode || 'UNKNOWN'}: ${errorMessage || 'Không có mô tả lỗi'}`, 88)}
                          </p>
                        ) : (
                          <span className="audit-log-manage__no-error">--</span>
                        )}
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
              ariaLabel="Phân trang nhật ký kiểm toán"
              itemLabel="nhật ký"
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default AuditLogManage;
