import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification, CreateNotificationInput, createSpotAvailableNotification, createFeedbackReplyNotification,
  getNotificationUserId, setNotificationUserId } from '../types/NotifTypes';
import { FeedbackData } from '../types/feedback';

const STORAGE_KEYS = {
  NOTIFICATIONS: '@valet_notifications',
  FEEDBACK_CHECK: '@valet_last_feedback_check',
  PROCESSED_REPLIES: '@valet_processed_replies' } as const;

const MAX_NOTIFICATIONS = 100;
const ALLOWED_TYPES = ['spot_available', 'feedback_reply'] as const;
const BLOCKED_TITLES = ['VALET Connected!', 'Connection Established', 'Welcome to VALET', 'System Ready', 'App Initialized'];

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationManagerClass {
  private notifications: AppNotification[] = [];
  private listeners: NotificationListener[] = [];
  private currentUserId: number | null = null;
  private processedReplies = new Set<string>();

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await Promise.all([
      this.loadNotifications(),
      this.loadProcessedReplies(),
      this.getCurrentUserId()
    ]);
  }

  private async getCurrentUserId(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('valet_user_data');
      this.currentUserId = userData ? (JSON.parse(userData).id || null) : null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
  }

  async setCurrentUserId(userId: number | null): Promise<void> {
    this.currentUserId = userId;
    
    if (userId === null) {
      await Promise.all([this.clearAllNotifications(), this.clearProcessedReplies()]);
    } else {
      await Promise.all([this.loadNotifications(), this.loadProcessedReplies()]);
    }
  }

  private async loadProcessedReplies(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES));
      this.processedReplies = stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error('Error loading processed replies:', error);
      this.processedReplies = new Set();
    }
  }

  private async saveProcessedReplies(): Promise<void> {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES);
      await AsyncStorage.setItem(key, JSON.stringify(Array.from(this.processedReplies)));
    } catch (error) {
      console.error('Error saving processed replies:', error);
    }
  }

  private async clearProcessedReplies(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES));
      this.processedReplies.clear();
    } catch (error) {
      console.error('Error clearing processed replies:', error);
    }
  }

  private generateReplyId(feedback: FeedbackData): string {
    const time = feedback.responded_at ? new Date(feedback.responded_at).getTime() : Date.now();
    return `feedback_${feedback.id}_${time}`;
  }

  private getUserStorageKey(key: string): string {
    return this.currentUserId ? `${key}_user_${this.currentUserId}` : key;
  }

  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.getUserStorageKey(STORAGE_KEYS.NOTIFICATIONS));
      if (!stored) return;

      const storedNotifications = JSON.parse(stored);
      this.notifications = this.currentUserId 
        ? storedNotifications.filter((notif: AppNotification) => {
            const userId = getNotificationUserId(notif);
            return !userId || userId === this.currentUserId;
          })
        : storedNotifications;
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      if (this.notifications.length > MAX_NOTIFICATIONS) {
        this.notifications = this.notifications
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_NOTIFICATIONS);
      }
      
      const key = this.getUserStorageKey(STORAGE_KEYS.NOTIFICATIONS);
      await AsyncStorage.setItem(key, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  private isDuplicateNotification(notification: CreateNotificationInput): boolean {
    const fiveMinutesAgo = Date.now() - 300000;
    
    return this.notifications.some((existing: AppNotification) => {
      if (notification.type === 'feedback_reply' && existing.type === 'feedback_reply') {
        const existingId = (existing.data as any)?.feedbackId;
        const newId = (notification.data as any)?.feedbackId;
        return existingId && newId && existingId === newId;
      } 
      
      return existing.type === notification.type &&
             existing.title === notification.title &&
             existing.message === notification.message &&
             existing.timestamp > fiveMinutesAgo &&
             getNotificationUserId(existing) === getNotificationUserId({ ...notification, id: '', timestamp: 0, isRead: false } as AppNotification);
    });
  }

  async addNotification(notification: CreateNotificationInput): Promise<void> {
    if (!ALLOWED_TYPES.includes(notification.type as any) || 
        BLOCKED_TITLES.some(blocked => notification.title.includes(blocked))) {
      return;
    }

    if (this.isDuplicateNotification(notification)) {
      return;
    }

    const newNotification: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      isRead: false,
      data: setNotificationUserId(notification.data, this.currentUserId)
    } as AppNotification;

    this.notifications.unshift(newNotification);
    await this.saveNotifications();
    this.notifyListeners();
  }

  async addSpotAvailableNotification(spotsAvailable: number, floor?: number, spotIds?: string[]): Promise<void> {
    if (spotsAvailable <= 0 || !spotIds || spotIds.length === 0) return;

    let title: string;
    let message: string;

    if (spotIds.length === 1) {
      title = 'Parking Spot Available!';
      message = floor 
        ? `Spot ${spotIds[0]} is now available on Floor ${floor}. Tap to view parking map.`
        : `Spot ${spotIds[0]} is now available. Tap to view parking map.`;
    } else if (spotIds.length <= 3) {
      title = 'Parking Spots Available!';
      const spotList = spotIds.join(', ');
      message = floor 
        ? `Spots ${spotList} are now available on Floor ${floor}. Tap to view parking map.`
        : `Spots ${spotList} are now available. Tap to view parking map.`;
    } else {
      title = 'Multiple Parking Spots Available!';
      const firstSpots = spotIds.slice(0, 2).join(', ');
      message = floor 
        ? `${spotsAvailable} spots available on Floor ${floor} (including ${firstSpots}...). Tap to view parking map.`
        : `${spotsAvailable} spots available (including ${firstSpots}...). Tap to view parking map.`;
    }

    const notification = createSpotAvailableNotification(
      title, message, spotsAvailable, floor, spotIds, this.currentUserId || undefined
    );
    await this.addNotification(notification);
  }

  async addFeedbackReplyNotification(
    feedbackId: number | undefined,
    originalFeedback: string,
    adminReply: string,
    adminName?: string,
    respondedAt?: string
  ): Promise<void> {
    if (!feedbackId) return;

    const replyId = `feedback_${feedbackId}_${respondedAt ? new Date(respondedAt).getTime() : Date.now()}`;
    if (this.processedReplies.has(replyId)) return;

    const notification = createFeedbackReplyNotification(
      'Admin Replied to your Feedback',
      `Reply to your ${originalFeedback.length > 30 ? 'feedback' : `"${originalFeedback.substring(0, 30)}..."`}`,
      feedbackId,
      originalFeedback.substring(0, 200) + (originalFeedback.length > 200 ? '...' : ''),
      adminReply,
      adminName,
      this.currentUserId || undefined
    );

    await this.addNotification(notification);
    this.processedReplies.add(replyId);
    await this.saveProcessedReplies();
  }

  async processFeedbackReplies(feedbackArray: FeedbackData[]): Promise<void> {
    if (!this.currentUserId) {
      console.warn('No current user ID - cannot process feedback replies');
      return;
    }
    try {
      const userFeedback = feedbackArray.filter(feedback => 
        feedback.user_id === this.currentUserId && 
        feedback.admin_response && 
        feedback.responded_at && 
        feedback.id
      );

      for (const feedback of userFeedback) {
        const replyId = this.generateReplyId(feedback);
        if (!this.processedReplies.has(replyId)) {
          await this.addFeedbackReplyNotification(
            feedback.id,
            feedback.message,
            feedback.admin_response!,
            'Admin Team',
            feedback.responded_at
          );
        }
      }
    } catch (error) {
      console.error('Error processing feedback replies:', error);
    }
  }

  async checkForFeedbackReplies(userId: number, feedbackArray?: FeedbackData[]): Promise<void> {
    try {
      if (this.currentUserId !== userId) {
        this.currentUserId = userId;
      }
      
      if (feedbackArray) {
        await this.processFeedbackReplies(feedbackArray);
      }
    } catch (error) {
      console.error('Error checking for feedback replies:', error);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  async markAllAsRead(): Promise<void> {
    let hasChanges = false;
    
    for (const notification of this.notifications) {
      const belongsToUser = !this.currentUserId || 
        !getNotificationUserId(notification) || 
        getNotificationUserId(notification) === this.currentUserId;
        
      if (!notification.isRead && belongsToUser) {
        notification.isRead = true;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index === -1) return;

    const notification = this.notifications[index];
    const belongsToUser = !this.currentUserId || !getNotificationUserId(notification) || 
    getNotificationUserId(notification) === this.currentUserId;
    
    if (belongsToUser) {
      this.notifications.splice(index, 1);
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  async clearAllNotifications(): Promise<void> {
    if (this.currentUserId) {
      this.notifications = this.notifications.filter(n => {
        const notifUserId = getNotificationUserId(n);
        return notifUserId && notifUserId !== this.currentUserId;
      });
    } else {
      this.notifications = [];
    }
    
    await this.saveNotifications();
    this.notifyListeners();
  }

  private isValidNotification = (n: AppNotification): boolean => {
    const isAllowedType = ALLOWED_TYPES.includes(n.type as any);
    const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
    return isAllowedType && belongsToUser;
  };

  getNotifications(): AppNotification[] {
    return this.notifications
      .filter(this.isValidNotification)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead && this.isValidNotification(n)).length;
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    listener(this.getNotifications());
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners(): void {
    const notifications = this.getNotifications();
    for (const listener of this.listeners) {
      try {
        listener(notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    }
  }

  getNotificationsByType(type: AppNotification['type']): AppNotification[] {
    if (!ALLOWED_TYPES.includes(type as any)) return [];
    
    return this.notifications.filter(n => {
      const belongsToUser = !this.currentUserId || 
        !getNotificationUserId(n) || 
        getNotificationUserId(n) === this.currentUserId;
      return n.type === type && belongsToUser;
    });
  }

  getSummary(): { total: number; unread: number; recent: number; feedbackReplies: number; parkingSpots: number } {
    const validNotifications = this.notifications.filter(this.isValidNotification);
    const oneDayAgo = Date.now() - 86400000;
    
    return {
      total: validNotifications.length,
      unread: this.getUnreadCount(),
      recent: validNotifications.filter(n => n.timestamp > oneDayAgo).length,
      feedbackReplies: validNotifications.filter(n => n.type === 'feedback_reply').length,
      parkingSpots: validNotifications.filter(n => n.type === 'spot_available').length
    };
  }

  getFeedbackReplyNotifications(): AppNotification[] {
    return this.getNotificationsByType('feedback_reply');
  }

  getParkingSpotNotifications(): AppNotification[] {
    return this.getNotificationsByType('spot_available');
  }

  getNotificationsForFeedback(feedbackId: number): AppNotification[] {
    return this.notifications.filter(n => {
      const belongsToUser = !this.currentUserId || 
        !getNotificationUserId(n) || 
        getNotificationUserId(n) === this.currentUserId;
      return belongsToUser && 
             n.type === 'feedback_reply' && 
             (n.data as any)?.feedbackId === feedbackId;
    });
  }

  async resetProcessedReplies(): Promise<void> {
    await this.clearProcessedReplies();
  }

  async getDebugInfo(): Promise<any> {
    const keys = {
      notifications: this.getUserStorageKey(STORAGE_KEYS.NOTIFICATIONS),
      lastFeedbackCheck: this.getUserStorageKey(STORAGE_KEYS.FEEDBACK_CHECK),
      processedReplies: this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES)
    };
    
    try {
      const [notifications, lastCheck, processedReplies] = await Promise.all([
        AsyncStorage.getItem(keys.notifications),
        AsyncStorage.getItem(keys.lastFeedbackCheck),
        AsyncStorage.getItem(keys.processedReplies)
      ]);

      const summary = this.getSummary();

      return {
        currentUserId: this.currentUserId,
        storageKeys: keys,
        storedNotifications: notifications ? JSON.parse(notifications).length : 0,
        lastFeedbackCheck: lastCheck ? new Date(parseInt(lastCheck)).toISOString() : 'never',
        processedRepliesCount: this.processedReplies.size,
        activeNotifications: this.notifications.length,
        unreadCount: this.getUnreadCount(),
        summary,
        notificationTypes: {
          parkingSpots: summary.parkingSpots,
          feedbackReplies: summary.feedbackReplies
        }
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        currentUserId: this.currentUserId
      };
    }
  }
}

export const NotificationManager = new NotificationManagerClass();