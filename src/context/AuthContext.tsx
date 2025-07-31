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
  | { type: 'INIT_COMPLETE' };

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
  isInitialized: boolean;
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
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      console.error('Login failed:', action.payload);
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
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
  const initializationRef = useRef(false);
  const logoutInProgressRef = useRef(false);

  useEffect(() => {
    const checkStoredAuth = async () => {
      if (initializationRef.current) return;
      
      initializationRef.current = true;

      try {
        const { token, user } = await AuthService.getStoredAuthData();
        
        if (token && user) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token },
          });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'INIT_COMPLETE' });
      }
    };

    checkStoredAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    dispatch({ type: 'LOADING' });

    try {
      const result = await AuthService.login(credentials);

      if (result.success && result.user && result.token) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: result.user,
            token: result.token,
          },
        });
      } else {
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: result.message,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.error('Login error:', errorMessage);
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
    if (logoutInProgressRef.current) return;

    logoutInProgressRef.current = true;

    try {
      dispatch({ type: 'LOGOUT' });
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      dispatch({ type: 'LOGOUT' });
    } finally {
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
    isInitialized: !state.loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};