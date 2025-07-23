import axios from 'axios';
import apiClient, { feedbackClient, API_CONFIG } from '../config/api';
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

      console.log('Submitting feedback data to:', API_CONFIG.FEEDBACKS_ENDPOINT);
      console.log('Request data:', requestData);
      
      // Use feedbackClient for the specific feedbacks endpoint
      const response = await feedbackClient.post('', requestData); // Empty string since base URL includes /feedbacks
      
      console.log('API Response:', response.data);
      
      if (response.data.success && response.data.data?.feedback_id) {
        console.log('Feedback submitted with ID:', response.data.data.feedback_id);
        return response.data.data.feedback_id.toString();
      } else if (response.data.success && response.data.id) {
        // Alternative response format
        console.log('Feedback submitted with ID:', response.data.id);
        return response.data.id.toString();
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      if (axios.isAxiosError(error)) {
        // Handle authentication errors
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please check API token.');
        }
        
        // Handle validation errors
        if (error.response?.status === 422 && error.response?.data?.errors) {
          const errorMessages = Object.values(error.response.data.errors).flat();
          throw new Error('Validation failed: ' + errorMessages.join(', '));
        }
        
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
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
      const response = await feedbackClient.get('', {
        params: {
          limit: limitCount,
          page: page
        }
      });

      console.log('Get all feedback response:', response.data);

      if (response.data.success && response.data.data) {
        return {
          feedback: response.data.data.data || response.data.data || [],
          hasMore: response.data.data.current_page ? response.data.data.current_page < response.data.data.last_page : false
        };
      }

      // Handle direct array response
      if (Array.isArray(response.data)) {
        return { feedback: response.data, hasMore: false };
      }

      return { feedback: [], hasMore: false };
    } catch (error) {
      console.error('Error getting feedback:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error('Failed to get feedback data');
    }
  }

  // Get feedback by type
  async getFeedbackByType(type: FeedbackData['type'], limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const response = await feedbackClient.get('', {
        params: {
          type: type,
          limit: limitCount
        }
      });

      return Array.isArray(response.data) ? response.data : (response.data.data || []);
    } catch (error) {
      console.error('Error getting feedback by type:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error(`Failed to get ${type} feedback`);
    }
  }

  // Get feedback by status
  async getFeedbackByStatus(status: FeedbackData['status'], limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const response = await feedbackClient.get('', {
        params: {
          status: status,
          limit: limitCount
        }
      });

      return Array.isArray(response.data) ? response.data : (response.data.data || []);
    } catch (error) {
      console.error('Error getting feedback by status:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error(`Failed to get ${status} feedback`);
    }
  }

  // Update feedback status
  async updateFeedbackStatus(feedbackId: number, status: FeedbackData['status']): Promise<void> {
    try {
      await feedbackClient.put(`/${feedbackId}`, {
        status: status
      });
    } catch (error) {
      console.error('Error updating feedback status:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error('Failed to update feedback status');
    }
  }

  // Get single feedback by ID
  async getFeedbackById(feedbackId: number): Promise<FeedbackData | null> {
    try {
      const response = await feedbackClient.get(`/${feedbackId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      // Handle direct object response
      if (response.data.id) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting feedback by ID:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error('Failed to get feedback details');
    }
  }

  // Get feedback statistics
  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      // Try to get stats from a dedicated endpoint first
      try {
        const response = await apiClient.get('/feedback/stats');
        
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (statsError) {
        console.log('Dedicated stats endpoint not available, calculating from feedback data');
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
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error('Failed to get feedback statistics');
    }
  }

  // Delete feedback
  async deleteFeedback(feedbackId: number): Promise<void> {
    try {
      await feedbackClient.delete(`/${feedbackId}`);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error('Failed to delete feedback');
    }
  }

  // Search feedback
  async searchFeedback(searchTerm: string, limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const response = await feedbackClient.get('', {
        params: {
          search: searchTerm,
          limit: limitCount
        }
      });

      return Array.isArray(response.data) ? response.data : (response.data.data || []);
    } catch (error) {
      console.error('Error searching feedback:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error('Failed to search feedback');
    }
  }

  // Add admin response
  async addAdminResponse(feedbackId: number, response: string, adminId: number): Promise<void> {
    try {
      await feedbackClient.put(`/${feedbackId}`, {
        admin_response: response,
        admin_id: adminId,
        status: 'reviewed'
      });
    } catch (error) {
      console.error('Error adding admin response:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API token.');
      }
      
      throw new Error('Failed to add admin response');
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing API connection with token authentication...');
      
      // Test the feedback endpoint with a minimal request
      const response = await feedbackClient.get('', { 
        params: { limit: 1 },
        timeout: 5000 // Shorter timeout for connection test
      });
      
      console.log('API connection successful!', response.status);
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('Authentication failed - check API token');
        } else if (error.code === 'ECONNABORTED') {
          console.error('Connection timeout');
        } else if (error.code === 'NETWORK_ERROR') {
          console.error('Network error - check internet connection');
        }
      }
      
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