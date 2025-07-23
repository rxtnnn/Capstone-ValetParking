import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://valet.up.railway.app/api/feedbacks', // Your Railway URL
  FEEDBACKS_ENDPOINT: 'https://valet.up.railway.app/feedbacks', // Specific feedback endpoint
  API_TOKEN: '8|HncMi9QI3CvmrT68pANh64bqBBj47Vw8DPWozeGe61cea8b0', // Your API token
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.API_TOKEN}`, // Add Bearer token for authentication
  },
});

// Create specific instance for feedbacks endpoint
export const feedbackClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.FEEDBACKS_ENDPOINT,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.API_TOKEN}`, // Add Bearer token for authentication
  },
});

// Add request interceptor for logging (optional)
const setupInterceptors = (client: AxiosInstance) => {
  client.interceptors.request.use(
    (config) => {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      // Ensure token is always present
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${API_CONFIG.API_TOKEN}`;
      }
      return config;
    },
    (error) => {
      console.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      console.error('API Response Error:', error.response?.data || error.message);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.error('Authentication failed - check API token');
      }
      
      return Promise.reject(error);
    }
  );
};

// Setup interceptors for both clients
setupInterceptors(apiClient);
setupInterceptors(feedbackClient);

export default apiClient;