import axios from 'axios';
import apiClient from '../config/api';
import { FeedbackData, FeedbackStats, APIResponse, FeedbackSubmissionResponse } from '../types/feedback';

export interface SubmitFeedbackRequest {
  user_id?: number;
  rating?: number;
  comment: string;
  feedback_type?: 'parking_experience' | 'app_usage' | 'general';
  parking_location?: string;
  type: 'general' | 'bug' | 'feature' | 'parking';
  email?: string;
  issues?: string[];
  deviceInfo?: {
    platform: string;
    version: string;
    model: string;
    systemVersion?: string;
    appVersion?: string;
    buildNumber?: string;
  };
}

class ApiService {
  // Submit feedback to MySQL API
  async submitFeedback(feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at'>): Promise<string> {
    try {
      // Transform data to match API expectations
      const requestData: SubmitFeedbackRequest = {
        user_id: feedbackData.userId,
        rating: feedbackData.rating,
        comment: feedbackData.message, // Map message to comment
        feedback_type: this.mapTypeToFeedbackType(feedbackData.type),
        parking_location: feedbackData.parking_location,
        type: feedbackData.type,
        email: feedbackData.email,
        issues: feedbackData.issues,
        deviceInfo: feedbackData.deviceInfo,
      };

      console.log('Submitting feedback data:', requestData);
      
      const response = await apiClient.post<FeedbackSubmissionResponse>('/feedback', requestData);
      
      if (response.data.success && response.data.data?.feedback_id) {
        console.log('Feedback submitted with ID:', response.data.data.feedback_id);
        return response.data.data.feedback_id.toString();
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else if (error.response?.data?.errors) {
          const errorMessages = Object.values(error.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        } else if (error.message) {
          throw new Error(error.message);
        }
      }
      
      throw new Error('Failed to submit feedback. Please try again.');
    }
  }

  // Helper method to map feedback type to API expected format
  private mapTypeToFeedbackType(type: string): 'parking_experience' | 'app_usage' | 'general' {
    switch (type) {
      case 'parking':
        return 'parking_experience';
      case 'bug':
      case 'feature':
        return 'app_usage';
      default:
        return 'general';
    }
  }

  // Get all feedback with pagination (for admin)
  async getAllFeedback(limitCount: number = 50, page: number = 1): Promise<{feedback: FeedbackData[], hasMore: boolean}> {
    try {
      const response = await apiClient.get<APIResponse<{
        data: FeedbackData[],
        current_page: number,
        last_page: number,
        total: number
      }>>('/feedback', {
        params: {
          limit: limitCount,
          page: page
        }
      });

      if (response.data.success && response.data.data) {
        return {
          feedback: response.data.data.data || [],
          hasMore: response.data.data.current_page < response.data.data.last_page
        };
      }

      return { feedback: [], hasMore: false };
    } catch (error) {
      console.error('Error getting feedback:', error);
      throw new Error('Failed to get feedback data');
    }
  }

  // Get feedback by type
  async getFeedbackByType(type: FeedbackData['type'], limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedback', {
        params: {
          type: type,
          limit: limitCount
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error getting feedback by type:', error);
      throw new Error(`Failed to get ${type} feedback`);
    }
  }

  // Get feedback by status
  async getFeedbackByStatus(status: FeedbackData['status'], limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedback', {
        params: {
          status: status,
          limit: limitCount
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error getting feedback by status:', error);
      throw new Error(`Failed to get ${status} feedback`);
    }
  }

  // Update feedback status
  async updateFeedbackStatus(feedbackId: number, status: FeedbackData['status']): Promise<void> {
    try {
      await apiClient.put(`/feedback/${feedbackId}`, {
        status: status
      });
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw new Error('Failed to update feedback status');
    }
  }

  // Get single feedback by ID
  async getFeedbackById(feedbackId: number): Promise<FeedbackData | null> {
    try {
      const response = await apiClient.get<APIResponse<FeedbackData>>(`/feedback/${feedbackId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting feedback by ID:', error);
      throw new Error('Failed to get feedback details');
    }
  }

  // Get feedback statistics
  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      // This would need to be implemented in your Laravel backend
      const response = await apiClient.get<APIResponse<FeedbackStats>>('/feedback/stats');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      // Fallback: calculate stats from regular feedback endpoint
      const { feedback } = await this.getAllFeedback(1000); // Get more data for stats
      
      const stats: FeedbackStats = {
        totalFeedback: feedback.length,
        pendingFeedback: feedback.filter(f => f.status === 'pending').length,
        avgRating: 0,
        feedbackByType: {
          general: 0,
          bug: 0,
          feature: 0,
          parking: 0,
        },
        feedbackByStatus: {
          pending: 0,
          reviewed: 0,
          resolved: 0,
        },
        recentFeedback: feedback.slice(0, 5)
      };

      // Calculate average rating
      const ratingsOnly = feedback.filter(f => f.rating && f.rating > 0);
      if (ratingsOnly.length > 0) {
        stats.avgRating = ratingsOnly.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsOnly.length;
      }

      // Count feedback by type and status
      feedback.forEach(feedbackItem => {
        if (feedbackItem.type in stats.feedbackByType) {
          stats.feedbackByType[feedbackItem.type]++;
        }
        if (feedbackItem.status in stats.feedbackByStatus) {
          stats.feedbackByStatus[feedbackItem.status]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      throw new Error('Failed to get feedback statistics');
    }
  }

  // Delete feedback
  async deleteFeedback(feedbackId: number): Promise<void> {
    try {
      await apiClient.delete(`/feedback/${feedbackId}`);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw new Error('Failed to delete feedback');
    }
  }

  // Search feedback
  async searchFeedback(searchTerm: string, limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedback', {
        params: {
          search: searchTerm,
          limit: limitCount
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error searching feedback:', error);
      throw new Error('Failed to search feedback');
    }
  }

  // Add admin response
  async addAdminResponse(feedbackId: number, response: string, adminId: number): Promise<void> {
    try {
      await apiClient.put(`/feedback/${feedbackId}`, {
        admin_response: response,
        admin_id: adminId,
        status: 'reviewed'
      });
    } catch (error) {
      console.error('Error adding admin response:', error);
      throw new Error('Failed to add admin response');
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      // Try to hit a simple endpoint to test connection
      const response = await apiClient.get('/feedback?limit=1');
      console.log('API connection successful!');
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      return false;
    }
  }

  // Retry mechanism for failed requests
  async submitFeedbackWithRetry(
    feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at'>, 
    maxRetries: number = 3
  ): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.submitFeedback(feedbackData);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('Max retries exceeded');
  }
}

export default new ApiService();