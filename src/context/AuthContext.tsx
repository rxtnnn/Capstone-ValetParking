import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
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
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'INIT_COMPLETE' }; // 🔥 NEW: Mark initialization as complete

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
  isInitialized: boolean; // 🔥 NEW: Track if auth has been initialized
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
    case 'INIT_COMPLETE':
      return {
        ...state,
        loading: false,
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
  const initializationRef = useRef(false); // 🔥 NEW: Prevent multiple initializations
  const logoutInProgressRef = useRef(false); // 🔥 NEW: Prevent multiple logout calls

  // 🔥 FIXED: Check for stored authentication on app start with protection against multiple calls
  useEffect(() => {
    const checkStoredAuth = async () => {
      // Prevent multiple initialization calls
      if (initializationRef.current) {
        console.log('⚠️ Auth initialization already in progress, skipping');
        return;
      }

      initializationRef.current = true;

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
      } finally {
        // Mark initialization as complete
        dispatch({ type: 'INIT_COMPLETE' });
      }
    };

    checkStoredAuth();
  }, []); // Empty dependency array to run only once

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

  // 🔥 FIXED: Logout with protection against multiple calls and race conditions
  const logout = async (): Promise<void> => {
    // Prevent multiple logout calls
    if (logoutInProgressRef.current) {
      console.log('⚠️ Logout already in progress, skipping');
      return;
    }

    logoutInProgressRef.current = true;

    try {
      console.log('🚪 Starting logout...');
      
      // First update the state to prevent components from continuing to run
      dispatch({ type: 'LOGOUT' });
      
      // Then clear storage
      await AuthService.logout();
      
      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('💥 Logout error:', error);
      // Even if there's an error, make sure we're logged out
      dispatch({ type: 'LOGOUT' });
    } finally {
      // Reset the logout flag after a short delay
      setTimeout(() => {
        logoutInProgressRef.current = false;
      }, 1000);
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
    isInitialized: !state.loading, // 🔥 NEW: Expose initialization status
  };

  // 🔥 REDUCED LOGGING: Only log when state actually changes
  const prevStateRef = useRef(state);
  if (
    prevStateRef.current.isAuthenticated !== state.isAuthenticated ||
    prevStateRef.current.loading !== state.loading ||
    prevStateRef.current.error !== state.error
  ) {
    console.log('🏪 AuthContext state changed:', {
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.user,
      loading: state.loading,
      error: state.error,
      isInitialized: !state.loading,
    });
    prevStateRef.current = state;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};