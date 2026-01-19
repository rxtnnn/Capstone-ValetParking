import { TokenManager } from '../config/api';
import apiClient from '../config/api';
import { API_ENDPOINTS } from '../constants/AppConst';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  employee_id: string;
  role_display?: string;
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
  BASE_URL: API_ENDPOINTS.baseUrl,
  USERS_URL: API_ENDPOINTS.userUrl,
} as const;

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
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Input validation
    const email = credentials.email?.trim();
    if (!email) return { success: false, message: ERROR_MESSAGES.EMAIL_REQUIRED };
    if (!email.includes('@')) return { success: false, message: ERROR_MESSAGES.INVALID_EMAIL };
    if (!credentials.password?.trim()) return { success: false, message: ERROR_MESSAGES.PASSWORD_REQUIRED };

    try {
      const requestBody = {
        email: email.toLowerCase(),
        password: credentials.password,
      };

      // Use the main login endpoint
      const response = await fetch(`${API_CONFIG.BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.user && data.token) {
          // Store using TokenManager (await the async operation)
          await TokenManager.saveToStorage(data.token, data.user);
          
          return {
            success: true,
            message: data.message || 'Login successful',
            user: data.user,
            token: data.token,
          };
        }
        
        return { 
          success: false, 
          message: data.message || ERROR_MESSAGES.INVALID_CREDENTIALS 
        };
      }

      // Handle specific error codes
      if (response.status === 401 || response.status === 422) {
        try {
          const errorData = await response.json();
          return { 
            success: false, 
            message: errorData.message || ERROR_MESSAGES.INVALID_CREDENTIALS 
          };
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

      return { success: false, message: ERROR_MESSAGES.SERVER_ERROR };

    } catch (error: any) {
      console.log('Login error:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        return { success: false, message: ERROR_MESSAGES.CONNECTION_ERROR };
      }
      
      return { success: false, message: ERROR_MESSAGES.SERVER_ERROR };
    }
  }

  private extractUsersArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data.users && Array.isArray(data.users)) return data.users;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  }


  async findUserInAPI(email: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // Use apiClient which automatically includes the dynamic token
      const response = await apiClient.get('/users');
      
      const users = this.extractUsersArray(response.data);

      if (users.length === 0) {
        return { success: false, message: ERROR_MESSAGES.NO_USERS };
      }

      const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) return { success: false, message: ERROR_MESSAGES.USER_NOT_FOUND };
      if (user.is_active === false) return { success: false, message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED };

      return { success: true, user };
    } catch (error: any) {
      console.log('Error finding user:', error);
      
      if (error.response?.status === 401) {
        return { success: false, message: ERROR_MESSAGES.API_ACCESS_DENIED };
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        return { success: false, message: ERROR_MESSAGES.CONNECTION_ERROR };
      }
      
      return { success: false, message: ERROR_MESSAGES.DATABASE_ERROR };
    }
  }

  async getAvailableUsers(): Promise<{ success: boolean; users: string[]; message: string }> {
    try {
      const response = await apiClient.get('/users');
      const users = this.extractUsersArray(response.data);

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
    } catch (error: any) {
      console.log('Error fetching users:', error);
      
      return {
        success: false,
        users: [],
        message: `Error fetching users: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  async getStoredAuthData(): Promise<{ token: string | null; user: User | null }> {
    try {
      const { token, user } = await TokenManager.loadFromStorage();
      return { token, user };
    } catch (error) {
      console.log('Error getting stored auth data:', error);
      return { token: null, user: null };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = TokenManager.getToken();
      const user = TokenManager.getUser();
      return !!(token && user);
    } catch (error) {
      console.log('Error checking authentication:', error);
      return false;
    }
  }

  isAuthenticatedSync(): boolean {
    try {
      const token = TokenManager.getToken();
      const user = TokenManager.getUser();
      return !!(token && user);
    } catch (error) {
      console.log('Error checking authentication:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      try {
        await apiClient.post('/logout');
      } catch (error) {
        console.warn('Logout endpoint call failed:', error);
      }
      await TokenManager.removeFromStorage();
    } catch (error) {
      console.log('Error during logout:', error);
    }
  }

  getCurrentUser(): User | null {
    return TokenManager.getUser();
  }

  getCurrentUserAsync(): Promise<User | null> {
    return Promise.resolve(TokenManager.getUser());
  }

  async validateToken(): Promise<boolean> {
    try {
      await apiClient.get('/user'); 
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        TokenManager.clearToken(); // clear if invalid token
        return false;
      }
      
      // Other errors don't necessarily mean invalid token
      console.warn('Token validation error:', error);
      return true; // Assume token is still valid
    }
  }

  getServerInfo() {
    return {
      loginEndpoint: `${API_CONFIG.BASE_URL}/login`,
      usersEndpoint: `${API_CONFIG.BASE_URL}/users`,
      hasToken: !!TokenManager.getToken(),
      currentUser: TokenManager.getUser(),
      recommendation: 'Using dynamic token authentication with proper token management',
    };
  }

  // Additional utility methods
  getUserRole(): string | null {
    const user = TokenManager.getUser();
    return user?.role || null;
  }

  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  // Get current user info with all fields
  getCurrentUserInfo(): { 
    id: number | null; 
    name?: string; 
    email?: string; 
    role?: string; 
    employee_id?: string;
    department?: string;
    is_active?: boolean;
  } {
    const user = TokenManager.getUser();
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
      };
    }
    return { id: null };
  }

  // Check if the current user has admin privileges
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  // Check if the current user is a manager
  isManager(): boolean {
    return this.hasAnyRole(['admin', 'manager']);
  }

  // Get user display name
  getUserDisplayName(): string {
    const user = TokenManager.getUser();
    return user?.name || user?.email || 'Unknown User';
  }
}

export default new AuthService();