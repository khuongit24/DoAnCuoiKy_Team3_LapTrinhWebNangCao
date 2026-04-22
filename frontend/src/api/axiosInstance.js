import axios from 'axios';

import {
  ADMIN_AUTH_PERMISSIONS_KEY,
  ADMIN_AUTH_PERMISSIONS_VERSION_KEY,
  ADMIN_AUTH_SID_KEY,
  ADMIN_AUTH_TOKEN_KEY,
  ADMIN_AUTH_USER_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
} from '../utils/storageKeys';

const ADMIN_AUTH_LOGIN_PATH = '/admin/auth/login';
const ADMIN_AUTH_REFRESH_PATH = '/admin/auth/refresh';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
});

let buyerUnauthorizedHandler;
let adminUnauthorizedHandler;
let adminSessionUpdatedHandler;
let refreshAdminPromise = null;

const resolveAuthMode = (config) => {
  const authMode = String(config?.authMode || 'buyer').trim().toLowerCase();

  if (authMode === 'admin' || authMode === 'buyer' || authMode === 'none') {
    return authMode;
  }

  return 'buyer';
};

const readBuyerAccessToken = () => String(localStorage.getItem(AUTH_TOKEN_KEY) || '').trim();
const readAdminAccessToken = () => String(localStorage.getItem(ADMIN_AUTH_TOKEN_KEY) || '').trim();

const clearBuyerSessionStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

const clearAdminSessionStorage = () => {
  localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_AUTH_USER_KEY);
  localStorage.removeItem(ADMIN_AUTH_SID_KEY);
  localStorage.removeItem(ADMIN_AUTH_PERMISSIONS_KEY);
  localStorage.removeItem(ADMIN_AUTH_PERMISSIONS_VERSION_KEY);
};

const persistAdminSessionStorage = (adminData) => {
  const user = adminData?.user;
  const token = String(adminData?.token || '').trim();
  const sid = String(adminData?.sid || '').trim();
  const permissions = Array.isArray(adminData?.permissions)
    ? adminData.permissions.map((permission) => String(permission || '').trim()).filter(Boolean)
    : [];
  const permissionsVersion = Number.parseInt(adminData?.permissionsVersion, 10);

  if (!user || !token || !sid || permissions.length === 0) {
    clearAdminSessionStorage();
    return;
  }

  localStorage.setItem(ADMIN_AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_AUTH_SID_KEY, sid);
  localStorage.setItem(ADMIN_AUTH_PERMISSIONS_KEY, JSON.stringify(permissions));

  if (!Number.isNaN(permissionsVersion) && permissionsVersion > 0) {
    localStorage.setItem(ADMIN_AUTH_PERMISSIONS_VERSION_KEY, String(permissionsVersion));
  } else {
    localStorage.removeItem(ADMIN_AUTH_PERMISSIONS_VERSION_KEY);
  }
};

const redirectToBuyerLoginIfNeeded = () => {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const redirectToAdminLoginIfNeeded = () => {
  if (window.location.pathname !== '/admin/login') {
    window.location.assign('/admin/login');
  }
};

const invokeBuyerUnauthorizedHandler = (error) => {
  if (typeof buyerUnauthorizedHandler === 'function') {
    buyerUnauthorizedHandler(error);
    return;
  }

  redirectToBuyerLoginIfNeeded();
};

const invokeAdminUnauthorizedHandler = (error) => {
  if (typeof adminUnauthorizedHandler === 'function') {
    adminUnauthorizedHandler(error);
    return;
  }

  redirectToAdminLoginIfNeeded();
};

const updateAdminSessionFromRefreshResponse = (responseData) => {
  const adminData = responseData?.data || null;

  persistAdminSessionStorage(adminData);

  if (typeof adminSessionUpdatedHandler === 'function') {
    adminSessionUpdatedHandler(responseData);
  }
};

const refreshAdminAccessToken = async () => {
  if (!refreshAdminPromise) {
    refreshAdminPromise = axiosInstance
      .post(ADMIN_AUTH_REFRESH_PATH, {}, {
        withCredentials: true,
        authMode: 'none',
        skipAuthHandling: true,
      })
      .then((response) => {
        updateAdminSessionFromRefreshResponse(response?.data || {});
        return response?.data || {};
      })
      .catch((error) => {
        clearAdminSessionStorage();
        throw error;
      })
      .finally(() => {
        refreshAdminPromise = null;
      });
  }

  return refreshAdminPromise;
};

export const setUnauthorizedHandler = (handler) => {
  buyerUnauthorizedHandler = handler;
};

export const setAdminUnauthorizedHandler = (handler) => {
  adminUnauthorizedHandler = handler;
};

export const setAdminSessionUpdatedHandler = (handler) => {
  adminSessionUpdatedHandler = handler;
};

axiosInstance.interceptors.request.use(
  (config) => {
    const nextConfig = {
      ...config,
      authMode: resolveAuthMode(config),
    };

    nextConfig.headers = nextConfig.headers || {};

    const token = nextConfig.authMode === 'admin'
      ? readAdminAccessToken()
      : nextConfig.authMode === 'buyer'
        ? readBuyerAccessToken()
        : '';

    if (token) {
      nextConfig.headers.Authorization = `Bearer ${token}`;
    } else if (nextConfig.headers?.Authorization) {
      delete nextConfig.headers.Authorization;
    }

    return nextConfig;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const statusCode = error?.response?.status;
    const originalRequest = error?.config || {};
    const authMode = resolveAuthMode(originalRequest);

    if (statusCode !== 401 || originalRequest?.skipAuthHandling) {
      return Promise.reject(error);
    }

    if (authMode === 'admin') {
      const requestUrl = String(originalRequest?.url || '');
      const isAdminRefreshRequest = requestUrl.includes(ADMIN_AUTH_REFRESH_PATH);
      const isAdminLoginRequest = requestUrl.includes(ADMIN_AUTH_LOGIN_PATH);
      const shouldSkipRefresh = Boolean(originalRequest?.skipAuthRefresh);

      if (isAdminRefreshRequest || isAdminLoginRequest || shouldSkipRefresh || originalRequest?._adminRetried) {
        clearAdminSessionStorage();
        invokeAdminUnauthorizedHandler(error);
        return Promise.reject(error);
      }

      originalRequest._adminRetried = true;

      try {
        const refreshResponse = await refreshAdminAccessToken();
        const nextToken = String(refreshResponse?.data?.token || '').trim();

        if (!nextToken) {
          throw new Error('Không thể làm mới access token quản trị');
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        originalRequest.authMode = 'admin';

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        clearAdminSessionStorage();
        invokeAdminUnauthorizedHandler(refreshError);
        return Promise.reject(error);
      }
    }

    clearBuyerSessionStorage();
    invokeBuyerUnauthorizedHandler(error);

    return Promise.reject(error);
  }
);

export default axiosInstance;
