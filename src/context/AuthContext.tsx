// Update your AuthContext.tsx file to include notification sync

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, logout as apiLogout, TokenManager } from '../config/api';
import { NotificationManager } from '../services/NotifManager';
import NotificationService from '../services/NotificationService';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  employee_id: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  message?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const syncNotificationServices = async (user: User | null) => {
    try {
      if (user) {
        await new Promise(resolve => setTimeout(resolve, 100));
        await NotificationManager.setCurrentUserId(user.id);
        await NotificationManager.onUserLogin();
        await NotificationService.initialize();
        await NotificationService.getNotificationSettings();
      } else {
        await NotificationManager.onUserLogout();
        await NotificationService.clearUserSettings();
      }
    } catch (error) {
      console.log('Error syncing notification services:', error);
    }
  };

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      await TokenManager.initialize();
      const storedUser = TokenManager.getUser();
      const token = TokenManager.getToken();
      
     if (token && storedUser) {
      const role = storedUser.role.toLowerCase();
      if (['admin', 'sdd', 'security'].includes(role)) {
        await TokenManager.removeFromStorage();
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
        setUser(storedUser);
        setIsAuthenticated(true);
        await syncNotificationServices(storedUser);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      setError(null);
      const previousUser = TokenManager.getUser();
      if (previousUser) {
        await NotificationManager.onUserLogout();
      }
      
      const response = await apiLogin(credentials);

        if (response.success && response.user) {
        const role = response.user.role.toLowerCase();
        if (['admin', 'ssd', 'security'].includes(role)) {
          await TokenManager.removeFromStorage();
          const accessDenied = 'Access denied. Only users can login.';
          setError(accessDenied);
          return { success: false, message: accessDenied };
        }
        setUser(response.user);
        setIsAuthenticated(true);
        await syncNotificationServices(response.user);
        
        try {
          await AsyncStorage.setItem('valet_user_data', JSON.stringify(response.user));
        } catch (error) {
          console.log('Error storing user data:', error);
        }
        
        return {
          success: true,
          message: response.message || 'Login successful',
          user: response.user,
        };
      } else {
        const errorMessage = response.message || 'Login failed';
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const currentUser = user;
      
      
      if (currentUser) { // clear notif data for current user
        await NotificationManager.onUserLogout();
        await NotificationService.clearUserSettings();
      }
    
      await apiLogout();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    
      try {
        await AsyncStorage.removeItem('valet_user_data');
      } catch (error) {
        console.log('Error clearing stored user data:', error);
      }
      
    } catch (error) {
      console.log('Error during logout:', error);
      
      setUser(null); // if logout fails, clear local state
      setIsAuthenticated(false);
      setError(null);
      
      await TokenManager.removeFromStorage(); // force clear token and notification data
      await NotificationManager.onUserLogout();
    }
  }, [user]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const checkUserChange = async () => {
      const tokenUser = TokenManager.getUser();
      const currentUserId = user?.id;
      const tokenUserId = tokenUser?.id;
      
      if (tokenUserId !== currentUserId) { //update user if token has changed
        if (tokenUser) {
          setUser(tokenUser);
          setIsAuthenticated(true);
          await syncNotificationServices(tokenUser);
        } else if (currentUserId) {
          setUser(null);
          setIsAuthenticated(false);
          await syncNotificationServices(null);
        }
      }
    };

    const interval = setInterval(checkUserChange, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    clearError,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};