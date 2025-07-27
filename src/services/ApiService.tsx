// src/services/ApiService.ts - Enhanced for multiple feedbacks per user
import axios from 'axios';
import apiClient from '../config/api';
import { FeedbackData, APIResponse } from '../types/feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  // Get current user ID from storage
  private async getCurrentUserId(): Promise<number | null> {
    try {
      const userData = await AsyncStorage.getItem('valet_user_data');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  // Submit feedback with dynamic user ID
  async submitFeedback(feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at' | 'user_id'>): Promise<string> {
    try {
      const currentUserId = await this.getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error('User not authenticated. Please log in again.');
      }

      console.log('🎯 Submitting feedback to /api/feedbacks for user:', currentUserId);
      
      // Prepare data with dynamic user ID
      const requestData = {
        user_id: currentUserId,
        type: feedbackData.type,
        message: feedbackData.message,
        rating: feedbackData.type === 'general' ? feedbackData.rating : undefined,
        email: feedbackData.email || undefined,
        issues: feedbackData.issues && feedbackData.issues.length > 0 ? feedbackData.issues : undefined,
        device_info: feedbackData.device_info || undefined,
      };

      // Remove undefined values to clean the request
      const cleanedData = Object.fromEntries(
        Object.entries(requestData).filter(([_, value]) => value !== undefined)
      );

      console.log('📤 Final request data:', cleanedData);

      const response = await apiClient.post<APIResponse<FeedbackData>>('/feedbacks', cleanedData);
      
      if (response.data.success && response.data.data?.id) {
        console.log('🎉 Success! Feedback ID:', response.data.data.id);
        return response.data.data.id.toString();
      } else {
        throw new Error(response.data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please contact support.');
        }
        
        if (error.response?.status === 422) {
          const errors = error.response.data?.errors;
          if (errors) {
            const errorList = Object.entries(errors)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
            throw new Error(`Validation errors: ${errorList}`);
          }
        }
        
        if (error.response?.status === 404) {
          throw new Error('Feedback service not found. Please contact support.');
        }
        
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }
      }
      
      throw new Error('Failed to submit feedback. Please check your connection and try again.');
    }
  }

  // 🔥 ENHANCED: Get all feedbacks for specific user (including those without replies)
  async getUserFeedback(userId?: number, perPage: number = 50): Promise<FeedbackData[]> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      
      if (!targetUserId) {
        console.warn('No user ID provided for getUserFeedback');
        return [];
      }

      console.log('🔍 Getting ALL feedback for user:', targetUserId);

      const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedbacks', {
        params: { 
          user_id: targetUserId,
          per_page: perPage,
          include_replies: true, // 🔥 NEW: Ensure we get reply data
          sort: 'created_at', // 🔥 NEW: Sort by creation date
          order: 'desc' // 🔥 NEW: Most recent first
        }
      });
      
      const feedbackList = response.data.data || [];
      
      // Filter to ensure we only get feedback for this user
      const userSpecificFeedback = feedbackList.filter(
        feedback => feedback.user_id === targetUserId
      );

      console.log(`📊 Found ${userSpecificFeedback.length} total feedback items for user ${targetUserId}`);
      
      // 🔥 NEW: Log feedback with replies for debugging
      const feedbackWithReplies = userSpecificFeedback.filter(f => f.admin_response && f.admin_response.trim().length > 0);
      console.log(`💬 ${feedbackWithReplies.length} feedbacks have admin replies`);
      
      return userSpecificFeedback;
    } catch (error) {
      console.error('❌ Error getting user feedback:', error);
      throw new Error('Failed to load feedback');
    }
  }

  // 🔥 ENHANCED: Get feedbacks with replies (includes feedback ID and reply details)
  async getUserFeedbackWithReplies(userId?: number): Promise<FeedbackData[]> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      
      if (!targetUserId) {
        return [];
      }

      console.log('💬 Getting feedback WITH REPLIES for user:', targetUserId);

      const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedbacks', {
        params: { 
          user_id: targetUserId,
          has_replies: true,
          include_reply_details: true, // 🔥 NEW: Get full reply details
          per_page: 100,
          sort: 'responded_at', // 🔥 NEW: Sort by reply date
          order: 'desc'
        }
      });
      
      const feedbackList = response.data.data || [];
      
      // Filter to only include items with admin responses for this user
      const feedbackWithReplies = feedbackList.filter(feedback => 
        feedback.user_id === targetUserId && 
        feedback.admin_response && 
        feedback.admin_response.trim().length > 0 &&
        feedback.id // 🔥 IMPORTANT: Ensure feedback has valid ID
      );

      console.log(`💬 Found ${feedbackWithReplies.length} feedback replies for user ${targetUserId}`);
      
      // 🔥 NEW: Log each feedback with its ID and reply info
      feedbackWithReplies.forEach(feedback => {
        console.log(`📝 Feedback ID ${feedback.id}: "${feedback.message.substring(0, 50)}..." - Reply: "${feedback.admin_response?.substring(0, 50)}..."`);
      });
      
      return feedbackWithReplies;
    } catch (error) {
      console.error('❌ Error getting feedback with replies:', error);
      return [];
    }
  }

  // 🔥 NEW: Get new replies since last check (with detailed feedback info)
  async getNewFeedbackReplies(userId?: number, since?: string): Promise<FeedbackData[]> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      
      if (!targetUserId) {
        return [];
      }

      console.log('🔔 Checking for NEW feedback replies for user:', targetUserId, since ? `since ${since}` : '');

      const params: any = { 
        user_id: targetUserId,
        has_replies: true,
        include_reply_details: true,
        per_page: 50,
        sort: 'responded_at',
        order: 'desc'
      };

      // Add since parameter if provided
      if (since) {
        params.replied_since = since;
      }

      const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedbacks', {
        params
      });
      
      const feedbackList = response.data.data || [];
      
      // Filter for user-specific feedback with recent replies
      const newReplies = feedbackList.filter(feedback => {
        if (feedback.user_id !== targetUserId || !feedback.admin_response || !feedback.id) {
          return false;
        }

        // If 'since' parameter was provided, check if reply is newer
        if (since && feedback.responded_at) {
          const replyTime = new Date(feedback.responded_at).getTime();
          const sinceTime = new Date(since).getTime();
          return replyTime > sinceTime;
        }

        return true;
      });

      console.log(`🔔 Found ${newReplies.length} NEW feedback replies for user ${targetUserId}`);
      
      // 🔥 NEW: Detailed logging for each new reply
      newReplies.forEach(feedback => {
        console.log(`🆕 NEW Reply - Feedback ID ${feedback.id}: "${feedback.message.substring(0, 30)}..." replied at ${feedback.responded_at}`);
      });
      
      return newReplies;
    } catch (error) {
      console.error('❌ Error getting new feedback replies:', error);
      return [];
    }
  }

  // 🔥 NEW: Get specific feedback by ID (useful for notification details)
  async getFeedbackById(feedbackId: number, userId?: number): Promise<FeedbackData | null> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      
      if (!targetUserId) {
        return null;
      }

      console.log(`🔍 Getting feedback by ID ${feedbackId} for user ${targetUserId}`);

      const response = await apiClient.get<APIResponse<FeedbackData>>(`/feedbacks/${feedbackId}`, {
        params: { 
          user_id: targetUserId, // Ensure user owns this feedback
          include_reply_details: true
        }
      });
      
      const feedback = response.data.data;
      
      if (feedback && feedback.user_id === targetUserId) {
        console.log(`✅ Found feedback ID ${feedbackId}:`, {
          message: feedback.message.substring(0, 50),
          hasReply: !!feedback.admin_response,
          repliedAt: feedback.responded_at
        });
        return feedback;
      }
      
      console.warn(`⚠️ Feedback ID ${feedbackId} not found or doesn't belong to user ${targetUserId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting feedback by ID ${feedbackId}:`, error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing connection to /api/feedbacks...');
      
      const response = await apiClient.get('/feedbacks', {
        params: { per_page: 1 },
        timeout: 8000
      });
      
      console.log('✅ Connection test successful!');
      return response.data.success !== false;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('🔑 Authentication issue - check token');
        } else if (error.response?.status === 404) {
          console.error('🔍 Endpoint not found - check backend deployment');
        } else if (error.code === 'ECONNABORTED') {
          console.error('⏰ Connection timeout');
        }
      }
      
      return false;
    }
  }

  // DEPRECATED: Use getUserFeedback instead
  async getAllFeedback(perPage: number = 15): Promise<FeedbackData[]> {
    console.warn('⚠️ getAllFeedback is deprecated, use getUserFeedback for user-specific data');
    return this.getUserFeedback(undefined, perPage);
  }

  // Get current user info for debugging
  async getCurrentUserInfo(): Promise<{ id: number | null; email?: string }> {
    try {
      const userData = await AsyncStorage.getItem('valet_user_data');
      if (userData) {
        const user = JSON.parse(userData);
        return {
          id: user.id || null,
          email: user.email
        };
      }
      return { id: null };
    } catch (error) {
      console.error('Error getting current user info:', error);
      return { id: null };
    }
  }

  // 🔥 NEW: Get feedback statistics for user
  async getUserFeedbackStats(userId?: number): Promise<{
    total: number;
    withReplies: number;
    pending: number;
    recent: number;
  }> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      
      if (!targetUserId) {
        return { total: 0, withReplies: 0, pending: 0, recent: 0 };
      }

      const allFeedback = await this.getUserFeedback(targetUserId);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      return {
        total: allFeedback.length,
        withReplies: allFeedback.filter(f => f.admin_response && f.admin_response.trim().length > 0).length,
        pending: allFeedback.filter(f => !f.admin_response || f.admin_response.trim().length === 0).length,
        recent: allFeedback.filter(f => {
          const feedbackTime = new Date(f.created_at || '').getTime();
          return feedbackTime > oneDayAgo;
        }).length
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return { total: 0, withReplies: 0, pending: 0, recent: 0 };
    }
  }
}

export default new ApiService();