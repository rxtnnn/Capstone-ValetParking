export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface BaseNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  priority: NotificationPriority;
}

export interface SpotAvailableData {
  spotsAvailable: number;
  floor?: number;
  spotIds?: string[];
  userId?: number;
}

export interface FloorUpdateData {
  floor: number;
  availableSpots: number;
  totalSpots: number;
  previousAvailable?: number;
  userId?: number;
}

export interface FeedbackReplyData {
  feedbackId: number;
  originalFeedback: string;
  adminReply: string;
  adminName?: string;
  replyTimestamp: number;
  userId?: number;
}

export interface GenericNotificationData {
  userId?: number;
  [key: string]: any;
}

export interface SpotAvailableNotification extends BaseNotification {
  type: 'spot_available';
  data: SpotAvailableData;
}

export interface FloorUpdateNotification extends BaseNotification {
  type: 'floor_update';
  data: FloorUpdateData;
}

export interface FeedbackReplyNotification extends BaseNotification {
  type: 'feedback_reply';
  data: FeedbackReplyData;
}

export interface GenericNotification extends BaseNotification {
  type: string;
  data: GenericNotificationData;
}

export type AppNotification = 
  | SpotAvailableNotification 
  | FloorUpdateNotification 
  | FeedbackReplyNotification
  | GenericNotification;

// Type guards for safe type checking
export const isSpotAvailableNotification = (notification: AppNotification): notification is SpotAvailableNotification => {
  return notification.type === 'spot_available';
};

export const isFloorUpdateNotification = (notification: AppNotification): notification is FloorUpdateNotification => {
  return notification.type === 'floor_update';
};

export const isFeedbackReplyNotification = (notification: AppNotification): notification is FeedbackReplyNotification => {
  return notification.type === 'feedback_reply';
};

// Helper function to safely get userId from any notification
export const getNotificationUserId = (notification: AppNotification): number | undefined => {
  return notification.data?.userId;
};

// Helper function to set userId on notification data
export const setNotificationUserId = (data: any, userId: number | null): any => {
  return {
    ...data,
    userId: userId || undefined
  };
};

// Factory functions for creating typed notifications
export const createSpotAvailableNotification = (
  title: string,
  message: string,
  spotsAvailable: number,
  floor?: number,
  spotIds?: string[],
  userId?: number
): Omit<SpotAvailableNotification, 'id' | 'timestamp' | 'isRead'> => ({
  type: 'spot_available',
  title,
  message,
  priority: 'high',
  data: {
    spotsAvailable,
    floor,
    spotIds,
    userId
  }
});

export const createFloorUpdateNotification = (
  title: string,
  message: string,
  floor: number,
  availableSpots: number,
  totalSpots: number,
  previousAvailable?: number,
  userId?: number
): Omit<FloorUpdateNotification, 'id' | 'timestamp' | 'isRead'> => ({
  type: 'floor_update',
  title,
  message,
  priority: 'normal',
  data: {
    floor,
    availableSpots,
    totalSpots,
    previousAvailable,
    userId
  }
});

export const createFeedbackReplyNotification = (
  title: string,
  message: string,
  feedbackId: number,
  originalFeedback: string,
  adminReply: string,
  adminName?: string,
  userId?: number
): Omit<FeedbackReplyNotification, 'id' | 'timestamp' | 'isRead'> => ({
  type: 'feedback_reply',
  title,
  message,
  priority: 'high',
  data: {
    feedbackId,
    originalFeedback,
    adminReply,
    adminName,
    replyTimestamp: Date.now(),
    userId
  }
});

export type CreateNotificationInput = Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>;