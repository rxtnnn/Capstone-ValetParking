// src/types/feedback.ts

export interface FeedbackData {
  id?: string;
  type: 'general' | 'bug' | 'feature' | 'parking';
  message: string;
  rating?: number;
  email?: string;
  issues?: string[];
  timestamp: any; // Firestore timestamp (can be Timestamp or string)
  status: 'pending' | 'reviewed' | 'resolved';
  userId?: string;
  deviceInfo?: DeviceInfo;
  createdAt?: string;
  updatedAt?: any;
  adminResponse?: string;
  adminId?: string;
  respondedAt?: any;
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
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  feedbackId?: string;
  message: string;
  error?: string;
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