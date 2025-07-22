export interface FeedbackData {
  id?: number; // Changed from string to number for MySQL
  type: 'general' | 'bug' | 'feature' | 'parking';
  message: string;
  rating?: number;
  email?: string;
  issues?: string[];
  status: 'pending' | 'reviewed' | 'resolved';
  userId?: number; // Changed from string to number for MySQL
  deviceInfo?: DeviceInfo;
  created_at?: string; // MySQL timestamp format
  updated_at?: string; // MySQL timestamp format
  adminResponse?: string;
  adminId?: number; // Changed from string to number for MySQL
  responded_at?: string; // MySQL timestamp format
  feedback_type?: 'parking_experience' | 'app_usage' | 'general';
  parking_location?: string;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  systemVersion?: string;
  appVersion?: string;
  buildNumber?: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  pendingFeedback: number;
  avgRating: number;
  feedbackByType: {
    general: number;
    bug: number;
    feature: number;
    parking: number;
  };
  feedbackByStatus: {
    pending: number;
    reviewed: number;
    resolved: number;
  };
  recentFeedback: FeedbackData[];
}

export interface FeedbackFilters {
  type?: FeedbackData['type'];
  status?: FeedbackData['status'];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface FeedbackFormData {
  type: FeedbackData['type'];
  message: string;
  rating?: number;
  email?: string;
  issues?: string[];
  feedback_type?: 'parking_experience' | 'app_usage' | 'general';
  parking_location?: string;
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  feedbackId?: number;
  message: string;
  error?: string;
  errors?: any;
  data?: {
    feedback_id: number;
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

// Constants for feedback types
export const FEEDBACK_TYPES = {
  GENERAL: 'general' as const,
  BUG: 'bug' as const,
  FEATURE: 'feature' as const,
  PARKING: 'parking' as const,
};

// Constants for feedback status
export const FEEDBACK_STATUS = {
  PENDING: 'pending' as const,
  REVIEWED: 'reviewed' as const,
  RESOLVED: 'resolved' as const,
};
