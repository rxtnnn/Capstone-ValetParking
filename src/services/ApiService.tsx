import axios from 'axios';
import apiClient, { TokenManager } from '../config/api';
import { FeedbackData, APIResponse } from '../types/feedback';

const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'User not authenticated. Please log in again.',
  SUBMISSION_FAILED: 'Submission failed',
  AUTH_FAILED: 'Authentication failed. Please contact support.',
  SERVICE_NOT_FOUND: 'Feedback service not found. Please contact support.',
  LOAD_FAILED: 'Failed to load feedback',
  CONNECTION_FAILED: 'Failed to submit feedback. Please check your connection and try again.'
} as const;

const DEFAULT_STATS = { total: 0, withReplies: 0, pending: 0, recent: 0 };
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

class ApiService {
  private getCurrentUserId(): number | null {
    try {
      const user = TokenManager.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  private cleanRequestData(data: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
  }

  private handleAxiosError(error: any): Error {
    if (!axios.isAxiosError(error) || !error.response) {
      return new Error(ERROR_MESSAGES.CONNECTION_FAILED);
    }

    const { status, data } = error.response;
    
    if (status === 401) {
      TokenManager.clearToken();
      return new Error(ERROR_MESSAGES.AUTH_FAILED);
    }
    
    if (status === 422) {
      const errors = data?.errors;
      if (errors) {
        const errorList = Object.entries(errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        return new Error(`Validation errors: ${errorList}`);
      }
    }
    
    if (status === 404) {
      return new Error(ERROR_MESSAGES.SERVICE_NOT_FOUND);
    }
    
    if (data?.message) {
      return new Error(data.message);
    }
    return new Error(ERROR_MESSAGES.CONNECTION_FAILED);
  }

  async submitFeedback(feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at' | 'user_id'>): Promise<string> {
    try {
      const currentUserId = this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error(ERROR_MESSAGES.NOT_AUTHENTICATED);
      }
      
      const requestData = this.cleanRequestData({
        user_id: currentUserId,
        type: feedbackData.type,
        message: feedbackData.message,
        rating: feedbackData.type === 'general' ? feedbackData.rating : undefined,
        email: feedbackData.email || undefined,
        issues: feedbackData.issues?.length ? feedbackData.issues : undefined,
        device_info: feedbackData.device_info || undefined,
      });

      const response = await apiClient.post<APIResponse<FeedbackData>>('/feedbacks', requestData);
      
      if (response.data.success && response.data.data?.id) {
        return response.data.data.id.toString();
      }
      
      throw new Error(response.data.message || ERROR_MESSAGES.SUBMISSION_FAILED);
    } catch (error) {
      console.error('Submission error:', error);
      throw this.handleAxiosError(error);
    }
  }

  private async getFeedbackList(params: Record<string, any>): Promise<FeedbackData[]> {
    const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedbacks', { params });
    return response.data.data || [];
  }

  async getUserFeedback(userId?: number, perPage: number = 50): Promise<FeedbackData[]> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) {
        return [];
      }

      const feedbackList = await this.getFeedbackList({
        user_id: targetUserId,
        per_page: perPage,
        include_replies: true,
        sort: 'created_at',
        order: 'desc'
      });
      
      return feedbackList.filter(feedback => feedback.user_id === targetUserId);
    } catch (error) {
      console.error('Error getting user feedback:', error);
      throw new Error(ERROR_MESSAGES.LOAD_FAILED);
    }
  }

  async getUserFeedbackWithReplies(userId?: number): Promise<FeedbackData[]> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) return [];

      const feedbackList = await this.getFeedbackList({
        user_id: targetUserId,
        has_replies: true,
        include_reply_details: true,
        per_page: 100,
        sort: 'responded_at',
        order: 'desc'
      });
      
      return feedbackList.filter(feedback => 
        feedback.user_id === targetUserId && 
        feedback.admin_response?.trim() &&
        feedback.id
      );
    } catch (error) {
      console.error('Error getting feedback with replies:', error);
      return [];
    }
  }

  async getNewFeedbackReplies(userId?: number, since?: string): Promise<FeedbackData[]> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) return [];

      const params = {
        user_id: targetUserId,
        has_replies: true,
        include_reply_details: true,
        per_page: 50,
        sort: 'responded_at',
        order: 'desc',
        ...(since && { replied_since: since })
      };

      const feedbackList = await this.getFeedbackList(params);
      
      return feedbackList.filter(feedback => {
        if (feedback.user_id !== targetUserId || !feedback.admin_response || !feedback.id) {
          return false;
        }
        
        if (since && feedback.responded_at) {
          const replyTime = new Date(feedback.responded_at).getTime();
          const sinceTime = new Date(since).getTime();
          return replyTime > sinceTime;
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error getting new feedback replies:', error);
      return [];
    }
  }

  async getFeedbackById(feedbackId: number, userId?: number): Promise<FeedbackData | null> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) return null;

      const response = await apiClient.get<APIResponse<FeedbackData>>(`/feedbacks/${feedbackId}`, {
        params: { 
          user_id: targetUserId,
          include_reply_details: true
        }
      });
      
      const feedback = response.data.data;
      
      if (feedback?.user_id === targetUserId) {
        return feedback;
      }
      
      console.warn(`Feedback ID ${feedbackId} not found or doesn't belong to user ${targetUserId}`);
      return null;
    } catch (error) {
      console.error(`Error getting feedback by ID ${feedbackId}:`, error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await apiClient.get('/feedbacks', {
        params: { per_page: 1 },
        timeout: 8000
      });
      
      return response.data.success !== false;
    } catch (error) {
      console.error('Connection test failed:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 401) {
          console.error('Authentication issue - check token');
          TokenManager.clearToken(); // Clear invalid token
        } else if (status === 404) {
          console.error('Endpoint not found - check backend deployment');
        } else if (error.code === 'ECONNABORTED') {
          console.error('Connection timeout');
        }
      }
      
      return false;
    }
  }

  async getAllFeedback(perPage: number = 15): Promise<FeedbackData[]> {
    console.warn('getAllFeedback is deprecated, use getUserFeedback for user-specific data');
    return this.getUserFeedback(undefined, perPage);
  }

  getCurrentUserInfo(): { id: number | null; email?: string; name?: string; role?: string; employee_id?: string } {
    try {
      const user = TokenManager.getUser();
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          employee_id: user.employee_id
        };
      }
      return { id: null };
    } catch (error) {
      console.error('Error getting current user info:', error);
      return { id: null };
    }
  }

  async getUserFeedbackStats(userId?: number): Promise<{
    total: number;
    withReplies: number;
    pending: number;
    recent: number;
  }> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) return DEFAULT_STATS;

      const allFeedback = await this.getUserFeedback(targetUserId);
      const oneDayAgo = Date.now() - ONE_DAY_MS;
      
      return {
        total: allFeedback.length,
        withReplies: allFeedback.filter(f => f.admin_response?.trim()).length,
        pending: allFeedback.filter(f => !f.admin_response?.trim()).length,
        recent: allFeedback.filter(f => {
          const feedbackTime = new Date(f.created_at || '').getTime();
          return feedbackTime > oneDayAgo;
        }).length
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return DEFAULT_STATS;
    }
  }

  // Additional utility methods for user management
  isUserAuthenticated(): boolean {
    return TokenManager.getToken() !== null && this.getCurrentUserId() !== null;
  }

  getCurrentUserName(): string | null {
    const user = TokenManager.getUser();
    return user?.name || null;
  }

  getCurrentUserRole(): string | null {
    const user = TokenManager.getUser();
    return user?.role || null;
  }

  getCurrentUserEmail(): string | null {
    const user = TokenManager.getUser();
    return user?.email || null;
  }
}

export default new ApiService();