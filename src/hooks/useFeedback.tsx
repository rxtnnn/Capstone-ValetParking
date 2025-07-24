import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';
import { FeedbackData, FeedbackFormData } from '../types/feedback';
import { getBasicDeviceInfo } from '../utils/deviceInfo';

interface UseFeedbackReturn {
  feedback: FeedbackData[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  submitFeedback: (data: FeedbackFormData) => Promise<string | null>;
  refreshFeedback: () => Promise<void>;
  clearError: () => void;
  testConnection: () => Promise<boolean>;
}

export const useFeedback = (): UseFeedbackReturn => {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(async (data: FeedbackFormData): Promise<string | null> => {
    setSubmitting(true);
    setError(null);

    try {
      const deviceInfo = await getBasicDeviceInfo();

      const feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at'> = {
        user_id: 2, // John Doe from seeder
        type: data.type,
        message: data.message,
        rating: data.type === 'general' ? data.rating : undefined,
        email: data.email,
        issues: data.issues,
        device_info: deviceInfo,
      };

      const feedbackId = await ApiService.submitFeedback(feedbackData);
      await refreshFeedback();
      return feedbackId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed';
      setError(errorMessage);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const refreshFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const feedbackList = await ApiService.getAllFeedback(20);
      setFeedback(feedbackList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feedback';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await ApiService.testConnection();
      if (!isConnected) {
        setError('Failed to connect to server');
      }
      return isConnected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setError(errorMessage);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const connected = await testConnection();
      if (connected) {
        await refreshFeedback();
      }
    };
    initialize();
  }, [testConnection, refreshFeedback]);

  return {
    feedback,
    loading,
    submitting,
    error,
    submitFeedback,
    refreshFeedback,
    clearError,
    testConnection,
  };
};