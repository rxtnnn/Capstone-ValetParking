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

export interface SpotMalfunctionData {
  spotCode: string;
  reportedBy: string;
  floor: string | number;
  reason: string;
  userId?: number;
}

export interface SpotMalfunctionNotification extends BaseNotification {
  type: 'spot_malfunction';
  data: SpotMalfunctionData;
}

export interface RfidAlertData {
  alertType: 'invalid' | 'expired' | 'suspended' | 'unknown';
  rfidUid: string;
  readerLocation: string;
  userName?: string;
  vehiclePlate?: string;
  message?: string;
  userId?: number;
}

export interface RfidAlertNotification extends BaseNotification {
  type: 'rfid_alert';
  data: RfidAlertData;
}

export interface GuestRequestData {
  guestName: string;
  vehiclePlate: string;
  purpose: string;
  guestId?: string;
  userId?: number;
}

export interface GuestRequestNotification extends BaseNotification {
  type: 'guest_request';
  data: GuestRequestData;
}

export interface SpotAvailableNotification extends BaseNotification {
  type: 'spot_available';
  data: SpotAvailableData;
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
  | FeedbackReplyNotification
  | SpotMalfunctionNotification
  | RfidAlertNotification
  | GuestRequestNotification
  | GenericNotification;

// guards for safe type checking
export const isSpotAvailableNotification = (notification: AppNotification): notification is SpotAvailableNotification => {
  return notification.type === 'spot_available';
};

export const isFeedbackReplyNotification = (notification: AppNotification): notification is FeedbackReplyNotification => {
  return notification.type === 'feedback_reply';
};

export const getNotificationUserId = (notification: AppNotification): number | undefined => {
  return notification.data?.userId;
};

//set userId on notification data
export const setNotificationUserId = (data: any, userId: number | null): any => {
  return {
    ...data,
    userId: userId || undefined
  };
};

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
