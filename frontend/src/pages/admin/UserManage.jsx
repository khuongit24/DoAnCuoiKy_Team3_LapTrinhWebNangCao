import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { deleteUser, getUsers, updateUser } from '../../api/userApi';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Message from '../../components/common/Message';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { formatDate } from '../../utils/helpers';
import './UserManage.css';

const PAGE_SIZE = 10;
const ROLE_OPTIONS = ['user', 'admin'];

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

const normalizeRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (!ROLE_OPTIONS.includes(normalizedRole)) {
    return 'user';
  }

  return normalizedRole;
};

const extractDataArray = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.users)) {
    return response.users;
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

const extractDisplayName = (user) => {
  const name = String(user?.name || '').trim();

  if (name) {
    return name;
  }

  const email = String(user?.email || '').trim();
  if (email) {
    return email;
  }

  return 'Người dùng';
};

const buildAvatarFallback = (user) => {
  const preferredSource = String(user?.name || user?.email || '').trim();

  if (!preferredSource) {
    return 'ND';
  }

  const parts = preferredSource.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return preferredSource.slice(0, 2).toUpperCase();
};

const UserManage = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveInteger(searchParams.get('page'), 1);
  const keyword = normalizeKeyword(searchParams.get('keyword'));

  const [keywordInput, setKeywordInput] = useState(keyword);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [roleDraftById, setRoleDraftById] = useState({});
  const [savingRoleById, setSavingRoleById] = useState({});
  const [deletingById, setDeletingById] = useState({});
  const [rowErrorsById, setRowErrorsById] = useState({});

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getUsers({
          page,
          limit: PAGE_SIZE,
          ...(keyword ? { keyword } : {}),
        });

        if (!isMounted) {
          return;
        }

        const userData = extractDataArray(response);
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

        setUsers(userData);
        setPagination(nextPagination);
        setRoleDraftById((previousDrafts) => {
          const nextDrafts = {};

          userData.forEach((userRow) => {
            const userId = String(userRow?._id || '').trim();
            if (!userId) {
              return;
            }

            const currentRole = normalizeRole(userRow?.role);
            const previousRole = normalizeRole(previousDrafts[userId]);
            nextDrafts[userId] = previousRole || currentRole;
          });

          return nextDrafts;
        });
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setUsers([]);
        setPagination({
          page,
          pages: 0,
          total: 0,
          limit: PAGE_SIZE,
        });
        setError(getApiErrorMessage(requestError, 'Không thể tải danh sách người dùng'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [keyword, page, refreshTick, setSearchParams]);

  const hasUsers = useMemo(() => Array.isArray(users) && users.length > 0, [users]);
  const currentUserId = String(currentUser?._id || '').trim();

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

  const handleRoleDraftChange = (userId, roleValue) => {
    setRoleDraftById((previousDrafts) => ({
      ...previousDrafts,
      [userId]: normalizeRole(roleValue),
    }));

    setRowErrorsById((previousErrors) => {
      if (!previousErrors[userId]) {
        return previousErrors;
      }

      const nextErrors = { ...previousErrors };
      delete nextErrors[userId];
      return nextErrors;
    });
  };

  const handleSaveRole = async (userRow) => {
    const userId = String(userRow?._id || '').trim();

    if (!userId) {
      return;
    }

    const currentRole = normalizeRole(userRow?.role);
    const nextRole = normalizeRole(roleDraftById[userId] || currentRole);

    if (nextRole === currentRole) {
      return;
    }

    setSavingRoleById((previousState) => ({
      ...previousState,
      [userId]: true,
    }));

    try {
      const response = await updateUser(userId, { role: nextRole });
      const updatedRole = normalizeRole(response?.data?.role || response?.role || nextRole);

      setUsers((previousUsers) => previousUsers.map((item) => {
        if (String(item?._id || '').trim() !== userId) {
          return item;
        }

        return {
          ...item,
          role: updatedRole,
        };
      }));

      setRoleDraftById((previousDrafts) => ({
        ...previousDrafts,
        [userId]: updatedRole,
      }));

      setRowErrorsById((previousErrors) => {
        if (!previousErrors[userId]) {
          return previousErrors;
        }

        const nextErrors = { ...previousErrors };
        delete nextErrors[userId];
        return nextErrors;
      });
    } catch (requestError) {
      setRowErrorsById((previousErrors) => ({
        ...previousErrors,
        [userId]: getApiErrorMessage(requestError, 'Không thể cập nhật vai trò người dùng'),
      }));
    } finally {
      setSavingRoleById((previousState) => ({
        ...previousState,
        [userId]: false,
      }));
    }
  };

  const handleDeleteUser = async (userRow) => {
    const userId = String(userRow?._id || '').trim();

    if (!userId) {
      return;
    }

    if (currentUserId && currentUserId === userId) {
      setRowErrorsById((previousErrors) => ({
        ...previousErrors,
        [userId]: 'Không thể tự xóa chính mình.',
      }));
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${extractDisplayName(userRow)}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingById((previousState) => ({
      ...previousState,
      [userId]: true,
    }));

    try {
      await deleteUser(userId);
      setRefreshTick((previous) => previous + 1);

      setRowErrorsById((previousErrors) => {
        if (!previousErrors[userId]) {
          return previousErrors;
        }

        const nextErrors = { ...previousErrors };
        delete nextErrors[userId];
        return nextErrors;
      });
    } catch (requestError) {
      setRowErrorsById((previousErrors) => ({
        ...previousErrors,
        [userId]: getApiErrorMessage(requestError, 'Không thể xóa người dùng'),
      }));
    } finally {
      setDeletingById((previousState) => ({
        ...previousState,
        [userId]: false,
      }));
    }
  };

  if (loading && !hasUsers) {
    return <Loader fullPage text="Đang tải danh sách người dùng..." />;
  }

  return (
    <section className="admin-page user-manage" aria-labelledby="admin-user-manage-title">
      <header className="user-manage__header">
        <div>
          <h1 id="admin-user-manage-title" className="admin-page__title">Quản lý người dùng</h1>
          <p className="admin-page__description">Tìm kiếm, cập nhật vai trò và xóa người dùng trong hệ thống.</p>
        </div>
      </header>

      <form className="user-manage__search surface" onSubmit={handleSearchSubmit} aria-label="Tìm kiếm người dùng">
        <div className="form-group user-manage__search-field">
          <label htmlFor="admin-user-keyword" className="sr-only">Tìm theo tên hoặc email</label>
          <input
            id="admin-user-keyword"
            type="search"
            className="form-input"
            placeholder="Nhập tên hoặc email..."
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            aria-label="Nhập từ khóa tìm người dùng"
          />
        </div>

        <button type="submit" className="btn btn-primary user-manage__search-btn" aria-label="Tìm kiếm người dùng">
          Tìm
        </button>

        <button
          type="button"
          className="btn btn-outline user-manage__clear-btn"
          onClick={handleClearSearch}
          disabled={!keyword && !normalizeKeyword(keywordInput)}
          aria-label="Xóa bộ lọc tìm kiếm người dùng"
        >
          Xóa lọc
        </button>
      </form>

      {error ? (
        <Message variant="error" onClose={() => setError('')}>
          {error}
        </Message>
      ) : null}

      {loading && hasUsers ? <Loader inline text="Đang cập nhật danh sách người dùng..." /> : null}

      {!loading && !error && !hasUsers ? (
        <EmptyState
          title="Không tìm thấy người dùng"
          description="Thử điều chỉnh từ khóa tìm kiếm để hiển thị kết quả phù hợp hơn."
        />
      ) : null}

      {hasUsers ? (
        <>
          <div className="user-manage__table-wrap surface" role="region" aria-label="Bảng người dùng admin">
            <table className="user-manage__table">
              <caption className="sr-only">Danh sách người dùng trong trang quản trị</caption>
              <thead>
                <tr>
                  <th scope="col">Avatar</th>
                  <th scope="col">Tên</th>
                  <th scope="col">Email</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Ngày tham gia</th>
                  <th scope="col">Hành động</th>
                </tr>
              </thead>

              <tbody>
                {users.map((userRow, index) => {
                  const userId = String(userRow?._id || '').trim();
                  const currentRole = normalizeRole(userRow?.role);
                  const selectedRole = normalizeRole(roleDraftById[userId] || currentRole);
                  const isSavingRole = Boolean(savingRoleById[userId]);
                  const isDeleting = Boolean(deletingById[userId]);
                  const isSelf = Boolean(currentUserId) && currentUserId === userId;
                  const rowError = rowErrorsById[userId];
                  const disableSaveRole =
                    !userId ||
                    isSavingRole ||
                    isDeleting ||
                    selectedRole === currentRole;
                  const disableDelete = !userId || isSavingRole || isDeleting || isSelf;
                  const avatar = String(userRow?.avatar || '').trim();

                  return (
                    <tr key={userId || `${userRow?.email || 'user'}-${index + 1}`}>
                      <td>
                        <div className="user-manage__avatar-wrap">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={`Avatar ${extractDisplayName(userRow)}`}
                              className="user-manage__avatar-image"
                            />
                          ) : (
                            <span className="user-manage__avatar-fallback" aria-hidden="true">
                              {buildAvatarFallback(userRow)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{extractDisplayName(userRow)}</td>
                      <td>{String(userRow?.email || '--')}</td>
                      <td>
                        <span className={`user-manage__role-badge user-manage__role-badge--${currentRole}`}>
                          {currentRole}
                        </span>
                      </td>
                      <td>{formatDate(userRow?.createdAt)}</td>
                      <td>
                        <div className="user-manage__actions">
                          <div className="user-manage__role-editor">
                            <label htmlFor={`user-role-${userId || index}`} className="sr-only">
                              Chọn vai trò cho người dùng
                            </label>
                            <select
                              id={`user-role-${userId || index}`}
                              className="form-select user-manage__role-select"
                              value={selectedRole}
                              onChange={(event) => handleRoleDraftChange(userId, event.target.value)}
                              disabled={!userId || isSavingRole || isDeleting}
                              aria-label={`Chọn vai trò cho người dùng ${extractDisplayName(userRow)}`}
                            >
                              {ROLE_OPTIONS.map((roleOption) => (
                                <option key={roleOption} value={roleOption}>
                                  {roleOption}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="btn btn-primary user-manage__save-role-btn"
                              onClick={() => handleSaveRole(userRow)}
                              disabled={disableSaveRole}
                              aria-label={`Lưu vai trò cho người dùng ${extractDisplayName(userRow)}`}
                            >
                              {isSavingRole ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn btn-outline user-manage__delete-btn"
                            onClick={() => handleDeleteUser(userRow)}
                            disabled={disableDelete}
                            title={isSelf ? 'Không thể tự xóa chính mình' : 'Xóa người dùng'}
                            aria-label={
                              isSelf
                                ? `Không thể tự xóa chính mình: ${extractDisplayName(userRow)}`
                                : `Xóa người dùng ${extractDisplayName(userRow)}`
                            }
                          >
                            {isDeleting ? 'Đang xóa...' : 'Xóa'}
                          </button>

                          {rowError ? (
                            <p className="user-manage__row-error" role="alert">
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
                ariaLabel="Phân trang người dùng admin"
                itemLabel="người dùng"
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default UserManage;
