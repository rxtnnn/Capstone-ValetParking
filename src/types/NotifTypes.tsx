// src/types/NotificationTypes.ts
export interface BaseNotification {
  id: string;
  type: 'spot_available' | 'floor_update' | 'feedback_reply' | 'general';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface SpotAvailableNotification extends BaseNotification {
  type: 'spot_available';
  data: {
    spotsAvailable: number;
    floor?: number;
    spotIds?: string[];
  };
}

export interface FloorUpdateNotification extends BaseNotification {
  type: 'floor_update';
  data: {
    floor: number;
    availableSpots: number;
    totalSpots: number;
    previousAvailable?: number;
  };
}

export interface FeedbackReplyNotification extends BaseNotification {
  type: 'feedback_reply';
  data: {
    feedbackId: number;
    originalFeedback: string;
    adminReply: string;
    adminName?: string;
    replyTimestamp: number;
  };
}

export interface GeneralNotification extends BaseNotification {
  type: 'general';
  data: {
    category?: string;
    actionRequired?: boolean;
  };
}

export type AppNotification = 
  | SpotAvailableNotification 
  | FloorUpdateNotification 
  | FeedbackReplyNotification 
  | GeneralNotification;

// Additional type for notification settings
export interface NotificationSettings {
  spotAvailable: boolean;
  floorUpdates: boolean;
  maintenanceAlerts: boolean;
  vibration: boolean;
  sound: boolean;
}

// Type for notification listener callback
export type NotificationListener = (notifications: AppNotification[]) => void;

// Type for notification status
export type NotificationStatus = 'enabled' | 'disabled' | 'permission_denied';

// Type for notification priority levels
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Interface for notification summary
export interface NotificationSummary {
  total: number;
  unread: number;
  recent: number;
  byType: {
    spot_available: number;
    floor_update: number;
    feedback_reply: number;
    general: number;
  };
}

// Interface for notification manager state
export interface NotificationManagerState {
  notifications: AppNotification[];
  unreadCount: number;
  lastUpdated: number;
  isLoading: boolean;
}

// Enum for notification types (alternative to string literals)
export enum NotificationType {
  SPOT_AVAILABLE = 'spot_available',
  FLOOR_UPDATE = 'floor_update',
  FEEDBACK_REPLY = 'feedback_reply',
  GENERAL = 'general'
}

// Enum for notification priorities
export enum NotificationPriorityLevel {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Interface for creating new notifications (without auto-generated fields)
export interface CreateNotificationData {
  type: AppNotification['type'];
  title: string;
  message: string;
  priority: NotificationPriority;
  data: any;
}

// Interface for notification filter options
export interface NotificationFilter {
  type?: AppNotification['type'];
  isRead?: boolean;
  priority?: NotificationPriority;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

// Interface for notification actions
export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
  destructive?: boolean;
}
