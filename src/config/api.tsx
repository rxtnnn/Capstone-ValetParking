import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_CONFIG = {
  BASE_URL: 'https://valet.up.railway.app/api',
  TIMEOUT: 15000,
};

// Types matching your API response
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

// Token and User management with AsyncStorage
class TokenManager {
  private static token: string | null = null;
  private static user: LoginResponse['user'] | null = null;
  private static isInitialized: boolean = false;
  private static initializationPromise: Promise<void> | null = null;

  static async initialize(): Promise<void> {
    // Prevent multiple simultaneous initialization calls
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
      console.error('Error initializing TokenManager:', error);
      this.isInitialized = true; // Mark as initialized even on error to prevent loops
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

  // Store both token and user data in AsyncStorage
  static async saveToStorage(token: string, user: LoginResponse['user']): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem('auth_token', token),
        AsyncStorage.setItem('user_data', JSON.stringify(user))
      ]);
      
      this.setToken(token);
      this.setUser(user);
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
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
          console.error('Error parsing user data from AsyncStorage:', parseError);
          try {
            await AsyncStorage.removeItem('user_data');
          } catch (removeError) {
            console.error('Failed to remove corrupted user data:', removeError);
          }
        }
      }
      
      if (token) { this.setToken(token); }
      if (parsedUser) { this.setUser(parsedUser);}
      
      return { token, user: parsedUser };
    } catch (error) {
      console.error('Error loading from AsyncStorage:', error);
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
      console.error('Error removing from AsyncStorage:', error);
      // Even if AsyncStorage fails, clear the in-memory data
      this.clearToken();
    }
  }

  // Check if TokenManager is initialized
  static getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!(this.token && this.user);
  }

  // Get user info safely
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

  // Safe initialization check with fallback
  static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch (error) {
        console.warn('TokenManager initialization failed, continuing without stored data:', error);
      }
    }
  }

  // Debug method to get current state
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

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add dynamic token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Ensure TokenManager is initialized
      await TokenManager.ensureInitialized();
      
      const token = TokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to initialize TokenManager in request interceptor:', error);
      // Continue with request even if token initialization fails
    }
    
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized - token might be expired
    if (error.response?.status === 401) {
      console.log('Token expired or invalid, clearing token...');
      try {
        await TokenManager.removeFromStorage();
      } catch (clearError) {
        console.error('Failed to clear expired token:', clearError);
      }
    }
    
    console.error('Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

// Login function
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
    console.error('Login failed:', error);
    throw error;
  }
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    // Optional: Call logout endpoint if your API has one
    try {
      await apiClient.post('/logout');
    } catch (apiError) {
      console.warn('Logout API call failed:', apiError);
    }
  } finally {
    // Always clear token on logout
    try {
      await TokenManager.removeFromStorage();
    } catch (clearError) {
      console.error('Failed to clear data on logout:', clearError);
    }
  }
};

// Safe initialization when module loads
const initializeTokenManager = async () => {
  try {
    await TokenManager.initialize();
  } catch (error) {
    console.warn('Initial TokenManager initialization failed, will retry on first use:', error);
  }
};

// Initialize without blocking module loading
initializeTokenManager();

// Export token manager for manual token management if needed
export { TokenManager };
export default apiClient;