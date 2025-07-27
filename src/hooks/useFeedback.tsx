// src/hooks/useFeedback.ts - Enhanced for multiple feedback replies
import { useState, useEffect, useCallback } from 'react';
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

export const useFeedback = (userId?: number): UseFeedbackReturn => {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [feedbackStats, setFeedbackStats] = useState({
    total: 0,
    withReplies: 0,
    pending: 0,
    recent: 0
  });

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userInfo = await ApiService.getCurrentUserInfo();
        setCurrentUserId(userInfo.id);
        console.log('👤 useFeedback - Current user ID set:', userInfo.id);
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // 🔥 ENHANCED: User-specific feedback submission with notification integration
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

      console.log('📤 Submitting feedback:', {
        type: feedbackData.type,
        messageLength: feedbackData.message.length,
        rating: feedbackData.rating,
        hasEmail: !!feedbackData.email,
        userId: currentUserId
      });

      const feedbackId = await ApiService.submitFeedback(feedbackData);
      
      if (feedbackId) {
        console.log(`✅ Feedback submitted successfully with ID: ${feedbackId}`);
        
        // Refresh user's feedback after successful submission
        await refreshFeedback();
        
        return feedbackId;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed';
      setError(errorMessage);
      console.error('❌ Feedback submission error:', errorMessage);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [currentUserId]);

  // 🔥 ENHANCED: Get user-specific feedback with stats update
  const refreshFeedback = useCallback(async () => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) {
      console.warn('⚠️ No user ID available for refreshFeedback');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Refreshing ALL feedback for user:', targetUserId);
      
      // Get all feedback for the user (including those without replies)
      const [feedbackList, stats] = await Promise.all([
        ApiService.getUserFeedback(targetUserId, 100), // Get more feedbacks
        ApiService.getUserFeedbackStats(targetUserId)
      ]);
      
      setFeedback(feedbackList);
      setFeedbackStats(stats);
      
      console.log(`📊 Loaded ${feedbackList.length} feedback items:`, {
        total: stats.total,
        withReplies: stats.withReplies,
        pending: stats.pending,
        recent: stats.recent
      });
      
      // 🔥 ENHANCED: Process ALL feedback for notifications (not just replied ones)
      // This ensures we catch any new replies since last check
      await NotificationManager.processFeedbackReplies(feedbackList);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feedback';
      setError(errorMessage);
      console.error('❌ Error refreshing feedback:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUserId]);

  // 🔥 ENHANCED: Check for new feedback replies with detailed logging
  const checkForNewReplies = useCallback(async () => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) {
      console.warn('⚠️ No user ID available for checkForNewReplies');
      return;
    }

    try {
      console.log('🔔 Checking for new feedback replies for user:', targetUserId);
      
      // Get feedback items that have replies
      const feedbackWithReplies = await ApiService.getUserFeedbackWithReplies(targetUserId);
      
      if (feedbackWithReplies.length > 0) {
        console.log(`📬 Found ${feedbackWithReplies.length} feedback items with replies:`);
        
        // Log each feedback with reply info
        feedbackWithReplies.forEach((feedback, index) => {
          console.log(`  ${index + 1}. Feedback ID ${feedback.id}: "${feedback.message.substring(0, 30)}..." - Replied at: ${feedback.responded_at}`);
        });
        
        // Process them for notifications - each feedback reply will get its own notification
        await NotificationManager.processFeedbackReplies(feedbackWithReplies);
        
        console.log(`✅ Processed ${feedbackWithReplies.length} feedback items for notifications`);
      } else {
        console.log('📭 No feedback replies found for user');
      }
      
    } catch (err) {
      console.error('❌ Error checking for new replies:', err);
    }
  }, [userId, currentUserId]);

  // 🔥 NEW: Get specific feedback by ID
  const getFeedbackById = useCallback(async (feedbackId: number): Promise<FeedbackData | null> => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) {
      console.warn('⚠️ No user ID available for getFeedbackById');
      return null;
    }

    try {
      console.log(`🔍 Getting feedback by ID ${feedbackId} for user ${targetUserId}`);
      
      const feedback = await ApiService.getFeedbackById(feedbackId, targetUserId);
      
      if (feedback) {
        console.log(`✅ Found feedback ID ${feedbackId}:`, {
          message: feedback.message.substring(0, 50) + '...',
          hasReply: !!feedback.admin_response,
          repliedAt: feedback.responded_at
        });
      } else {
        console.log(`❌ Feedback ID ${feedbackId} not found or doesn't belong to user`);
      }
      
      return feedback;
    } catch (err) {
      console.error(`❌ Error getting feedback by ID ${feedbackId}:`, err);
      return null;
    }
  }, [userId, currentUserId]);

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

  // 🔥 ENHANCED: Initialize with comprehensive feedback loading
  useEffect(() => {
    const initialize = async () => {
      // Only initialize if we have a user ID
      if (!currentUserId && !userId) {
        console.log('⏳ Waiting for user ID before initializing feedback...');
        return;
      }

      const connected = await testConnection();
      if (connected) {
        // Load all feedback and check for new replies
        await refreshFeedback();
        await checkForNewReplies();
        
        console.log('🎉 Feedback system initialized successfully');
      } else {
        console.error('❌ Failed to initialize feedback system - no connection');
      }
    };

    initialize();
  }, [currentUserId, userId, testConnection, refreshFeedback, checkForNewReplies]);

  // 🔥 NEW: Auto-refresh feedback periodically to catch new replies
  useEffect(() => {
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) return;

    // Set up periodic checking for new replies (every 2 minutes)
    const interval = setInterval(async () => {
      try {
        console.log('⏰ Periodic check for new feedback replies...');
        await checkForNewReplies();
      } catch (error) {
        console.error('Error in periodic feedback check:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      clearInterval(interval);
    };
  }, [currentUserId, userId, checkForNewReplies]);

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