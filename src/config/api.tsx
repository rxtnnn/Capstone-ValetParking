import axios, { AxiosInstance, AxiosResponse } from 'axios';

export const API_CONFIG = {
  BASE_URL: 'https://valet.up.railway.app/api',
  API_TOKEN: '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad',
  TIMEOUT: 15000,
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.API_TOKEN}`,
  },
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    console.error('Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default apiClient;