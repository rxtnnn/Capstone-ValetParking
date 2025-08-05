import { useState, useEffect, useCallback, useRef } from 'react';
import ApiService from '../services/ApiService';
import { TokenManager } from '../config/api';
import { FeedbackData, FeedbackFormData } from '../types/feedback';
import { getBasicDeviceInfo } from '../utils/deviceInfo';
import { NotificationManager } from '../services/NotifManager';

interface UseFeedbackReturn {
  feedback: FeedbackData[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  currentUserId: number | null;
  feedbackStats: {
    total: number;
    withReplies: number;
    pending: number;
    recent: number;
  };
  submitFeedback: (data: FeedbackFormData) => Promise<string | null>;
  refreshFeedback: () => Promise<void>;
  checkForNewReplies: () => Promise<void>;
  getFbById: (feedbackId: number) => Promise<FeedbackData | null>;
  clearError: () => void;
  testConnection: () => Promise<boolean>;
}

const DEFAULT_STATS = {
  total: 0,
  withReplies: 0,
  pending: 0,
  recent: 0
};

const PERIODIC_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

export const useFeedback = (userId?: number): UseFeedbackReturn => {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [feedbackStats, setFeedbackStats] = useState(DEFAULT_STATS);
  
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentUser = useCallback(() => {
    try {
      const user = TokenManager.getUser();
      const id = user?.id || null;
      
      if (isMountedRef.current && currentUserId !== id) {
        setCurrentUserId(id);
      }
      
      return id;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }, [currentUserId]);

  // Clear error helper
  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await ApiService.testConnection();
      if (!isConnected && isMountedRef.current) {
        setError('Failed to connect to server');
      }
      return isConnected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      return false;
    }
  }, []);

  const refreshFeedback = useCallback(async () => {
    const targetUserId = userId || getCurrentUser();
    
    if (!targetUserId || !isMountedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const [feedbackList, stats] = await Promise.all([
        ApiService.getUserFeedback(targetUserId, 100),
        ApiService.getUserFeedbackStats(targetUserId)
      ]);
      
      if (isMountedRef.current) {
        setFeedback(feedbackList);
        setFeedbackStats(stats);
      }
      await NotificationManager.processFeedbackReplies(feedbackList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feedback';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, getCurrentUser]);

  // check new replies
  const checkForNewReplies = useCallback(async () => {
    const targetUserId = userId || getCurrentUser();
    
    if (!targetUserId) {
      return;
    }

    try {
      const feedbackWithReplies = await ApiService.getUserFeedbackWithReplies(targetUserId);
      
      if (feedbackWithReplies.length > 0) {
        await NotificationManager.processFeedbackReplies(feedbackWithReplies);
      }
      
    } catch (err) {
      console.error('Error checking for new replies:', err);
    }
  }, [userId, getCurrentUser]);

  const submitFeedback = useCallback(async (data: FeedbackFormData): Promise<string | null> => {
    setSubmitting(true);
    setError(null);
    
    try {
      const activeUserId = getCurrentUser();
      if (!activeUserId) {
        throw new Error('User not authenticated. Please log in again.');
      }
      const deviceInfo = await getBasicDeviceInfo();
      
      const feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at' | 'user_id'> = {
        type: data.type,
        message: data.message,
        rating: data.type === 'general' ? data.rating : undefined,
        email: data.email,
        issues: data.issues,
        device_info: deviceInfo,
      };

      const feedbackId = await ApiService.submitFeedback(feedbackData);
      
      if (feedbackId && isMountedRef.current) {
        await refreshFeedback(); //refresh after submitting
        return feedbackId;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [getCurrentUser, refreshFeedback]);

  const getFbById = useCallback(async (feedbackId: number): Promise<FeedbackData | null> => {
    const targetUserId = userId || getCurrentUser();
    
    if (!targetUserId) {
      return null;
    }

    try {
      const feedback = await ApiService.getFeedbackById(feedbackId, targetUserId);
      return feedback;
    } catch (err) {
      return null;
    }
  }, [userId, getCurrentUser]);

  // Initialize feedback data
  const initializeFeedback = useCallback(async () => {
    const targetUserId = getCurrentUser();
    
    if (!targetUserId) {
      return;
    }

    const connected = await testConnection();
    if (connected) {
      await Promise.all([
        refreshFeedback(),
        checkForNewReplies()
      ]);
      
      await NotificationManager.onUserLogin(); // sync with current user
    }
  }, [getCurrentUser, testConnection, refreshFeedback, checkForNewReplies]);

  const setupPeriodicCheck = useCallback(() => {
    const targetUserId = getCurrentUser();
    
    if (!targetUserId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (isMountedRef.current && getCurrentUser()) {
        try {
          await checkForNewReplies();
        } catch (error) {
          console.error('Error in periodic feedback check:', error);
        }
      }
    }, PERIODIC_CHECK_INTERVAL);
  }, [getCurrentUser, checkForNewReplies]);

  useEffect(() => {
    isMountedRef.current = true;
    getCurrentUser(); // Update current user ID
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [getCurrentUser]);

  useEffect(() => {  // re-initialize when user changes
    if (currentUserId) {
      initializeFeedback();
    } else {
      // Clear data when user logs out
      setFeedback([]);
      setFeedbackStats(DEFAULT_STATS);
      setError(null);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [currentUserId, initializeFeedback]);

  // Setup periodic checks when user is available
  useEffect(() => {
    if (currentUserId) {
      setupPeriodicCheck();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentUserId, setupPeriodicCheck]);

  // Listen for token changes (user login/logout)
  useEffect(() => {
    const checkUserChange = () => {
      const newUserId = TokenManager.getUser()?.id || null;
      if (newUserId !== currentUserId) {
        getCurrentUser();
      }
    };

    // Check periodically for user changes
    const userCheckInterval = setInterval(checkUserChange, 1000);
    
    return () => clearInterval(userCheckInterval);
  }, [currentUserId, getCurrentUser]);

  return {
    feedback,
    loading,
    submitting,
    error,
    currentUserId,
    feedbackStats,
    submitFeedback,
    refreshFeedback,
    checkForNewReplies,
    getFbById,
    clearError,
    testConnection,
  };
};