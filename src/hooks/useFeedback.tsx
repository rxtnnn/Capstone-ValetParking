// src/hooks/useFeedback.ts - Enhanced for multiple feedback replies
import { useState, useEffect, useCallback, useRef } from 'react';
import ApiService from '../services/ApiService';
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
  getFeedbackById: (feedbackId: number) => Promise<FeedbackData | null>;
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

  const getCurrentUser = useCallback(async () => {
    try {
      const userInfo = await ApiService.getCurrentUserInfo();
      if (isMountedRef.current) {
        setCurrentUserId(userInfo.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, []);

  const submitFeedback = useCallback(async (data: FeedbackFormData): Promise<string | null> => {
    setSubmitting(true);
    setError(null);
    
    try {
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
        await refreshFeedback();
        return feedbackId;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      console.error('Feedback submission error:', errorMessage);
      return null;
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [currentUserId]);

  const refreshFeedback = useCallback(async () => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId || !isMountedRef.current) return;

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
      console.error('Error refreshing feedback:', errorMessage);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, currentUserId]);

  const checkForNewReplies = useCallback(async () => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) return;

    try {
      const feedbackWithReplies = await ApiService.getUserFeedbackWithReplies(targetUserId);
      
      if (feedbackWithReplies.length > 0) {
        await NotificationManager.processFeedbackReplies(feedbackWithReplies);
      }
      
    } catch (err) {
      console.error('Error checking for new replies:', err);
    }
  }, [userId, currentUserId]);

  const getFeedbackById = useCallback(async (feedbackId: number): Promise<FeedbackData | null> => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) return null;

    try {
      const feedback = await ApiService.getFeedbackById(feedbackId, targetUserId);
      return feedback;
    } catch (err) {
      console.error(`Error getting feedback by ID ${feedbackId}:`, err);
      return null;
    }
  }, [userId, currentUserId]);

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

  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  const initializeFeedback = useCallback(async () => {
    if (!currentUserId && !userId) return;

    const connected = await testConnection();
    if (connected) {
      await Promise.all([
        refreshFeedback(),
        checkForNewReplies()
      ]);
    }
  }, [currentUserId, userId, testConnection, refreshFeedback, checkForNewReplies]);

  const setupPeriodicCheck = useCallback(() => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (isMountedRef.current) {
        try {
          await checkForNewReplies();
        } catch (error) {
          console.error('Error in periodic feedback check:', error);
        }
      }
    }, PERIODIC_CHECK_INTERVAL);
  }, [currentUserId, userId, checkForNewReplies]);

  useEffect(() => {
    isMountedRef.current = true;
    getCurrentUser();
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [getCurrentUser]);

  useEffect(() => {
    initializeFeedback();
  }, [initializeFeedback]);

  useEffect(() => {
    setupPeriodicCheck();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPeriodicCheck]);

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
    getFeedbackById,
    clearError,
    testConnection,
  };
};