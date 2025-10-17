import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/AppConst';

export const API_CONFIG = {
  BASE_URL: API_ENDPOINTS.baseUrl,
  TIMEOUT: 15000,
};
interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    employee_id: string;
  };
}
class TokenManager {
  private static token: string | null = null;
  private static user: LoginResponse['user'] | null = null;
  private static isInitialized: boolean = false;
  private static initializationPromise: Promise<void> | null = null;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private static async performInitialization(): Promise<void> {
    try {
      await this.loadFromStorage();
      this.isInitialized = true;
    } catch (error) {
      console.log('Error initializing Token Manager:', error);
      this.isInitialized = true; 
    } finally {
      this.initializationPromise = null;
    }
  }

  static setToken(token: string): void {
    this.token = token;
  }

  static getToken(): string | null {
    return this.token;
  }

  static setUser(user: LoginResponse['user']): void {
    this.user = user;
  }

  static getUser(): LoginResponse['user'] | null {
    return this.user;
  }

  static clearToken(): void {
    this.token = null;
    this.user = null;
  }

  static async saveToStorage(token: string, user: LoginResponse['user']): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem('auth_token', token),
        AsyncStorage.setItem('user_data', JSON.stringify(user))
      ]);
      
      this.setToken(token);
      this.setUser(user);
    } catch (error) {
      console.log('Error saving to AsyncStorage:', error);
      throw error;
    }
  }

  static async loadFromStorage(): Promise<{ token: string | null; user: LoginResponse['user'] | null }> {
    try {
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_data')
      ]);
      
      let parsedUser: LoginResponse['user'] | null = null;
      
      if (userData) {
        try {
          parsedUser = JSON.parse(userData);
        } catch (parseError) {
          console.log('Error parsing user data from AsyncStorage:', parseError);
          try {
            await AsyncStorage.removeItem('user_data');
          } catch (removeError) {
            console.log('Failed to remove corrupted user data:', removeError);
          }
        }
      }
      
      if (token) { this.setToken(token); }
      if (parsedUser) { this.setUser(parsedUser);}
      
      return { token, user: parsedUser };
    } catch (error) {
      console.log('Error loading from AsyncStorage:', error);
      return { token: null, user: null };
    }
  }

  static async removeFromStorage(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem('auth_token'),
        AsyncStorage.removeItem('user_data')
      ]);
      
      this.clearToken();
    } catch (error) {
      console.log('Error removing from AsyncStorage:', error);
      this.clearToken();
    }
  }

  static getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  static isAuthenticated(): boolean {
     return !!this.token;
  }

  static getUserInfo(): { id: number | null; name?: string; email?: string; role?: string; employee_id?: string } {
    if (this.user) {
      return {
        id: this.user.id,
        name: this.user.name,
        email: this.user.email,
        role: this.user.role,
        employee_id: this.user.employee_id
      };
    }
    return { id: null };
  }

  static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch (error) {
        console.warn('TokenManager initialization failed, continuing without stored data:', error);
      }
    }
  }

  static getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.token,
      hasUser: !!this.user,
      userName: this.user?.name,
      userId: this.user?.id
    };
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      await TokenManager.ensureInitialized();
      const token = TokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to initialize TokenManager in request interceptor:', error);
    }
    
    return config;
  },
  (error) => {
    console.log('Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    return Promise.reject(error);
  }
);

export const login = async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>('/login', credentials);
    const { token, user, success, message } = response.data;
    
    if (success && token && user) {
      await TokenManager.saveToStorage(token, user);
      return {
        success: true,
        message,
        token,
        user,
      };
    } else {
      throw new Error(message || 'Login failed');
    }
  } catch (error) {
    console.log('Login failed:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    try {
      await apiClient.post('/logout');
    } catch (apiError) {
      console.warn('Logout API call failed:', apiError);
    }
  } finally {
    try {
      await TokenManager.removeFromStorage();
    } catch (clearError) {
      console.log('Failed to clear data on logout:', clearError);
    }
  }
};

const initializeTokenManager = async () => {
  try {
    await TokenManager.initialize();
  } catch (error) {
    console.warn('Initial TokenManager initialization failed: ', error);
  }
};
initializeTokenManager();

export { TokenManager };
export default apiClient;