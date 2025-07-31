import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  email: string;
  name?: string;
  role?: string;
  role_display?: string;
  employee_id?: string;
  department?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

const API_CONFIG = {
  BASE_URL: 'https://valet.up.railway.app/api/public',
  USERS_URL: 'https://valet.up.railway.app/api/public/users',
  TOKEN: '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad',
  HEADERS: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  STORAGE_KEYS: {
    TOKEN: 'valet_user_auth_token',
    USER: 'valet_user_data'
  }
} as const;

const AUTH_ENDPOINTS = [
  `${API_CONFIG.BASE_URL}/auth/login`,
  `${API_CONFIG.BASE_URL}/login`,
  `${API_CONFIG.BASE_URL}/authenticate`,
  'https://valet.up.railway.app/api/auth/login',
  'https://valet.up.railway.app/api/login',
  'https://valet.up.railway.app/api/public/authenticate',
];

const ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Password is required',
  AUTH_UNAVAILABLE: 'Authentication endpoint not available. Please contact your administrator.',
  INVALID_CREDENTIALS: 'Invalid email or password',
  SERVER_ERROR: 'Server error. Please try again later.',
  ACCESS_DENIED: 'Access denied. Please contact your administrator.',
  API_ACCESS_DENIED: 'API access denied. Please contact administrator.',
  API_TOKEN_INVALID: 'API token invalid. Please contact administrator.',
  API_NOT_FOUND: 'Users API not found. Please contact administrator.',
  USER_NOT_FOUND: 'User not found',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Please contact the administrator.',
  CONNECTION_ERROR: 'Unable to connect to server. Please check your internet connection.',
  DATABASE_ERROR: 'Error connecting to user database.',
  INVALID_RESPONSE: 'Invalid response from server.',
  NO_USERS: 'No users found in the system.'
} as const;

class AuthService {
  private getAuthHeaders() {
    return {
      ...API_CONFIG.HEADERS,
      'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
    };
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Input validation
    const email = credentials.email?.trim();
    if (!email) return { success: false, message: ERROR_MESSAGES.EMAIL_REQUIRED };
    if (!email.includes('@')) return { success: false, message: ERROR_MESSAGES.INVALID_EMAIL };
    if (!credentials.password?.trim()) return { success: false, message: ERROR_MESSAGES.PASSWORD_REQUIRED };

    const result = await this.loginWithServerAuth(credentials);
    if (result.success || result.message !== 'server_auth_unavailable') {
      return result;
    }

    console.error('No authentication endpoint found');
    return { success: false, message: ERROR_MESSAGES.AUTH_UNAVAILABLE };
  }

  private async loginWithServerAuth(credentials: LoginCredentials): Promise<LoginResponse> {
    const requestBody = {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    };

    for (const endpoint of AUTH_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });

        if (response.status === 404) continue;

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            const token = data.token || `server_auth_${data.user.id}_${Date.now()}`;
            await this.storeAuthData(token, data.user);
            return {
              success: true,
              message: data.message || 'Login successful',
              user: data.user,
              token,
            };
          }
          return { success: false, message: data.message || 'Authentication failed' };
        }

        // Handle specific error codes
        if (response.status === 401 || response.status === 422) {
          try {
            const errorData = await response.json();
            return { success: false, message: errorData.message || ERROR_MESSAGES.INVALID_CREDENTIALS };
          } catch {
            return { success: false, message: ERROR_MESSAGES.INVALID_CREDENTIALS };
          }
        }

        if (response.status === 500) {
          return { success: false, message: ERROR_MESSAGES.SERVER_ERROR };
        }

        if (response.status === 403) {
          return { success: false, message: ERROR_MESSAGES.ACCESS_DENIED };
        }
      } catch (error: any) {
        if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          continue;
        }
        continue;
      }
    }

    return { success: false, message: 'server_auth_unavailable' };
  }

  private extractUsersArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data.users && Array.isArray(data.users)) return data.users;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  }

  private handleApiResponse(response: Response) {
    const status = response.status;
    if (status === 401) return { success: false, message: ERROR_MESSAGES.API_ACCESS_DENIED };
    if (status === 403) return { success: false, message: ERROR_MESSAGES.API_TOKEN_INVALID };
    if (status === 404) return { success: false, message: ERROR_MESSAGES.API_NOT_FOUND };
    return { success: false, message: `Server error: ${status}` };
  }

  async findUserInAPI(email: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await fetch(API_CONFIG.USERS_URL, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return this.handleApiResponse(response);

      const data = await response.json();
      const users = this.extractUsersArray(data);

      if (users.length === 0) {
        return { success: false, message: ERROR_MESSAGES.NO_USERS };
      }

      const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) return { success: false, message: ERROR_MESSAGES.USER_NOT_FOUND };
      if (user.is_active === false) return { success: false, message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED };

      return { success: true, user };
    } catch (error: any) {
      console.error('Error finding user:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        return { success: false, message: ERROR_MESSAGES.CONNECTION_ERROR };
      }
      
      return { success: false, message: ERROR_MESSAGES.DATABASE_ERROR };
    }
  }

  async testAPIConnection(): Promise<{ success: boolean; message: string; userCount?: number }> {
    try {
      const response = await fetch(API_CONFIG.USERS_URL, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const users = this.extractUsersArray(data);
        return {
          success: true,
          message: `API connection successful! Found ${users.length} users.`,
          userCount: users.length,
        };
      }

      const errorResponse = this.handleApiResponse(response);
      return {
        success: false,
        message: errorResponse.message,
      };
    } catch (error: any) {
      console.error('API test error:', error);
      return {
        success: false,
        message: 'Cannot connect to API. Check internet connection.',
      };
    }
  }

  async getAvailableUsers(): Promise<{ success: boolean; users: string[]; message: string }> {
    try {
      const response = await fetch(API_CONFIG.USERS_URL, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const users = this.extractUsersArray(data);

        if (users.length > 0) {
          const emails = users.map(u => u.email).filter(Boolean);
          return {
            success: true,
            users: emails,
            message: `Found ${emails.length} users`,
          };
        }
        
        return {
          success: false,
          users: [],
          message: ERROR_MESSAGES.NO_USERS,
        };
      }

      return {
        success: false,
        users: [],
        message: `Cannot fetch users: HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        users: [],
        message: `Error fetching users: ${error.message}`,
      };
    }
  }

  private async storeAuthData(token: string, user: User): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, token),
        AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);
      console.log('User auth data stored successfully');
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  async getStoredAuthData(): Promise<{ token: string | null; user: User | null }> {
    try {
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.USER),
      ]);

      return {
        token,
        user: userData ? JSON.parse(userData) : null
      };
    } catch (error) {
      console.error('Error getting stored auth data:', error);
      return { token: null, user: null };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const { token, user } = await this.getStoredAuthData();
      return !!(token && user);
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER),
      ]);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { user } = await this.getStoredAuthData();
    return user;
  }

  async getUserToken(): Promise<string | null> {
    const { token } = await this.getStoredAuthData();
    return token;
  }

  async validateToken(): Promise<boolean> {
    return this.isAuthenticated();
  }

  getServerInfo() {
    return {
      usersEndpoint: API_CONFIG.USERS_URL,
      authEndpoints: AUTH_ENDPOINTS.slice(0, 3),
      hasToken: !!API_CONFIG.TOKEN,
      recommendation: 'Implement POST /api/public/auth/login endpoint on your server for secure bcrypt authentication',
    };
  }
}

export default new AuthService();