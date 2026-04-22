import axiosInstance from './axiosInstance';

export const getProfile = async () => {
  const response = await axiosInstance.get('/users/profile');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await axiosInstance.put('/users/profile', data);
  return response.data;
};

export const updateShippingAddress = async (data) => {
  const response = await axiosInstance.put('/users/profile/address', data);
  return response.data;
};

export const deleteShippingAddress = async (addressId) => {
  const response = await axiosInstance.delete(`/users/profile/address/${addressId}`);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await axiosInstance.put('/users/profile/password', data);
  return response.data;
};

export const getUsers = async (params = {}) => {
  const response = await axiosInstance.get('/users', {
    params,
    authMode: 'admin',
  });
  return response.data;
};

export const getUserById = async (id) => {
  const response = await axiosInstance.get(`/users/${id}`, {
    authMode: 'admin',
  });
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await axiosInstance.put(`/users/${id}`, data, {
    authMode: 'admin',
  });
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await axiosInstance.delete(`/users/${id}`, {
    authMode: 'admin',
  });
  return response.data;
};
