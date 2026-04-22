import axiosInstance from './axiosInstance';

export const getProducts = async (params = {}) => {
  const response = await axiosInstance.get('/products', { params });
  return response.data;
};

export const getFeaturedProducts = async () => {
  const response = await axiosInstance.get('/products/featured');
  return response.data;
};

export const getCategories = async () => {
  const response = await axiosInstance.get('/products/categories');
  return response.data;
};

export const getProductById = async (id) => {
  const response = await axiosInstance.get(`/products/${id}`, {
    authMode: 'admin',
  });
  return response.data;
};

export const getProductBySlug = async (slug) => {
  const response = await axiosInstance.get(`/products/slug/${slug}`);
  return response.data;
};

export const createReview = async (productId, payload) => {
  const response = await axiosInstance.post(`/products/${productId}/reviews`, payload);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await axiosInstance.post('/products', data, {
    authMode: 'admin',
  });
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await axiosInstance.put(`/products/${id}`, data, {
    authMode: 'admin',
  });
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await axiosInstance.delete(`/products/${id}`, {
    authMode: 'admin',
  });
  return response.data;
};
