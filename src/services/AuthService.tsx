// src/services/AuthService.ts - Production Authentication with bcrypt
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
  // 🔥 PRODUCTION: Use proper endpoints
  private baseUrl = 'https://valet.up.railway.app/api/public';
  private usersUrl = 'https://valet.up.railway.app/api/public/users';
  
  // API Token provided by your admin
  private readonly API_TOKEN = '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad';
  
  // Storage keys for user authentication
  private readonly USER_TOKEN_KEY = 'valet_user_auth_token';
  private readonly USER_KEY = 'valet_user_data';

  // 🔥 MAIN LOGIN METHOD - Production Ready
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

    // 🔥 STEP 1: Try server-side authentication endpoints (REQUIRED for bcrypt)
    const serverAuthResult = await this.loginWithServerAuth(credentials);
    if (serverAuthResult.success || serverAuthResult.message !== 'server_auth_unavailable') {
      return serverAuthResult;
    }

    // 🔥 STEP 2: If no server auth, return error (bcrypt cannot be validated on client)
    console.error('❌ No authentication endpoint found - bcrypt requires server-side validation');
    
    return {
      success: false,
      message: 'Authentication endpoint not available. Please contact your administrator to implement POST /api/public/auth/login for secure password validation.',
    };
  }

  // 🔥 SERVER-SIDE AUTHENTICATION (Required for bcrypt)
  private async loginWithServerAuth(credentials: LoginCredentials): Promise<LoginResponse> {
    // Try multiple possible authentication endpoints
    const authEndpoints = [
      `${this.baseUrl}/auth/login`,
      `${this.baseUrl}/login`, 
      `${this.baseUrl}/authenticate`,
      'https://valet.up.railway.app/api/auth/login',
      'https://valet.up.railway.app/api/login',
      'https://valet.up.railway.app/api/public/authenticate',
    ];

    for (const endpoint of authEndpoints) {
      try {
        console.log(`🔐 Trying server auth endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_TOKEN}`,
          },
          body: JSON.stringify({
            email: credentials.email.trim().toLowerCase(),
            password: credentials.password,
          }),
        });

        console.log(`📡 ${endpoint} response status:`, response.status);

        // If 404, try next endpoint
        if (response.status === 404) {
          console.log(`⚠️ ${endpoint} not found, trying next...`);
          continue;
        }

        // If successful response
        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ Server authentication successful');
          
          if (responseData.success && responseData.user) {
            const token = responseData.token || `server_auth_${responseData.user.id}_${Date.now()}`;
            await this.storeAuthData(token, responseData.user);
            
            return {
              success: true,
              message: responseData.message || 'Login successful',
              user: responseData.user,
              token: token,
            };
          } else {
            return {
              success: false,
              message: responseData.message || 'Authentication failed',
            };
          }
        }

        // Handle authentication errors (401, 422, etc.)
        if (response.status === 401 || response.status === 422) {
          try {
            const errorData = await response.json();
            return {
              success: false,
              message: errorData.message || 'Invalid email or password',
            };
          } catch {
            return {
              success: false,
              message: 'Invalid email or password',
            };
          }
        }

        // Handle other errors (500, 403, etc.)
        if (response.status === 500) {
          return {
            success: false,
            message: 'Server error. Please try again later.',
          };
        }

        if (response.status === 403) {
          return {
            success: false,
            message: 'Access denied. Please contact your administrator.',
          };
        }

        // Other status codes - continue to next endpoint
        console.log(`⚠️ ${endpoint} returned ${response.status}, trying next...`);
        
      } catch (error: any) {
        console.log(`⚠️ Network error with ${endpoint}:`, error.message);
        
        // If it's a network error, continue to next endpoint
        if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          continue;
        }
        
        // Other errors - continue
        continue;
      }
    }

    // No server auth endpoints worked
    console.log('❌ No server authentication endpoints available');
    return {
      success: false,
      message: 'server_auth_unavailable',
    };
  }

  // 🔥 FIND USER IN API (for debugging/user verification only)
  async findUserInAPI(email: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      console.log(`🔍 Looking up user: ${email}`);
      
      const response = await fetch(this.usersUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
        },
      });

      console.log(`📡 Users API response status:`, response.status);

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
        } else if (response.status === 404) {
          return {
            success: false,
            message: 'Users API not found. Please contact administrator.',
          };
        }
        
        return {
          success: false,
          message: `Server error: ${response.status}`,
        };
      }

      const responseData = await response.json();
      console.log('📊 Users API response received');
      
      // Handle different response formats
      let users: any[] = [];
      if (Array.isArray(responseData)) {
        users = responseData;
      } else if (responseData.users && Array.isArray(responseData.users)) {
        users = responseData.users;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        users = responseData.data;
      } else {
        console.error('❌ Cannot find users array in response');
        return {
          success: false,
          message: 'Invalid response from server.',
        };
      }

      console.log('👥 Found', users.length, 'users in system');

      if (users.length === 0) {
        return {
          success: false,
          message: 'No users found in the system.',
        };
      }

      // Find user by email
      const user = users.find((u: any) => 
        u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        console.log('❌ User not found:', email);
        return {
          success: false,
          message: 'User not found',
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
      return {
        success: true,
        user: user,
      };

    } catch (error: any) {
      console.error('💥 Error finding user:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        return {
          success: false,
          message: 'Unable to connect to server. Please check your internet connection.',
        };
      }
      
      return {
        success: false,
        message: 'Error connecting to user database.',
      };
    }
  }

  // 🔥 TEST API CONNECTION
  async testAPIConnection(): Promise<{ success: boolean; message: string; userCount?: number }> {
    try {
      console.log('🧪 Testing API connection...');
      
      const response = await fetch(this.usersUrl, {
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
        
        // Handle different response formats
        let users: any[] = [];
        if (Array.isArray(data)) {
          users = data;
        } else if (data.users && Array.isArray(data.users)) {
          users = data.users;
        } else if (data.data && Array.isArray(data.data)) {
          users = data.data;
        }
        
        const userCount = users.length;
        
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
      } else if (response.status === 404) {
        return {
          success: false,
          message: 'Users API endpoint not found. Contact administrator.',
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

  // 🔥 GET AVAILABLE USERS (for UI display only)
  async getAvailableUsers(): Promise<{ success: boolean; users: string[]; message: string }> {
    try {
      const response = await fetch(this.usersUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        let users: any[] = [];
        if (Array.isArray(data)) {
          users = data;
        } else if (data.users && Array.isArray(data.users)) {
          users = data.users;
        } else if (data.data && Array.isArray(data.data)) {
          users = data.data;
        }

        if (users.length > 0) {
          const emails = users.map(u => u.email).filter(Boolean);
          
          return {
            success: true,
            users: emails,
            message: `Found ${emails.length} users`,
          };
        } else {
          return {
            success: false,
            users: [],
            message: 'No users found in the system',
          };
        }
      } else {
        return {
          success: false,
          users: [],
          message: `Cannot fetch users: HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        users: [],
        message: `Error fetching users: ${error.message}`,
      };
    }
  }

  // 🔥 STORAGE METHODS
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

  async isAuthenticated(): Promise<boolean> {
    try {
      const { token, user } = await this.getStoredAuthData();
      return !!(token && user);
    } catch (error) {
      console.error('🔐 Error checking authentication:', error);
      return false;
    }
  }

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

  async getCurrentUser(): Promise<User | null> {
    const { user } = await this.getStoredAuthData();
    return user;
  }

  async getUserToken(): Promise<string | null> {
    const { token } = await this.getStoredAuthData();
    return token;
  }

  async validateToken(): Promise<boolean> {
    const { token, user } = await this.getStoredAuthData();
    return !!(token && user);
  }

  // 🔥 GET SERVER INFO FOR DEBUGGING
  getServerInfo(): { 
    usersEndpoint: string; 
    authEndpoints: string[]; 
    hasToken: boolean;
    recommendation: string;
  } {
    return {
      usersEndpoint: this.usersUrl,
      authEndpoints: [
        `${this.baseUrl}/auth/login`,
        `${this.baseUrl}/login`,
        `${this.baseUrl}/authenticate`,
      ],
      hasToken: !!this.API_TOKEN,
      recommendation: 'Implement POST /api/public/auth/login endpoint on your server for secure bcrypt authentication',
    };
  }
}

export default new AuthService();