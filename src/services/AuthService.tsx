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

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

class AuthService {
  private baseUrl = 'https://valet.up.railway.app/api';
  
  // Storage keys
  private readonly TOKEN_KEY = 'valet_auth_token';
  private readonly USER_KEY = 'valet_user_data';

  // Login user
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('Attempting login with:', credentials.email);
      
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store token and user data
        if (data.token) {
          await this.storeAuthData(data.token, data.user);
        }
        
        return {
          success: true,
          message: data.message || 'Login successful',
          user: data.user,
          token: data.token,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  // Alternative: Login by verifying user exists (if no auth endpoint)
  async loginWithUsersList(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('Attempting login by checking users list...');
      
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const users = await response.json();
      
      // Find user with matching email (in real app, password should be verified server-side)
      const user = users.find((u: any) => 
        u.email.toLowerCase() === credentials.email.toLowerCase()
      );

      if (user) {
        // For demo purposes - in production, password verification should be server-side
        const mockToken = `mock_token_${user.id}_${Date.now()}`;
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
          message: 'Invalid email or password',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  // Store authentication data
  private async storeAuthData(token: string, user: User): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.TOKEN_KEY, token),
        AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user)),
      ]);
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
      return !!(token && user);
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { user } = await this.getStoredAuthData();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get auth token
  async getToken(): Promise<string | null> {
    try {
      const { token } = await this.getStoredAuthData();
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
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

  // Validate token (check if still valid)
  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      // You can implement token validation here if your API supports it
      // For now, we'll just check if token exists
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  // Get all users (for admin or testing purposes)
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const users = await response.json();
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Update user profile
  async updateProfile(userId: number, userData: Partial<User>): Promise<LoginResponse> {
    try {
      const token = await this.getToken();
      
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update stored user data
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.user || userData));
        
        return {
          success: true,
          message: 'Profile updated successfully',
          user: data.user || userData,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to update profile',
        };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }
}

export default new AuthService();