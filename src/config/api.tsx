import axios, { AxiosInstance, AxiosResponse } from 'axios';

export const API_CONFIG = {
  BASE_URL: 'https://valet.up.railway.app/api',
  API_TOKEN: '8|HncMi9QI3CvmrT68pANh64bqBBj47Vw8DPWozeGe61cea8b0',
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

// Enhanced logging for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log('📤 Data:', JSON.stringify(config.data, null, 2));
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.status}`);
    console.log('📥 Data:', JSON.stringify(response.data, null, 2));
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default apiClient;