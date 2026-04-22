import axiosInstance from './axiosInstance';

export const uploadSingle = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axiosInstance.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    authMode: 'admin',
  });

  return response.data;
};

export const uploadMultiple = async (files = []) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await axiosInstance.post('/upload/multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    authMode: 'admin',
  });

  return response.data;
};
