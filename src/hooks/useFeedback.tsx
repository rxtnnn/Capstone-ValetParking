import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';
import { FeedbackData, FeedbackStats, FeedbackFormData } from '../types/feedback';
import { getBasicDeviceInfo } from '../utils/deviceInfo';

interface UseFeedbackReturn {
  // State
  feedback: FeedbackData[];
  stats: FeedbackStats | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  
  // Actions
  submitFeedback: (data: FeedbackFormData) => Promise<string | null>;
  refreshFeedback: () => Promise<void>;
  refreshStats: () => Promise<void>;
  clearError: () => void;
  testConnection: () => Promise<boolean>;
}

export const useFeedback = (): UseFeedbackReturn => {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit feedback function
  const submitFeedback = useCallback(async (data: FeedbackFormData): Promise<string | null> => {
    setSubmitting(true);
    setError(null);

    try {
      const deviceInfo = await getBasicDeviceInfo();

      const feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at'> = {
        ...data,
        message: data.message,
        deviceInfo: {
          platform: deviceInfo.platform,
          version: deviceInfo.version,
          model: deviceInfo.model,
          systemVersion: deviceInfo.systemVersion,
          appVersion: deviceInfo.appVersion,
          buildNumber: deviceInfo.buildNumber,
        },
      };

      const feedbackId = await ApiService.submitFeedback(feedbackData);
      
      // Refresh feedback list after submission
      await refreshFeedback();
      await refreshStats();
      
      return feedbackId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Refresh feedback list
  const refreshFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { feedback: feedbackList } = await ApiService.getAllFeedback(20);
      setFeedback(feedbackList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feedback';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const statsData = await ApiService.getFeedbackStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }, []);

  // Test API connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await ApiService.testConnection();
      if (!isConnected) {
        setError('Failed to connect to the API server');
      }
      return isConnected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setError(errorMessage);
      return false;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial load
  useEffect(() => {
    const initializeData = async () => {
      // Test connection first
      const isConnected = await testConnection();
      if (isConnected) {
        // Only load data if connection is successful
        await refreshFeedback();
        await refreshStats();
      }
    };

    initializeData();
  }, [testConnection, refreshFeedback, refreshStats]);

  return {
    feedback,
    stats,
    loading,
    submitting,
    error,
    submitFeedback,
    refreshFeedback,
    refreshStats,
    clearError,
    testConnection,
  };
};

// Hook for real-time feedback updates (polling-based for REST API)
export const useFeedbackRealtime = (intervalMs: number = 30000) => {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchFeedback = async () => {
      try {
        const isConnected = await ApiService.testConnection();
        if (!isConnected) {
          setError('Failed to connect to API server');
          setConnected(false);
          return;
        }

        setConnected(true);

        const { feedback: feedbackList } = await ApiService.getAllFeedback(20);
        setFeedback(feedbackList);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback';
        setError(errorMessage);
        setConnected(false);
      }
    };

    // Initial fetch
    fetchFeedback();

    // Set up polling
    intervalId = setInterval(fetchFeedback, intervalMs);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalMs]);

  return {
    feedback,
    error,
    connected,
  };
};

// Hook for feedback statistics
export const useFeedbackStats = () => {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const statsData = await ApiService.getFeedbackStats();
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
};