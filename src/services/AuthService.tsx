// src/services/AuthService.ts - Updated for API Token Authentication
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

class AuthService {
  private baseUrl = 'https://valet.up.railway.app/api';
  
  // API Token provided by your admin
  private readonly API_TOKEN = '8|HncMi9QI3CvmrT68pANh64bqBBj47Vw8DPWozeGe61cea8b0';
  
  // Storage keys for user authentication
  private readonly USER_TOKEN_KEY = 'valet_user_auth_token';
  private readonly USER_KEY = 'valet_user_data';

  // Try to authenticate with the proper login endpoint first
  async loginWithAuthEndpoint(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔐 Attempting login with auth endpoint');
      
      // Try the correct auth endpoint URL
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`, // Use API token for access
        },
        body: JSON.stringify({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        }),
      });

      console.log('📡 Auth endpoint response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        
        if (responseData.success && responseData.user && responseData.token) {
          await this.storeAuthData(responseData.token, responseData.user);
          
          return {
            success: true,
            message: responseData.message || 'Login successful',
            user: responseData.user,
            token: responseData.token,
          };
        }
      }

      // Check if it's a 404 (endpoint doesn't exist)
      if (response.status === 404) {
        console.log('⚠️ Auth endpoint not found, will use fallback');
        return {
          success: false,
          message: 'auth_endpoint_unavailable', // Special flag for fallback
        };
      }

      // If we get here, the auth endpoint exists but login failed
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      return {
        success: false,
        message: errorData.message || 'Invalid email or password',
      };

    } catch (error: any) {
      console.log('⚠️ Auth endpoint error:', error.message);
      
      // If it's a network error or 404, treat as endpoint unavailable
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('⚠️ Auth endpoint does not exist, using fallback');
        return {
          success: false,
          message: 'auth_endpoint_unavailable', // Special flag for fallback
        };
      }
      
      return {
        success: false,
        message: 'auth_endpoint_unavailable', // Special flag for fallback
      };
    }
  }

  // Fallback: Check user existence and validate (temporary solution)
  async loginWithUserCheck(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔄 Using user check authentication for:', credentials.email);
      
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`, // Use API token for access
        },
      });

      console.log('📡 Users API response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            message: 'API access denied. Please contact administrator.',
          };
        } else if (response.status === 403) {
          return {
            success: false,
            message: 'API token invalid. Please contact administrator.',
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('📊 Users API response structure:', Object.keys(responseData));
      
      // Extract users array
      const users = responseData.users || responseData;
      
      if (!Array.isArray(users)) {
        console.error('❌ Users data is not an array:', users);
        return {
          success: false,
          message: 'Invalid response from server.',
        };
      }

      console.log('👥 Found', users.length, 'users in system');

      // Find user by email
      const user = users.find((u: any) => 
        u.email?.toLowerCase() === credentials.email.toLowerCase()
      );

      if (!user) {
        console.log('❌ User not found:', credentials.email);
        console.log('📋 Available emails:', users.map(u => u.email));
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Check if user is active
      if (user.is_active === false) {
        return {
          success: false,
          message: 'Your account has been deactivated. Please contact the administrator.',
        };
      }

      console.log('✅ User found and active:', user.email);

      // For fallback mode, we'll accept any password that's not empty
      // In production, ask your admin to implement proper password validation
      if (!credentials.password.trim()) {
        return {
          success: false,
          message: 'Password is required',
        };
      }

      // Generate a session token for this login
      const sessionToken = `session_${user.id}_${Date.now()}`;
      await this.storeAuthData(sessionToken, user);
      
      console.log('⚠️ Login successful with fallback method (ask admin to implement POST /api/auth/login)');
      
      return {
        success: true,
        message: 'Login successful',
        user,
        token: sessionToken,
      };

    } catch (error: any) {
      console.error('💥 User check login error:', error);
      
      if (error.message.includes('Failed to fetch')) {
        return {
          success: false,
          message: 'Unable to connect to server. Please check your internet connection.',
        };
      }
      
      return {
        success: false,
        message: 'Authentication error. Please try again.',
      };
    }
  }

  // Main login method
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Validate input
    if (!credentials.email?.trim()) {
      return {
        success: false,
        message: 'Email is required',
      };
    }

    if (!credentials.email.includes('@')) {
      return {
        success: false,
        message: 'Please enter a valid email address',
      };
    }

    if (!credentials.password?.trim()) {
      return {
        success: false,
        message: 'Password is required',
      };
    }

    console.log('🚀 Starting login process for:', credentials.email);

    // Try proper authentication endpoint first
    const authResult = await this.loginWithAuthEndpoint(credentials);
    
    if (authResult.success) {
      console.log('✅ Authentication successful via auth endpoint');
      return authResult;
    }

    // If auth endpoint is not available, fall back to user check
    if (authResult.message === 'auth_endpoint_unavailable') {
      console.log('🔄 Auth endpoint not available, using fallback method');
      console.log('📧 Admin needs to implement: POST /api/auth/login');
      
      const fallbackResult = await this.loginWithUserCheck(credentials);
      
      if (fallbackResult.success) {
        // Add a note that this is temporary
        fallbackResult.message = 'Login successful (temporary authentication mode)';
      }
      
      return fallbackResult;
    }

    // Auth endpoint exists but login failed
    return authResult;
  }

  // Test API connectivity with the token
  async testAPIConnection(): Promise<{ success: boolean; message: string; userCount?: number }> {
    try {
      console.log('🧪 Testing API connection with token...');
      
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
        },
      });

      console.log('📡 Test response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const users = data.users || data;
        const userCount = Array.isArray(users) ? users.length : 0;
        
        return {
          success: true,
          message: `API connection successful! Found ${userCount} users.`,
          userCount,
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'API token is invalid or expired. Contact administrator.',
        };
      } else if (response.status === 403) {
        return {
          success: false,
          message: 'API token does not have permission to access users.',
        };
      } else {
        return {
          success: false,
          message: `Server error: ${response.status}`,
        };
      }
    } catch (error: any) {
      console.error('💥 API test error:', error);
      return {
        success: false,
        message: 'Cannot connect to API. Check internet connection.',
      };
    }
  }

  // Store user authentication data
  private async storeAuthData(token: string, user: User): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.USER_TOKEN_KEY, token),
        AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user)),
      ]);
      console.log('💾 User auth data stored successfully');
    } catch (error) {
      console.error('💾 Error storing auth data:', error);
    }
  }

  // Get stored user authentication data
  async getStoredAuthData(): Promise<{ token: string | null; user: User | null }> {
    try {
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(this.USER_TOKEN_KEY),
        AsyncStorage.getItem(this.USER_KEY),
      ]);

      const user = userData ? JSON.parse(userData) : null;
      return { token, user };
    } catch (error) {
      console.error('📱 Error getting stored auth data:', error);
      return { token: null, user: null };
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { token, user } = await this.getStoredAuthData();
      return !!(token && user);
    } catch (error) {
      console.error('🔐 Error checking authentication:', error);
      return false;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.USER_TOKEN_KEY),
        AsyncStorage.removeItem(this.USER_KEY),
      ]);
      console.log('🚪 User logged out successfully');
    } catch (error) {
      console.error('🚪 Error during logout:', error);
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { user } = await this.getStoredAuthData();
    return user;
  }

  // Get current user token
  async getUserToken(): Promise<string | null> {
    const { token } = await this.getStoredAuthData();
    return token;
  }

  // Validate token (basic check)
  async validateToken(): Promise<boolean> {
    const { token, user } = await this.getStoredAuthData();
    return !!(token && user);
  }
}

export default new AuthService();