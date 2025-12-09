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
  withCredentials: false, // Mobile apps don't use cookies for Sanctum
});

// Request Interceptor - Add Sanctum token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      await TokenManager.ensureInitialized();
      const token = TokenManager.getToken();

      // IMPORTANT: Don't add token to login request (it generates a NEW token)
      // BUT do add token to logout request (it needs to revoke the current token)
      const isLoginEndpoint = config.url === '/login';

      if (token && !isLoginEndpoint) {
        // Laravel Sanctum uses Bearer token authentication for mobile
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added token to request:', config.url);
      } else if (isLoginEndpoint) {
        // For login, explicitly remove any old Authorization header
        delete config.headers.Authorization;
        console.log('Login request - no token added');
      }

      // Add custom headers for Sanctum
      config.headers['X-Requested-With'] = 'XMLHttpRequest';

      // Add User-Agent to help with rate limiting
      config.headers['User-Agent'] = 'ValetParkingMobileApp/1.0';

      // Add Accept header explicitly
      config.headers['Accept'] = 'application/json';

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

// Response Interceptor - Handle Sanctum errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('Unauthorized - token invalid or expired');

      // Clear invalid token
      await TokenManager.removeFromStorage();

      // You could implement token refresh here if your backend supports it
      // For now, we'll just reject and force re-login
    }

    // Handle 419 CSRF token mismatch (shouldn't happen in mobile, but just in case)
    if (error.response?.status === 419) {
      console.log('CSRF token mismatch');
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.log('Forbidden - insufficient permissions');
    }

    // Handle 429 Too Many Requests (Rate Limiting)
    if (error.response?.status === 429) {
      console.log('Too many requests - rate limited');
      const retryAfter = error.response?.headers['retry-after'];
      const errorMessage = error.response?.data?.message ||
                          `Too many login attempts. Please try again${retryAfter ? ` in ${retryAfter} seconds` : ' later'}.`;

      // Add custom error message
      error.userMessage = errorMessage;
    }

    return Promise.reject(error);
  }
);

/**
 * Login with Laravel Sanctum
 *
 * For mobile apps, Sanctum provides a token-based authentication.
 * The backend should return a token via the /login endpoint.
 */
export const login = async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
  try {
    console.log('Attempting login for:', credentials.email);

    // Make login request - backend should return a Sanctum token
    const response = await apiClient.post<LoginResponse>('/login', credentials);
    const { token, user, success, message } = response.data;

    if (success && token && user) {
      // Store the Sanctum token
      await TokenManager.saveToStorage(token, user);

      console.log('Login successful for:', user.email);

      return {
        success: true,
        message: message || 'Login successful',
        token,
        user,
      };
    } else {
      throw new Error(message || 'Login failed');
    }
  } catch (error: any) {
    console.log('Login failed:', error);
    console.log('Error response status:', error.response?.status);
    console.log('Error response data:', error.response?.data);
    console.log('Error response headers:', error.response?.headers);

    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      const rateLimitMessage = error.response?.data?.message ||
        (retryAfter ?
          `Too many login attempts. Please try again in ${retryAfter} seconds.` :
          'Too many login attempts. Please wait a moment and try again.');

      console.log('Rate limit hit. Retry after:', retryAfter);
      throw new Error(rateLimitMessage);
    }

    // Extract error message from response
    const errorMessage = error.userMessage ||
                        error.response?.data?.message ||
                        error.message ||
                        'Login failed';

    throw new Error(errorMessage);
  }
};

/**
 * Logout with Laravel Sanctum
 *
 * Revokes the current Sanctum token on the server and clears local storage
 */
export const logout = async (): Promise<void> => {
  try {
    // Call logout endpoint to revoke Sanctum token on server
    try {
      await apiClient.post('/logout');
      console.log('Sanctum token revoked on server');
    } catch (apiError: any) {
      // Log but don't fail - we still want to clear local token
      console.warn('Logout API call failed:', apiError.response?.data || apiError.message);
    }
  } finally {
    // Always clear local storage
    try {
      await TokenManager.removeFromStorage();
      console.log('Local token cleared');
    } catch (clearError) {
      console.log('Failed to clear local token:', clearError);
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