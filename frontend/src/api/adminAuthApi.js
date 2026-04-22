import axiosInstance from './axiosInstance';

export const adminLogin = async (email, password) => {
  const response = await axiosInstance.post(
    '/admin/auth/login',
    { email, password },
    {
      withCredentials: true,
      authMode: 'none',
      skipAuthHandling: true,
    }
  );

  return response.data;
};

export const adminRefresh = async () => {
  const response = await axiosInstance.post(
    '/admin/auth/refresh',
    {},
    {
      withCredentials: true,
      authMode: 'none',
      skipAuthHandling: true,
    }
  );

  return response.data;
};

export const adminLogout = async () => {
  const response = await axiosInstance.post(
    '/admin/auth/logout',
    {},
    {
      withCredentials: true,
      authMode: 'admin',
      skipAuthRefresh: true,
    }
  );

  return response.data;
};

export const adminLogoutAll = async () => {
  const response = await axiosInstance.post(
    '/admin/auth/logout-all',
    {},
    {
      withCredentials: true,
      authMode: 'admin',
      skipAuthRefresh: true,
    }
  );

  return response.data;
};
