// src/services/NotifManager.ts - Updated to only show parking spots available notifications
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AppNotification, 
  CreateNotificationInput,
  createSpotAvailableNotification,
  createFeedbackReplyNotification,
  getNotificationUserId,
  setNotificationUserId
} from '../types/NotifTypes';
import { FeedbackData } from '../types/feedback';

const NOTIFICATIONS_STORAGE_KEY = '@valet_notifications';
const LAST_FEEDBACK_CHECK_KEY = '@valet_last_feedback_check';
const PROCESSED_FEEDBACK_REPLIES_KEY = '@valet_processed_replies';
const MAX_NOTIFICATIONS = 100;

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationManagerClass {
  private notifications: AppNotification[] = [];
  private listeners: NotificationListener[] = [];
  private unreadCount = 0;
  private currentUserId: number | null = null;
  private processedReplies: Set<string> = new Set();

  constructor() {
    this.loadNotifications();
    this.loadProcessedReplies();
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
      // User logged out - clear all notifications and processed replies
      await this.clearAllNotifications();
      await this.clearProcessedReplies();
      console.log('🚪 User logged out - notifications and tracking cleared');
    } else {
      // User logged in - load their notifications and processed replies
      await this.loadNotifications();
      await this.loadProcessedReplies();
      console.log('🔐 User logged in - loading notifications for user:', userId);
    }
  }

  // Load processed replies tracking
  private async loadProcessedReplies(): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey(PROCESSED_FEEDBACK_REPLIES_KEY);
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const processedArray = JSON.parse(stored);
        this.processedReplies = new Set(processedArray);
        console.log(`📱 Loaded ${this.processedReplies.size} processed replies for user ${this.currentUserId}`);
      } else {
        this.processedReplies = new Set();
      }
    } catch (error) {
      console.error('Error loading processed replies:', error);
      this.processedReplies = new Set();
    }
  }

  // Save processed replies tracking
  private async saveProcessedReplies(): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey(PROCESSED_FEEDBACK_REPLIES_KEY);
      const processedArray = Array.from(this.processedReplies);
      await AsyncStorage.setItem(storageKey, JSON.stringify(processedArray));
    } catch (error) {
      console.error('Error saving processed replies:', error);
    }
  }

  // Clear processed replies tracking
  private async clearProcessedReplies(): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey(PROCESSED_FEEDBACK_REPLIES_KEY);
      await AsyncStorage.removeItem(storageKey);
      this.processedReplies = new Set();
    } catch (error) {
      console.error('Error clearing processed replies:', error);
    }
  }

  // Generate unique reply ID for tracking
  private generateReplyId(feedback: FeedbackData): string {
    const responseTime = feedback.responded_at ? new Date(feedback.responded_at).getTime() : Date.now();
    return `feedback_${feedback.id}_${responseTime}`;
  }

  // User-specific storage keys
  private getUserStorageKey(key: string): string {
    if (this.currentUserId) {
      return `${key}_user_${this.currentUserId}`;
    }
    return key;
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

  // 🔥 UPDATED: Only allow parking spots available and feedback replies
  async addNotification(notification: CreateNotificationInput): Promise<void> {
    // 🔥 UPDATED: Only allow spot_available and feedback_reply (removed floor_update)
    const allowedTypes = ['spot_available', 'feedback_reply'];
    
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

    // Create notification with proper typing and user ID
    const newNotification: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      isRead: false,
      data: setNotificationUserId(notification.data, this.currentUserId)
    } as AppNotification;

    // Enhanced duplicate check
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const isDuplicate = this.notifications.some(existing => {
      const existingUserId = getNotificationUserId(existing);
      const newUserId = getNotificationUserId(newNotification);
      
      // For feedback replies, check by feedback ID instead of just title
      if (notification.type === 'feedback_reply' && existing.type === 'feedback_reply') {
        const existingFeedbackId = (existing.data as any)?.feedbackId;
        const newFeedbackId = (newNotification.data as any)?.feedbackId;
        
        if (existingFeedbackId && newFeedbackId && existingFeedbackId === newFeedbackId) {
          console.log(`🚫 Duplicate feedback reply notification prevented for feedback ID ${newFeedbackId}`);
          return true;
        }
      }
      
      // General duplicate check for other types
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

  // 🔥 UPDATED: Enhanced spot available notification (only parking notification we show)
  async addSpotAvailableNotification(spotsAvailable: number, floor?: number, spotIds?: string[]): Promise<void> {
    if (spotsAvailable <= 0) {
      console.log('🚫 No available spots, notification not created');
      return;
    }

    // 🔥 ENHANCED: Better message format
    const title = 'Parking Spots Available!';
    const message = floor 
      ? `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available on Floor ${floor}. Tap to view parking map.`
      : `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available. Tap to view parking map.`;

    const notification = createSpotAvailableNotification(
      title,
      message,
      spotsAvailable,
      floor,
      spotIds,
      this.currentUserId || undefined
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
    if (!feedbackId) {
      return;
    }

    // Generate unique reply ID for tracking
    const replyId = `feedback_${feedbackId}_${respondedAt ? new Date(respondedAt).getTime() : Date.now()}`;
    
    // Check if we've already processed this reply
    if (this.processedReplies.has(replyId)) {
      return;
    }

    // Enhanced notification with feedback context
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

    // Mark this reply as processed
    this.processedReplies.add(replyId);
    await this.saveProcessedReplies();
  }

  // Process feedback replies and create individual notifications for each
  async processFeedbackReplies(feedbackArray: FeedbackData[]): Promise<void> {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ No current user ID - cannot process feedback replies');
        return;
      }
      // Filter feedback that belongs to current user and has admin responses
      const userFeedbackWithReplies = feedbackArray.filter(feedback => {
        // Must belong to current user
        if (feedback.user_id !== this.currentUserId) {
          return false;
        }

        // Must have admin response and valid ID
        if (!feedback.admin_response || !feedback.responded_at || !feedback.id) {
          return false;
        }

        return true;
      });


      // Process each feedback reply individually
      let newNotificationsCount = 0;
      
      for (const feedback of userFeedbackWithReplies) {
        const replyId = this.generateReplyId(feedback);
        
        // Check if we've already processed this specific reply
        if (!this.processedReplies.has(replyId)) {
          await this.addFeedbackReplyNotification(
            feedback.id,
            feedback.message,
            feedback.admin_response!,
            'Admin Team',
            feedback.responded_at
          );
          newNotificationsCount++;
        } 
      }

    } catch (error) {
      console.error('Error processing feedback replies:', error);
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

  // 🔥 UPDATED: Get notifications for current user only (removed floor_update from allowed types)
  getNotifications(): AppNotification[] {
    return [...this.notifications]
      .filter(n => {
        // 🔥 UPDATED: Only allow spot_available and feedback_reply
        const isAllowedType = ['spot_available', 'feedback_reply'].includes(n.type);
        
        // Filter by user ID (if user is logged in)
        const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
        
        return isAllowedType && belongsToUser;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // 🔥 UPDATED: Get unread count for current user only (removed floor_update)
  getUnreadCount(): number {
    return this.notifications
      .filter(n => {
        const isAllowedType = ['spot_available', 'feedback_reply'].includes(n.type);
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
        const isAllowedType = ['spot_available', 'feedback_reply'].includes(n.type);
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

  // 🔥 UPDATED: Get notifications by type for current user (removed floor_update)
  getNotificationsByType(type: AppNotification['type']): AppNotification[] {
    if (!['spot_available', 'feedback_reply'].includes(type)) {
      return [];
    }
    return this.notifications.filter(n => {
      const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
      return n.type === type && belongsToUser;
    });
  }

  // 🔥 UPDATED: Get summary for current user (removed floor_update references)
  getSummary(): { total: number; unread: number; recent: number; feedbackReplies: number; parkingSpots: number } {
    const validNotifications = this.notifications.filter(n => {
      const isAllowedType = ['spot_available', 'feedback_reply'].includes(n.type);
      const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
      return isAllowedType && belongsToUser;
    });
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recent = validNotifications.filter(n => n.timestamp > oneDayAgo).length;
    const feedbackReplies = validNotifications.filter(n => n.type === 'feedback_reply').length;
    const parkingSpots = validNotifications.filter(n => n.type === 'spot_available').length;
    
    return {
      total: validNotifications.length,
      unread: this.getUnreadCount(),
      recent,
      feedbackReplies,
      parkingSpots
    };
  }

  // Get feedback reply notifications specifically
  getFeedbackReplyNotifications(): AppNotification[] {
    return this.getNotificationsByType('feedback_reply');
  }

  // 🔥 NEW: Get parking spot notifications specifically
  getParkingSpotNotifications(): AppNotification[] {
    return this.getNotificationsByType('spot_available');
  }

  // Get notifications for specific feedback ID
  getNotificationsForFeedback(feedbackId: number): AppNotification[] {
    return this.notifications.filter(n => {
      const belongsToUser = !this.currentUserId || !getNotificationUserId(n) || getNotificationUserId(n) === this.currentUserId;
      const isFeedbackReply = n.type === 'feedback_reply';
      const matchesFeedbackId = (n.data as any)?.feedbackId === feedbackId;
      
      return belongsToUser && isFeedbackReply && matchesFeedbackId;
    });
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
      'Admin Team',
      new Date().toISOString()
    );
    console.log('🧪 Test feedback notification created');
  }

  // Reset processed replies (useful for testing)
  async resetProcessedReplies(): Promise<void> {
    await this.clearProcessedReplies();
    console.log('🔄 Processed replies reset for current user');
  }

  // 🔥 UPDATED: Enhanced debug method
  async getDebugInfo(): Promise<any> {
    const userStorageKey = this.getUserStorageKey(NOTIFICATIONS_STORAGE_KEY);
    const feedbackCheckKey = this.getUserStorageKey(LAST_FEEDBACK_CHECK_KEY);
    const processedRepliesKey = this.getUserStorageKey(PROCESSED_FEEDBACK_REPLIES_KEY);
    
    try {
      const [notifications, lastCheck, processedReplies] = await Promise.all([
        AsyncStorage.getItem(userStorageKey),
        AsyncStorage.getItem(feedbackCheckKey),
        AsyncStorage.getItem(processedRepliesKey)
      ]);

      const summary = this.getSummary();

      return {
        currentUserId: this.currentUserId,
        storageKeys: {
          notifications: userStorageKey,
          lastFeedbackCheck: feedbackCheckKey,
          processedReplies: processedRepliesKey
        },
        storedNotifications: notifications ? JSON.parse(notifications).length : 0,
        lastFeedbackCheck: lastCheck ? new Date(parseInt(lastCheck)).toISOString() : 'never',
        processedRepliesCount: this.processedReplies.size,
        activeNotifications: this.notifications.length,
        unreadCount: this.unreadCount,
        summary,
        notificationTypes: {
          parkingSpots: summary.parkingSpots,
          feedbackReplies: summary.feedbackReplies
        }
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