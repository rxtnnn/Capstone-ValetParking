// src/services/AuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  email: string;
  name?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
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

class AuthService {
  private baseUrl = 'https://valet.up.railway.app/api/users';
  
  // Storage keys
  private readonly TOKEN_KEY = 'valet_auth_token';
  private readonly USER_KEY = 'valet_user_data';

  // Login by checking users list (since your admin only provides users API)
  async loginWithUsersList(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('API Response not OK:', response.status, response.statusText);
        
        if (response.status === 404) {
          return {
            success: false,
            message: 'API endpoint not found. Please check the server.',
          };
        } else if (response.status >= 500) {
          return {
            success: false,
            message: 'Server error. Please try again later.',
          };
        } else {
          return {
            success: false,
            message: `Server returned error: ${response.status}`,
          };
        }
      }

      const responseData = await response.json();
      
      const users = responseData.users || responseData;
      
      if (!Array.isArray(users)) {
        console.error('Users data is not an array:', users);
        return {
          success: false,
          message: 'Invalid response format from server.',
        };
      }

      // Find user with matching email
      const user = users.find((u: any) => {
        const userEmail = u.email?.toLowerCase();
        const inputEmail = credentials.email.toLowerCase();
        return userEmail === inputEmail;
      });

      if (user) {
        
        // Check if user is active
        if (user.is_active === false) {
          return {
            success: false,
            message: 'Your account has been deactivated. Please contact the administrator.',
          };
        }
        
        // For demo purposes - generate a token
        const mockToken = `valet_token_${user.id}_${Date.now()}`;
        await this.storeAuthData(mockToken, user);
        
        return {
          success: true,
          message: 'Login successful',
          user,
          token: mockToken,
        };
      } else {
        return {
          success: false,
          message: 'Invalid email or password. Please check your credentials.',
        };
      }
    } catch (error: any) {
      console.error('💥 Login error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout. Please check your internet connection.',
        };
      } else if (error.message.includes('Network request failed')) {
        return {
          success: false,
          message: 'Network error. Please check your internet connection and try again.',
        };
      } else if (error.message.includes('Failed to fetch')) {
        return {
          success: false,
          message: 'Cannot connect to server. Please check your internet connection.',
        };
      } else {
        return {
          success: false,
          message: `Connection error: ${error.message}`,
        };
      }
    }
  }

  // Main login method
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.loginWithUsersList(credentials);
  }

  // Store authentication data
  private async storeAuthData(token: string, user: User): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.TOKEN_KEY, token),
        AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user)),
      ]);
      console.log('Auth data stored successfully');
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  // Get stored authentication data
  async getStoredAuthData(): Promise<{ token: string | null; user: User | null }> {
    try {
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(this.TOKEN_KEY),
        AsyncStorage.getItem(this.USER_KEY),
      ]);

      const user = userData ? JSON.parse(userData) : null;
      console.log('Stored auth data:', { hasToken: !!token, hasUser: !!user });
      
      return { token, user };
    } catch (error) {
      console.error('Error getting stored auth data:', error);
      return { token: null, user: null };
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { token, user } = await this.getStoredAuthData();
      const isAuth = !!(token && user);
      console.log('Is authenticated:', isAuth);
      return isAuth;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.TOKEN_KEY),
        AsyncStorage.removeItem(this.USER_KEY),
      ]);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { user } = await this.getStoredAuthData();
    return user;
  }

  // Validate token
  async validateToken(): Promise<boolean> {
    const { token } = await this.getStoredAuthData();
    return !!token;
  }
}

export default new AuthService();