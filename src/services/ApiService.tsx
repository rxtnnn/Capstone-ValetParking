import axios from 'axios';
import apiClient from '../config/api';
import { FeedbackData, APIResponse } from '../types/feedback';

class ApiService {
  async submitFeedback(feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at'>): Promise<string> {
    try {
      console.log('🎯 Submitting feedback to /api/feedbacks');
      
      // Prepare data exactly as backend expects
      const requestData = {
        user_id: 2, // John Doe from seeder (always use this for mobile)
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

  async getAllFeedback(perPage: number = 15): Promise<FeedbackData[]> {
    try {
      const response = await apiClient.get<APIResponse<FeedbackData[]>>('/feedbacks', {
        params: { per_page: perPage }
      });
      
      return response.data.data || [];
    } catch (error) {
      console.error('❌ Error getting feedback:', error);
      throw new Error('Failed to load feedback');
    }
  }
}

export default new ApiService();