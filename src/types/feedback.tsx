// src/types/feedback.ts

export interface FeedbackData {
  id?: number;
  user_id: number;
  type: 'general' | 'parking' | 'technical' | 'suggestion';
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
  // Additional metadata
  feedback_type?: 'general' | 'parking_experience' | 'technical_issue' | 'feature_request';
  parking_location?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  floor_number?: number;
  spot_id?: string;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  systemVersion?: string;
  appVersion?: string;
  buildNumber?: string;
  userAgent?: string;
  screenResolution?: string;
  networkType?: string;
  batteryLevel?: number;
  memoryUsage?: number;
}

export interface FeedbackFormData {
  type: FeedbackData['type'];
  message: string;
  rating?: number;
  email?: string;
  issues?: string[];
  floor_number?: number;
  spot_id?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
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
  timestamp?: string;
  request_id?: string;
  version?: string;
}

export interface FeedbackCategory {
  value: FeedbackData['type'];
  label: string;
  icon: string;
  description: string;
  requiresRating: boolean;
  commonIssues: string[];
  placeholder: string;
}

export interface FeedbackStats {
  total: number;
  by_type: {
    general: number;
    parking: number;
    technical: number;
    suggestion: number;
  };
  by_status: {
    pending: number;
    reviewed: number;
    resolved: number;
  };
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  average_rating: number;
  response_time_avg: number;
  recent_trends: {
    this_week: number;
    last_week: number;
    this_month: number;
    last_month: number;
  };
}

export interface FeedbackFilters {
  type?: FeedbackData['type'];
  status?: FeedbackData['status'];
  severity?: FeedbackData['severity'];
  has_rating?: boolean;
  has_email?: boolean;
  date_from?: string;
  date_to?: string;
  user_id?: number;
  admin_id?: number;
  search_query?: string;
  floor_number?: number;
}

export interface AdminResponse {
  feedback_id: number;
  admin_id: number;
  response: string;
  status: 'reviewed' | 'resolved';
  internal_notes?: string;
  follow_up_required?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface FeedbackSummary {
  id: number;
  type: FeedbackData['type'];
  message_preview: string;
  rating?: number;
  status: FeedbackData['status'];
  user_name?: string;
  created_at: string;
  responded_at?: string;
  has_issues: boolean;
  issue_count: number;
  severity?: FeedbackData['severity'];
}

export interface FeedbackValidation {
  message: {
    min_length: number;
    max_length: number;
    required: boolean;
  };
  rating: {
    min: number;
    max: number;
    required_for_types: FeedbackData['type'][];
  };
  email: {
    required: boolean;
    format: RegExp;
  };
  issues: {
    max_selections: number;
    available_by_type: { [key in FeedbackData['type']]: string[] };
  };
}

export interface FeedbackNotification {
  id: number;
  feedback_id: number;
  user_id: number;
  type: 'submission_confirmed' | 'admin_replied' | 'status_updated';
  title: string;
  message: string;
  sent_at: string;
  read_at?: string;
  email_sent: boolean;
  push_sent: boolean;
}

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  {
    value: 'general',
    label: 'App Experience',
    icon: 'star-outline',
    description: 'Overall app experience and satisfaction',
    requiresRating: true,
    commonIssues: [
      'User interface design',
      'App performance',
      'Feature availability',
      'Ease of use',
      'Information accuracy',
      'Response time',
      'Overall satisfaction',
      'Recommendation likelihood'
    ],
    placeholder: 'How was your experience with VALET? What did you like or dislike about the app?'
  },
  {
    value: 'parking',
    label: 'Parking Issues',
    icon: 'car-outline',
    description: 'Issues related to parking spots, sensors, and navigation',
    requiresRating: false,
    commonIssues: [
      'Sensor shows wrong status',
      'Spot marked occupied but empty',
      'Spot marked available but occupied',
      'Floor map not updating',
      'Cannot find parking spot',
      'Incorrect floor information',
      'Navigation to spot unclear',
      'Real-time data not working'
    ],
    placeholder: 'Describe the parking issue you encountered. Which floor or section was affected? When did this happen?'
  },
  {
    value: 'technical',
    label: 'Bug Reports',
    icon: 'bug-outline',
    description: 'App bugs, crashes, and technical difficulties',
    requiresRating: false,
    commonIssues: [
      'App crashes frequently',
      'Slow loading times',
      'Login/logout issues',
      'Notifications not working',
      'Map not loading properly',
      'Internet connection problems',
      'App freezes or hangs',
      'Data not syncing properly'
    ],
    placeholder: 'What technical problem did you experience? Please describe what happened and when it occurred.'
  },
  {
    value: 'suggestion',
    label: 'Suggestions',
    icon: 'bulb-outline',
    description: 'Feature requests and improvement ideas',
    requiresRating: false,
    commonIssues: [
      'Better navigation features',
      'Improved spot reservation',
      'More detailed floor maps',
      'Better notification system',
      'Dark mode option',
      'Offline mode support',
      'Voice guidance features'
    ],
    placeholder: 'What feature or improvement would you like to see in VALET? How would it make your parking experience better?'
  }
];

export const FEEDBACK_VALIDATION: FeedbackValidation = {
  message: {
    min_length: 10,
    max_length: 1000,
    required: true
  },
  rating: {
    min: 1,
    max: 5,
    required_for_types: ['general']
  },
  email: {
    required: false,
    format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  issues: {
    max_selections: 5,
    available_by_type: {
      general: FEEDBACK_CATEGORIES.find(c => c.value === 'general')?.commonIssues || [],
      parking: FEEDBACK_CATEGORIES.find(c => c.value === 'parking')?.commonIssues || [],
      technical: FEEDBACK_CATEGORIES.find(c => c.value === 'technical')?.commonIssues || [],
      suggestion: FEEDBACK_CATEGORIES.find(c => c.value === 'suggestion')?.commonIssues || []
    }
  }
};

// Type guards
export const isFeedbackType = (value: string | undefined): value is FeedbackData['type'] => {
  return typeof value === 'string' && ['general', 'parking', 'technical', 'suggestion'].includes(value);
};

export const isFeedbackStatus = (value: string | undefined): value is FeedbackData['status'] => {
  return typeof value === 'string' && ['pending', 'reviewed', 'resolved'].includes(value);
};

export const isFeedbackSeverity = (value: string | undefined): value is FeedbackData['severity'] => {
  return typeof value === 'string' && ['low', 'medium', 'high', 'critical'].includes(value);
};

// Helper functions
export const getFeedbackCategory = (type: FeedbackData['type']): FeedbackCategory | undefined => {
  return FEEDBACK_CATEGORIES.find(category => category.value === type);
};

export const validateFeedbackData = (data: FeedbackFormData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const validation = FEEDBACK_VALIDATION;
  const category = getFeedbackCategory(data.type);

  if (!data.message || data.message.trim().length < validation.message.min_length) {
    errors.push(`Message must be at least ${validation.message.min_length} characters long`);
  }
  if (data.message && data.message.length > validation.message.max_length) {
    errors.push(`Message must not exceed ${validation.message.max_length} characters`);
  }

  if (category?.requiresRating && (!data.rating || data.rating < 1 || data.rating > 5)) {
    errors.push('Please provide a rating between 1 and 5 stars');
  }

  if (data.email && !validation.email.format.test(data.email)) {
    errors.push('Please enter a valid email address');
  }

  if (data.issues && data.issues.length > validation.issues.max_selections) {
    errors.push(`Please select no more than ${validation.issues.max_selections} issues`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};