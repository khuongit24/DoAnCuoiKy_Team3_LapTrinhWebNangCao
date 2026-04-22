import axiosInstance from './axiosInstance';

export const createOrder = async (data) => {
  const response = await axiosInstance.post('/orders', data);
  return response.data;
};

export const getMyOrders = async (params = {}) => {
  const response = await axiosInstance.get('/orders/my', { params });
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await axiosInstance.get(`/orders/${id}`);
  return response.data;
};

export const updateOrderToPaid = async (id, paymentResult = {}) => {
  const response = await axiosInstance.put(`/orders/${id}/pay`, paymentResult);
  return response.data;
};

export const getAllOrders = async (params = {}) => {
  const response = await axiosInstance.get('/orders', {
    params,
    authMode: 'admin',
  });
  return response.data;
};

export const updateOrderStatus = async (id, status) => {
  const response = await axiosInstance.put(
    `/orders/${id}/status`,
    { status },
    {
      authMode: 'admin',
    }
  );
  return response.data;
};
