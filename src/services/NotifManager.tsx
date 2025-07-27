// src/services/NotifManager.ts - Updated with proper TypeScript types
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AppNotification, 
  CreateNotificationInput,
  createSpotAvailableNotification,
  createFloorUpdateNotification,
  createFeedbackReplyNotification,
  getNotificationUserId,
  setNotificationUserId
} from '../types/NotifTypes';
import { FeedbackData } from '../types/feedback';

const NOTIFICATIONS_STORAGE_KEY = '@valet_notifications';
const LAST_FEEDBACK_CHECK_KEY = '@valet_last_feedback_check';
const MAX_NOTIFICATIONS = 50; // Keep only last 50 notifications

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationManagerClass {
  private notifications: AppNotification[] = [];
  private listeners: NotificationListener[] = [];
  private unreadCount = 0;
  private currentUserId: number | null = null;

  constructor() {
    this.loadNotifications();
    this.getCurrentUserId();
  }

  // Get and set current user ID
  private async getCurrentUserId(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('valet_user_data');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUserId = user.id || null;
        console.log('👤 NotificationManager - Current user ID:', this.currentUserId);
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
  }

  // Set user ID explicitly (useful for login/logout)
  async setCurrentUserId(userId: number | null): Promise<void> {
    this.currentUserId = userId;
    
    if (userId === null) {
      // User logged out - clear all notifications
      await this.clearAllNotifications();
      console.log('🚪 User logged out - notifications cleared');
    } else {
      // User logged in - load their notifications
      await this.loadNotifications();
      console.log('🔐 User logged in - loading notifications for user:', userId);
    }
  }

  // User-specific storage keys
  private getUserStorageKey(key: string): string {
    if (this.currentUserId) {
      return `${key}_user_${this.currentUserId}`;
    }
    return key; // Fallback for when user ID is not available
  }

  // Load notifications for current user only
  private async loadNotifications(): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey(NOTIFICATIONS_STORAGE_KEY);
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const storedNotifications = JSON.parse(stored);
        
        // Filter notifications for current user
        if (this.currentUserId) {
          this.notifications = storedNotifications.filter((notif: AppNotification) => {
            const notifUserId = getNotificationUserId(notif);
            return !notifUserId || notifUserId === this.currentUserId;
          });
        } else {
          this.notifications = storedNotifications;
        }
        
        this.updateUnreadCount();
        this.notifyListeners();
        
        console.log(`📱 Loaded ${this.notifications.length} notifications for user ${this.currentUserId}`);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Save notifications with user-specific key
  private async saveNotifications(): Promise<void> {
    try {
      // Keep only the most recent notifications
      if (this.notifications.length > MAX_NOTIFICATIONS) {
        this.notifications = this.notifications
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_NOTIFICATIONS);
      }
      
      const storageKey = this.getUserStorageKey(NOTIFICATIONS_STORAGE_KEY);
      await AsyncStorage.setItem(storageKey, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // 🔥 UPDATED: Type-safe notification addition
  async addNotification(notification: CreateNotificationInput): Promise<void> {
    // Only allow parking updates and feedback replies
    const allowedTypes = ['spot_available', 'floor_update', 'feedback_reply'];
    
    if (!allowedTypes.includes(notification.type)) {
      console.log('🚫 Notification type filtered out from overlay:', notification.type, notification.title);
      return;
    }

    // Block unwanted messages by title/content
    const blockedTitles = [
      'VALET Connected!',
      'Connection Established',
      'Welcome to VALET',
      'System Ready',
      'App Initialized'
    ];
    
    if (blockedTitles.some(blocked => notification.title.includes(blocked))) {
      console.log('🚫 Blocked notification by title:', notification.title);
      return;
    }

    // 🔥 UPDATED: Create notification with proper typing and user ID
    const newNotification: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      isRead: false,
      data: setNotificationUserId(notification.data, this.currentUserId)
    } as AppNotification;

    // Check for duplicate notifications (same type and similar content within 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const isDuplicate = this.notifications.some(existing => {
      const existingUserId = getNotificationUserId(existing);
      const newUserId = getNotificationUserId(newNotification);
      
      return existing.type === newNotification.type &&
             existing.title === newNotification.title &&
             existing.timestamp > fiveMinutesAgo &&
             existingUserId === newUserId;
    });

    if (isDuplicate) {
      console.log('🚫 Duplicate notification prevented:', newNotification.title);
      return;
    }

    this.notifications.unshift(newNotification);
    this.updateUnreadCount();
    await this.saveNotifications();
    this.notifyListeners();

    console.log(`📱 New notification added for user ${this.currentUserId}: ${newNotification.title}`);
  }

  // 🔥 UPDATED: Type-safe spot available notification
  async addSpotAvailableNotification(spotsAvailable: number, floor?: number, spotIds?: string[]): Promise<void> {
    if (spotsAvailable <= 0) {
      console.log('🚫 No available spots, notification not created');
      return;
    }

    const notification = createSpotAvailableNotification(
      'Parking Spots Available!',
      floor 
        ? `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available on Floor ${floor}`
        : `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`,
      spotsAvailable,
      floor,
      spotIds,
      this.currentUserId || undefined
    );

    await this.addNotification(notification);
  }

  // 🔥 UPDATED: Type-safe floor update notification
  async addFloorUpdateNotification(
    floor: number, 
    availableSpots: number, 
    totalSpots: number,
    previousAvailable?: number
  ): Promise<void> {
    if (previousAvailable !== undefined && availableSpots <= previousAvailable) {
      console.log(`🚫 Floor ${floor}: No increase in available spots, notification not created`);
      return;
    }

    if (availableSpots <= 0) {
      console.log(`🚫 Floor ${floor}: No available spots, notification not created`);
      return;
    }

    const changeText = previousAvailable !== undefined 
      ? availableSpots > previousAvailable 
        ? `(+${availableSpots - previousAvailable})`
        : ''
      : '';

    const notification = createFloorUpdateNotification(
      `Floor ${floor} Update`,
      `${availableSpots}/${totalSpots} spots available ${changeText}`.trim(),
      floor,
      availableSpots,
      totalSpots,
      previousAvailable,
      this.currentUserId || undefined
    );

    await this.addNotification(notification);
  }

  // 🔥 UPDATED: Type-safe feedback reply notification
  async addFeedbackReplyNotification(
    feedbackId: number | undefined,
    originalFeedback: string,
    adminReply: string,
    adminName?: string
  ): Promise<void> {
    const notification = createFeedbackReplyNotification(
      'Admin Reply Received',
      `Your feedback has been responded to by ${adminName || 'Admin'}`,
      feedbackId || 0,
      originalFeedback.substring(0, 100) + (originalFeedback.length > 100 ? '...' : ''),
      adminReply,
      adminName,
      this.currentUserId || undefined
    );

    await this.addNotification(notification);
  }

  // Enhanced feedback reply processing with user validation
  async processFeedbackReplies(feedbackArray: FeedbackData[]): Promise<void> {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ No current user ID - cannot process feedback replies');
        return;
      }

      // Get last check time for this specific user
      const lastCheckTime = await this.getLastFeedbackCheckTime();
      const currentTime = Date.now();

      // Filter feedback that belongs to current user and has new admin responses
      const userFeedbackWithNewReplies = feedbackArray.filter(feedback => {
        // Must belong to current user
        if (feedback.user_id !== this.currentUserId) {
          return false;
        }

        // Must have admin response
        if (!feedback.admin_response || !feedback.responded_at) {
          return false;
        }

        // Must be newer than last check
        const responseTime = new Date(feedback.responded_at).getTime();
        return responseTime > lastCheckTime;
      });

      console.log(`📱 Found ${userFeedbackWithNewReplies.length} new feedback replies for user ${this.currentUserId}`);

      // Create notifications for new replies
      for (const feedback of userFeedbackWithNewReplies) {
        await this.addFeedbackReplyNotification(
          feedback.id,
          feedback.message,
          feedback.admin_response!,
          'Admin Team'
        );
      }

      // Update last check time for this user
      await this.updateLastFeedbackCheckTime(currentTime);

    } catch (error) {
      console.error('Error processing feedback replies:', error);
    }
  }

  // User-specific feedback check time
  private async getLastFeedbackCheckTime(): Promise<number> {
    try {
      const storageKey = this.getUserStorageKey(LAST_FEEDBACK_CHECK_KEY);
      const stored = await AsyncStorage.getItem(storageKey);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error getting last feedback check time:', error);
      return 0;
    }
  }

  private async updateLastFeedbackCheckTime(timestamp: number): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey(LAST_FEEDBACK_CHECK_KEY);
      await AsyncStorage.setItem(storageKey, timestamp.toString());
    } catch (error) {
      console.error('Error updating last feedback check time:', error);
    }
  }

  // Enhanced checkForFeedbackReplies with API integration
  async checkForFeedbackReplies(userId: number, feedbackArray?: FeedbackData[]): Promise<void> {
    try {
      // Set current user if not already set
      if (this.currentUserId !== userId) {
        this.currentUserId = userId;
      }

      console.log(`✅ Checking for feedback replies for user ${userId}`);
      
      if (feedbackArray) {
        // If feedback array is provided, process it directly
        await this.processFeedbackReplies(feedbackArray);
      } else {
        console.log('💡 Tip: Pass feedbackArray to checkForFeedbackReplies() for immediate processing');
      }
    } catch (error) {
      console.error('Error checking for feedback replies:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.updateUnreadCount();
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Mark all notifications as read for current user
  async markAllAsRead(): Promise<void> {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      // Only mark as read if it belongs to current user and is unread
      const belongsToUser = !this.currentUserId || !getNotificationUserId(notification) || getNotificationUserId(notification) === this.currentUserId;
      if (!notification.isRead && belongsToUser) {
        notification.isRead = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.updateUnreadCount();
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      // Only delete if it belongs to current user
      const notification = this.notifications[index];
      const belongsToUser = !this.currentUserId || !getNotificationUserId(notification) || getNotificationUserId(notification) === this.currentUserId;
      
      if (belongsToUser) {
        this.notifications.splice(index, 1);
        this.updateUnreadCount();
        await this.saveNotifications();
        this.notifyListeners();
      }
    }
  }

  // Clear notifications for current user only
  async clearAllNotifications(): Promise<void> {
    if (this.currentUserId) {
      // Only clear notifications for current user
      this.notifications = this.notifications.filter(n => {
        const notifUserId = getNotificationUserId(n);
        return notifUserId && notifUserId !== this.currentUserId;
      });
    } else {
      // If no user ID, clear all
      this.notifications = [];
    }
    
    this.unreadCount = 0;
    await this.saveNotifications();
    this.notifyListeners();
  }

  // Get notifications for current user only
  getNotifications(): AppNotification[] {
    return [...this.notifications]
      .filter(n => {
        // Filter by allowed types
        const isAllowedType = ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type);
        
        // Filter by user ID (if user is logged in)
        const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
        
        return isAllowedType && belongsToUser;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get unread count for current user only
  getUnreadCount(): number {
    return this.notifications
      .filter(n => {
        const isAllowedType = ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type);
        const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
        return !n.isRead && isAllowedType && belongsToUser;
      })
      .length;
  }

  // Subscribe to notification updates
  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    
    // Send current notifications immediately
    listener(this.getNotifications());
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Update unread count for current user
  private updateUnreadCount(): void {
    this.unreadCount = this.notifications
      .filter(n => {
        const isAllowedType = ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type);
        const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
        return !n.isRead && isAllowedType && belongsToUser;
      })
      .length;
  }

  // Notify all listeners
  private notifyListeners(): void {
    const notifications = this.getNotifications();
    this.listeners.forEach(listener => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Get notifications by type for current user
  getNotificationsByType(type: AppNotification['type']): AppNotification[] {
    if (!['spot_available', 'floor_update', 'feedback_reply'].includes(type)) {
      return [];
    }
    return this.notifications.filter(n => {
      const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
      return n.type === type && belongsToUser;
    });
  }

  // Get summary for current user
  getSummary(): { total: number; unread: number; recent: number } {
    const validNotifications = this.notifications.filter(n => {
      const isAllowedType = ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type);
      const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
      return isAllowedType && belongsToUser;
    });
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recent = validNotifications.filter(n => n.timestamp > oneDayAgo).length;
    
    return {
      total: validNotifications.length,
      unread: this.getUnreadCount(),
      recent,
    };
  }

  // Method to test parking notifications (for development)
  async createTestParkingNotification(): Promise<void> {
    await this.addSpotAvailableNotification(3, 4);
    console.log('🧪 Test parking notification created');
  }

  // Method to test feedback notifications (for development)  
  async createTestFeedbackNotification(): Promise<void> {
    await this.addFeedbackReplyNotification(
      123,
      'Test feedback about parking sensors not working properly',
      'Thank you for your feedback! We have fixed the sensor issue on Floor 4.',
      'Admin Team'
    );
    console.log('🧪 Test feedback notification created');
  }

  // Reset last feedback check time for current user
  async resetFeedbackCheckTime(): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey(LAST_FEEDBACK_CHECK_KEY);
      await AsyncStorage.removeItem(storageKey);
      console.log('🔄 Feedback check time reset for current user');
    } catch (error) {
      console.error('Error resetting feedback check time:', error);
    }
  }


  // Debug method to see all stored data
  async getDebugInfo(): Promise<any> {
    const userStorageKey = this.getUserStorageKey(NOTIFICATIONS_STORAGE_KEY);
    const feedbackCheckKey = this.getUserStorageKey(LAST_FEEDBACK_CHECK_KEY);
    
    try {
      const [notifications, lastCheck] = await Promise.all([
        AsyncStorage.getItem(userStorageKey),
        AsyncStorage.getItem(feedbackCheckKey)
      ]);

      return {
        currentUserId: this.currentUserId,
        storageKeys: {
          notifications: userStorageKey,
          lastFeedbackCheck: feedbackCheckKey
        },
        storedNotifications: notifications ? JSON.parse(notifications).length : 0,
        lastFeedbackCheck: lastCheck ? new Date(parseInt(lastCheck)).toISOString() : 'never',
        activeNotifications: this.notifications.length,
        unreadCount: this.unreadCount,
        summary: this.getSummary()
      };
    } catch (error) {
      return {
        error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error),
        currentUserId: this.currentUserId
      };
    }
  }
}

export const NotificationManager = new NotificationManagerClass();