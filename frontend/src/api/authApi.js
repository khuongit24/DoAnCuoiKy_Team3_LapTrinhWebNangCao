import axiosInstance from './axiosInstance';

export const login = async (email, password) => {
  const response = await axiosInstance.post('/auth/login', { email, password }, {
    authMode: 'none',
    skipAuthHandling: true,
  });
  return response.data;
};

export const register = async (name, email, password) => {
  const response = await axiosInstance.post('/auth/register', { name, email, password }, {
    authMode: 'none',
    skipAuthHandling: true,
  });
  return response.data;
};

export const logout = async () => {
  const response = await axiosInstance.post('/auth/logout', {}, {
    authMode: 'buyer',
  });
  return response.data;
};

export const getMe = async () => {
  const response = await axiosInstance.get('/auth/me', {
    authMode: 'buyer',
  });
  return response.data;
};
