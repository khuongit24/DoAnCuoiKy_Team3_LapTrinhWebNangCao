import axiosInstance from './axiosInstance';

export const getAuditLogs = async (params = {}) => {
  const response = await axiosInstance.get('/admin/audit-logs', {
    params,
    authMode: 'admin',
  });

  return response.data;
};
