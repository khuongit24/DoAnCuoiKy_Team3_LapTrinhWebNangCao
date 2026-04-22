/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import toast from 'react-hot-toast';

import {
  adminLogin as adminLoginApi,
  adminLogout as adminLogoutApi,
  adminLogoutAll as adminLogoutAllApi,
  adminRefresh as adminRefreshApi,
} from '../api/adminAuthApi';
import { getMe, login as loginApi, logout as logoutApi, register as registerApi } from '../api/authApi';
import {
  setAdminSessionUpdatedHandler,
  setAdminUnauthorizedHandler,
  setUnauthorizedHandler,
} from '../api/axiosInstance';
import { updateProfile as updateProfileApi } from '../api/userApi';
import { ADMIN_PANEL_ACCESS_PERMISSION } from '../utils/constants';
import { getApiErrorMessage, getApiErrorMessageWithRequestId } from '../utils/errorUtils';
import {
  ADMIN_AUTH_PERMISSIONS_KEY,
  ADMIN_AUTH_PERMISSIONS_VERSION_KEY,
  ADMIN_AUTH_SID_KEY,
  ADMIN_AUTH_TOKEN_KEY,
  ADMIN_AUTH_USER_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
} from '../utils/storageKeys';

export const AuthContext = createContext(null);

const normalizePermissions = (permissionsInput) => {
  if (!Array.isArray(permissionsInput)) {
    return [];
  }

  const uniquePermissions = new Set();

  permissionsInput.forEach((permission) => {
    const normalizedPermission = String(permission || '').trim();

    if (normalizedPermission) {
      uniquePermissions.add(normalizedPermission);
    }
  });

  return Array.from(uniquePermissions);
};

const readStoredJson = (storageKey) => {
  const rawUser = localStorage.getItem(storageKey);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

const readStoredPermissionsVersion = () => {
  const parsedValue = Number.parseInt(localStorage.getItem(ADMIN_AUTH_PERMISSIONS_VERSION_KEY), 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
};

const persistBuyerSession = (user, token) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

const clearBuyerSessionStorage = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const clearAdminSessionStorage = () => {
  localStorage.removeItem(ADMIN_AUTH_USER_KEY);
  localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_AUTH_SID_KEY);
  localStorage.removeItem(ADMIN_AUTH_PERMISSIONS_KEY);
  localStorage.removeItem(ADMIN_AUTH_PERMISSIONS_VERSION_KEY);
};

const persistAdminSession = ({ user, token, sid, permissions, permissionsVersion }) => {
  localStorage.setItem(ADMIN_AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_AUTH_SID_KEY, sid);
  localStorage.setItem(ADMIN_AUTH_PERMISSIONS_KEY, JSON.stringify(normalizePermissions(permissions)));

  if (Number.isInteger(permissionsVersion) && permissionsVersion > 0) {
    localStorage.setItem(ADMIN_AUTH_PERMISSIONS_VERSION_KEY, String(permissionsVersion));
  } else {
    localStorage.removeItem(ADMIN_AUTH_PERMISSIONS_VERSION_KEY);
  }
};

const readStoredAdminSession = () => {
  const user = readStoredJson(ADMIN_AUTH_USER_KEY);
  const token = String(localStorage.getItem(ADMIN_AUTH_TOKEN_KEY) || '').trim();
  const sid = String(localStorage.getItem(ADMIN_AUTH_SID_KEY) || '').trim();
  const permissions = normalizePermissions(readStoredJson(ADMIN_AUTH_PERMISSIONS_KEY));
  const permissionsVersion = readStoredPermissionsVersion();

  if (!user || !token || !sid || permissions.length === 0) {
    return null;
  }

  return {
    user,
    token,
    sid,
    permissions,
    permissionsVersion,
  };
};

const decodeBase64Url = (input) => {
  const normalizedInput = String(input || '').replace(/-/g, '+').replace(/_/g, '/');

  if (!normalizedInput) {
    return '';
  }

  const paddedInput = normalizedInput.padEnd(Math.ceil(normalizedInput.length / 4) * 4, '=');
  return window.atob(paddedInput);
};

const decodeJwtPayload = (token) => {
  const normalizedToken = String(token || '').trim();

  if (!normalizedToken) {
    return null;
  }

  const tokenParts = normalizedToken.split('.');

  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const payloadJson = decodeBase64Url(tokenParts[1]);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

const isAdminRoutePath = (pathname) => String(pathname || '').startsWith('/admin');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const [adminUser, setAdminUser] = useState(null);
  const [adminToken, setAdminToken] = useState('');
  const [adminSid, setAdminSid] = useState('');
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [adminPermissionsVersion, setAdminPermissionsVersion] = useState(1);
  const [adminLoading, setAdminLoading] = useState(true);

  const clearBuyerSession = useCallback(() => {
    setUser(null);
    setToken(null);
    clearBuyerSessionStorage();
  }, []);

  const clearAdminSession = useCallback(() => {
    setAdminUser(null);
    setAdminToken('');
    setAdminSid('');
    setAdminPermissions([]);
    setAdminPermissionsVersion(1);
    clearAdminSessionStorage();
  }, []);

  const hydrateAdminSession = useCallback((adminData) => {
    const nextUser = adminData?.user || null;
    const nextToken = String(adminData?.token || '').trim();
    const nextSid = String(adminData?.sid || '').trim();
    const nextPermissions = normalizePermissions(adminData?.permissions);
    const parsedPermissionsVersion = Number.parseInt(adminData?.permissionsVersion, 10);
    const nextPermissionsVersion = Number.isNaN(parsedPermissionsVersion) || parsedPermissionsVersion < 1
      ? 1
      : parsedPermissionsVersion;

    if (!nextUser || !nextToken || !nextSid || nextPermissions.length === 0) {
      clearAdminSession();
      return null;
    }

    setAdminUser(nextUser);
    setAdminToken(nextToken);
    setAdminSid(nextSid);
    setAdminPermissions(nextPermissions);
    setAdminPermissionsVersion(nextPermissionsVersion);

    persistAdminSession({
      user: nextUser,
      token: nextToken,
      sid: nextSid,
      permissions: nextPermissions,
      permissionsVersion: nextPermissionsVersion,
    });

    return {
      user: nextUser,
      token: nextToken,
      sid: nextSid,
      permissions: nextPermissions,
      permissionsVersion: nextPermissionsVersion,
    };
  }, [clearAdminSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearBuyerSession();

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    });

    setAdminUnauthorizedHandler(() => {
      clearAdminSession();
      setAdminLoading(false);

      if (isAdminRoutePath(window.location.pathname) && window.location.pathname !== '/admin/login') {
        window.location.assign('/admin/login');
      }
    });

    setAdminSessionUpdatedHandler((responseData) => {
      hydrateAdminSession(responseData?.data || null);
    });

    return () => {
      setUnauthorizedHandler(undefined);
      setAdminUnauthorizedHandler(undefined);
      setAdminSessionUpdatedHandler(undefined);
    };
  }, [clearAdminSession, clearBuyerSession, hydrateAdminSession]);

  useEffect(() => {
    const storedToken = String(localStorage.getItem(AUTH_TOKEN_KEY) || '').trim();
    const storedUser = readStoredJson(AUTH_USER_KEY);

    if (!storedToken || !storedUser) {
      clearBuyerSessionStorage();
      setLoading(false);
      return;
    }

    setToken(storedToken);
    setUser(storedUser);

    getMe()
      .then((response) => {
        if (response?.data) {
          const normalizedRole = String(response.data.role || '').trim().toLowerCase();

          if (normalizedRole === 'admin') {
            clearBuyerSession();
            return;
          }

          setUser(response.data);
          persistBuyerSession(response.data, storedToken);
        }
      })
      .catch(() => {
        clearBuyerSession();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clearBuyerSession]);

  useEffect(() => {
    const storedAdminSession = readStoredAdminSession();

    if (!storedAdminSession) {
      clearAdminSessionStorage();
      setAdminLoading(false);
      return;
    }

    setAdminUser(storedAdminSession.user);
    setAdminToken(storedAdminSession.token);
    setAdminSid(storedAdminSession.sid);
    setAdminPermissions(storedAdminSession.permissions);
    setAdminPermissionsVersion(storedAdminSession.permissionsVersion);

    if (!isAdminRoutePath(window.location.pathname) || window.location.pathname === '/admin/login') {
      setAdminLoading(false);
      return;
    }

    adminRefreshApi()
      .then((response) => {
        hydrateAdminSession(response?.data || null);
      })
      .catch(() => {
        clearAdminSession();
      })
      .finally(() => {
        setAdminLoading(false);
      });
  }, [clearAdminSession, hydrateAdminSession]);

  const login = useCallback(async (email, password) => {
    setLoading(true);

    try {
      const response = await loginApi(email, password);
      const authData = response?.data || {};
      const normalizedRole = String(authData?.user?.role || '').trim().toLowerCase();

      if (normalizedRole === 'admin') {
        clearBuyerSession();
        throw new Error('Tài khoản quản trị vui lòng đăng nhập tại trang /admin/login');
      }

      setUser(authData.user || null);
      setToken(authData.token || null);

      if (authData.user && authData.token) {
        persistBuyerSession(authData.user, authData.token);
      }

      toast.success(response?.message || 'Đăng nhập thành công');
      return response;
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Đăng nhập thất bại'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearBuyerSession]);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);

    try {
      const response = await registerApi(name, email, password);
      const authData = response?.data || {};

      setUser(authData.user || null);
      setToken(authData.token || null);

      if (authData.user && authData.token) {
        persistBuyerSession(authData.user, authData.token);
      }

      toast.success(response?.message || 'Đăng ký thành công');
      return response;
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Đăng ký thất bại'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await logoutApi();
    } catch {
      // API logout buyer có thể thất bại khi token đã hết hạn.
    } finally {
      clearBuyerSession();
      toast.success('Đăng xuất thành công');
      setLoading(false);
    }
  }, [clearBuyerSession]);

  const updateProfile = useCallback(async (payload) => {
    setLoading(true);

    try {
      const response = await updateProfileApi(payload);
      const updatedUser = response?.data;

      if (updatedUser) {
        setUser(updatedUser);

        if (token) {
          persistBuyerSession(updatedUser, token);
        }
      }

      toast.success(response?.message || 'Cập nhật thông tin thành công');
      return response;
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Cập nhật thông tin thất bại'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const adminLogin = useCallback(async (email, password) => {
    setAdminLoading(true);

    try {
      const response = await adminLoginApi(email, password);
      const adminData = response?.data || null;

      const hydratedSession = hydrateAdminSession(adminData);

      if (!hydratedSession) {
        throw new Error('Dữ liệu phiên quản trị không hợp lệ');
      }

      toast.success(response?.message || 'Đăng nhập quản trị thành công');
      return response;
    } catch (error) {
      toast.error(getApiErrorMessageWithRequestId(error, 'Đăng nhập quản trị thất bại'));
      throw error;
    } finally {
      setAdminLoading(false);
    }
  }, [hydrateAdminSession]);

  const refreshAdminSession = useCallback(async () => {
    const response = await adminRefreshApi();
    hydrateAdminSession(response?.data || null);
    return response;
  }, [hydrateAdminSession]);

  const adminLogout = useCallback(async () => {
    setAdminLoading(true);

    try {
      await adminLogoutApi();
    } catch {
      // API logout admin có thể thất bại khi phiên đã hết hạn hoặc đã revoke.
    } finally {
      clearAdminSession();
      toast.success('Đăng xuất quản trị thành công');
      setAdminLoading(false);
    }
  }, [clearAdminSession]);

  const adminLogoutAll = useCallback(async () => {
    setAdminLoading(true);

    try {
      const response = await adminLogoutAllApi();
      clearAdminSession();
      toast.success(response?.message || 'Đã đăng xuất tất cả phiên quản trị');
      return response;
    } catch (error) {
      toast.error(getApiErrorMessageWithRequestId(error, 'Không thể đăng xuất tất cả phiên quản trị'));
      throw error;
    } finally {
      setAdminLoading(false);
    }
  }, [clearAdminSession]);

  const adminClaims = useMemo(() => decodeJwtPayload(adminToken), [adminToken]);

  const adminClaimRole = String(adminClaims?.role || '').trim().toLowerCase();
  const adminClaimSid = String(adminClaims?.sid || '').trim();
  const adminClaimTokenType = String(adminClaims?.tokenType || '').trim();
  const adminClaimPermissions = normalizePermissions(adminClaims?.permissions);
  const adminPermissionSet = adminPermissions.length > 0 ? adminPermissions : adminClaimPermissions;

  const hasAdminPanelPermission = adminPermissionSet.includes(ADMIN_PANEL_ACCESS_PERMISSION);
  const hasAdminClaimRole = adminClaimRole === 'admin';
  const hasValidSid = Boolean(adminClaimSid) && adminClaimSid === adminSid;
  const hasValidTokenType = adminClaimTokenType === 'admin_access';

  const isAdminSessionAuthenticated = Boolean(
    adminUser
    && adminToken
    && adminSid
    && String(adminUser?.role || '').trim().toLowerCase() === 'admin'
    && hasAdminClaimRole
    && hasAdminPanelPermission
    && hasValidSid
    && hasValidTokenType
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isAdmin: String(user?.role || '').trim().toLowerCase() === 'admin' || isAdminSessionAuthenticated,
      login,
      register,
      logout,
      updateProfile,
      adminUser,
      adminToken,
      adminSid,
      adminPermissions: adminPermissionSet,
      adminPermissionsVersion,
      adminLoading,
      isAdminSessionAuthenticated,
      hasAdminPanelPermission,
      adminLogin,
      refreshAdminSession,
      adminLogout,
      adminLogoutAll,
      clearAdminSession,
    }),
    [
      adminLoading,
      adminLogin,
      adminLogout,
      adminLogoutAll,
      adminPermissionSet,
      adminPermissionsVersion,
      adminSid,
      adminToken,
      adminUser,
      clearAdminSession,
      hasAdminPanelPermission,
      isAdminSessionAuthenticated,
      loading,
      login,
      logout,
      refreshAdminSession,
      register,
      token,
      updateProfile,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
