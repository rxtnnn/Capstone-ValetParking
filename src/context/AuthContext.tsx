import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AuthService, { User, LoginCredentials, LoginResponse } from '../services/AuthService';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      console.log('🎉 Login success in reducer');
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      console.log('❌ Login failure in reducer:', action.payload);
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      console.log('🚪 Logout in reducer');
      return {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null,
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored authentication on app start
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        console.log('🔍 Checking stored authentication...');
        const { token, user } = await AuthService.getStoredAuthData();
        
        if (token && user) {
          console.log('✅ Found stored auth, logging in automatically');
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token },
          });
        } else {
          console.log('❌ No stored auth found');
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('💥 Error checking stored auth:', error);
        dispatch({ type: 'LOGOUT' });
      }
    };

    checkStoredAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    console.log('🔄 Starting login process...');
    dispatch({ type: 'LOADING' });

    try {
      const result = await AuthService.login(credentials);
      console.log('📊 Login result:', result);

      if (result.success && result.user && result.token) {
        console.log('✅ Login successful, updating state');
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: result.user,
            token: result.token,
          },
        });
      } else {
        console.log('❌ Login failed:', result.message);
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: result.message,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.error('💥 Login error:', errorMessage);
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Starting logout...');
      await AuthService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('💥 Logout error:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    clearError,
  };

  console.log('🏪 AuthContext state:', {
    isAuthenticated: state.isAuthenticated,
    hasUser: !!state.user,
    loading: state.loading,
    error: state.error
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};