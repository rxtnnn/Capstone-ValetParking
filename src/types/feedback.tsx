export interface FeedbackData {
  id?: number;
  user_id: number;
  type: 'general' | 'bug' | 'feature' | 'parking';
  message: string;
  rating?: number;
  email?: string;
  issues?: string[];
  device_info?: DeviceInfo;
  status?: 'pending' | 'reviewed' | 'resolved';
  admin_response?: string;
  admin_id?: number;
  responded_at?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields from sys_users
  user_name?: string;
  user_role?: string;
  user_email?: string;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  systemVersion?: string;
  appVersion?: string;
  buildNumber?: string;
}

export interface FeedbackFormData {
  type: FeedbackData['type'];
  message: string;
  rating?: number;
  email?: string;
  issues?: string[];
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  };
}