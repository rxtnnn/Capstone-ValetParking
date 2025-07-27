// src/services/NotifManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification, BaseNotification } from '../types/NotifTypes';
import { FeedbackData } from '../types/feedback';

const NOTIFICATIONS_STORAGE_KEY = '@valet_notifications';
const LAST_FEEDBACK_CHECK_KEY = '@valet_last_feedback_check';
const MAX_NOTIFICATIONS = 50; // Keep only last 50 notifications

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationManagerClass {
  private notifications: AppNotification[] = [];
  private listeners: NotificationListener[] = [];
  private unreadCount = 0;

  constructor() {
    this.loadNotifications();
  }

  // Load notifications from storage
  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.updateUnreadCount();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Save notifications to storage
  private async saveNotifications(): Promise<void> {
    try {
      // Keep only the most recent notifications
      if (this.notifications.length > MAX_NOTIFICATIONS) {
        this.notifications = this.notifications
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_NOTIFICATIONS);
      }
      
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // ✅ FIXED: Allow feedback replies along with parking notifications
  async addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
    // 🎯 ONLY ALLOW: parking updates and feedback replies (no maintenance for now)
    // 🚫 EXCLUDE: general notifications (connection status, welcome messages, etc.)
    const allowedTypes = ['spot_available', 'floor_update', 'feedback_reply'];
    
    if (!allowedTypes.includes(notification.type)) {
      console.log('🚫 Notification type filtered out from overlay:', notification.type, notification.title);
      return;
    }

    // 🚫 EXTRA FILTER: Block specific unwanted messages by title/content
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

    const newNotification: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      isRead: false,
    } as AppNotification;

    // Check for duplicate notifications (same type and similar content within 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const isDuplicate = this.notifications.some(existing => 
      existing.type === newNotification.type &&
      existing.title === newNotification.title &&
      existing.timestamp > fiveMinutesAgo
    );

    if (isDuplicate) {
      console.log('🚫 Duplicate notification prevented:', newNotification.title);
      return;
    }

    this.notifications.unshift(newNotification);
    this.updateUnreadCount();
    await this.saveNotifications();
    this.notifyListeners();

    console.log(`📱 New notification added to overlay: ${newNotification.title}`);
  }

  // ✅ FIXED: Handle optional feedback ID
  async addFeedbackReplyNotification(
    feedbackId: number | undefined,
    originalFeedback: string,
    adminReply: string,
    adminName?: string
  ): Promise<void> {
    await this.addNotification({
      type: 'feedback_reply',
      title: 'Admin Reply Received',
      message: `Your feedback has been responded to by ${adminName || 'Admin'}`,
      priority: 'high',
      data: {
        feedbackId: feedbackId || 0, // ✅ FIXED: Handle undefined ID
        originalFeedback: originalFeedback.substring(0, 100) + (originalFeedback.length > 100 ? '...' : ''),
        adminReply,
        adminName,
        replyTimestamp: Date.now(),
      },
    });
  }

  // ✅ NEW: Process feedback array and create notifications for new replies
  async processFeedbackReplies(feedbackArray: FeedbackData[]): Promise<void> {
    try {
      // Get last check time
      const lastCheckTime = await this.getLastFeedbackCheckTime();
      const currentTime = Date.now();

      // Filter feedback that has admin responses added after last check
      const newReplies = feedbackArray.filter(feedback => {
        if (!feedback.admin_response || !feedback.responded_at) {
          return false;
        }

        const responseTime = new Date(feedback.responded_at).getTime();
        return responseTime > lastCheckTime;
      });

      console.log(`📱 Found ${newReplies.length} new feedback replies since last check`);

      // Create notifications for new replies
      for (const feedback of newReplies) {
        await this.addFeedbackReplyNotification(
          feedback.id, // ✅ FIXED: Can handle undefined ID now
          feedback.message,
          feedback.admin_response!,
          'Admin Team' // You can extract this from your API if available
        );
      }

      // Update last check time
      await this.updateLastFeedbackCheckTime(currentTime);

    } catch (error) {
      console.error('Error processing feedback replies:', error);
    }
  }

  // Get last feedback check time
  private async getLastFeedbackCheckTime(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(LAST_FEEDBACK_CHECK_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error getting last feedback check time:', error);
      return 0;
    }
  }

  // Update last feedback check time
  private async updateLastFeedbackCheckTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_FEEDBACK_CHECK_KEY, timestamp.toString());
    } catch (error) {
      console.error('Error updating last feedback check time:', error);
    }
  }

  // Add spot available notification
  async addSpotAvailableNotification(spotsAvailable: number, floor?: number, spotIds?: string[]): Promise<void> {
    // Only create notification if spots are actually available (> 0)
    if (spotsAvailable <= 0) {
      console.log('🚫 No available spots, notification not created');
      return;
    }

    await this.addNotification({
      type: 'spot_available',
      title: 'Parking Spots Available!',
      message: floor 
        ? `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available on Floor ${floor}`
        : `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`,
      priority: 'high',
      data: {
        spotsAvailable,
        floor,
        spotIds,
      },
    });
  }

  // Add floor update notification
  async addFloorUpdateNotification(
    floor: number, 
    availableSpots: number, 
    totalSpots: number,
    previousAvailable?: number
  ): Promise<void> {
    // Only create notification if there's an actual increase in available spots
    if (previousAvailable !== undefined && availableSpots <= previousAvailable) {
      console.log(`🚫 Floor ${floor}: No increase in available spots (${availableSpots} vs ${previousAvailable}), notification not created`);
      return;
    }

    // Only notify if there are actually spots available
    if (availableSpots <= 0) {
      console.log(`🚫 Floor ${floor}: No available spots, notification not created`);
      return;
    }

    const changeText = previousAvailable !== undefined 
      ? availableSpots > previousAvailable 
        ? `(+${availableSpots - previousAvailable})`
        : ''
      : '';

    await this.addNotification({
      type: 'floor_update',
      title: `Floor ${floor} Update`,
      message: `${availableSpots}/${totalSpots} spots available ${changeText}`.trim(),
      priority: 'normal',
      data: {
        floor,
        availableSpots,
        totalSpots,
        previousAvailable,
      },
    });
  }

  // ✅ REMOVED: Maintenance alert method to avoid TypeScript errors
  // Only keeping parking and feedback notifications for now

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

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.isRead) {
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
      this.notifications.splice(index, 1);
      this.updateUnreadCount();
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    this.unreadCount = 0;
    await this.saveNotifications();
    this.notifyListeners();
  }

  // Get all notifications (parking and feedback only)
  getNotifications(): AppNotification[] {
    return [...this.notifications]
      .filter(n => ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get unread count (parking and feedback only)
  getUnreadCount(): number {
    return this.notifications
      .filter(n => !n.isRead && ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type))
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

  // Update unread count (parking and feedback only)
  private updateUnreadCount(): void {
    this.unreadCount = this.notifications
      .filter(n => !n.isRead && ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type))
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

  // Get notifications by type (parking and feedback only)
  getNotificationsByType(type: AppNotification['type']): AppNotification[] {
    if (!['spot_available', 'floor_update', 'feedback_reply'].includes(type)) {
      return [];
    }
    return this.notifications.filter(n => n.type === type);
  }

  // ✅ ENHANCED: Check for new feedback replies with better integration
  async checkForFeedbackReplies(userId: number, feedbackArray?: FeedbackData[]): Promise<void> {
    try {
      console.log(`✅ Checking for feedback replies for user ${userId}`);
      
      if (feedbackArray) {
        // If feedback array is provided, process it directly
        await this.processFeedbackReplies(feedbackArray);
      } else {
        // If no array provided, you could make an API call here
        // Example API call structure:
        // const response = await fetch(`https://valet.up.railway.app/api/feedback/replies/${userId}`);
        // const replies = await response.json();
        // await this.processFeedbackReplies(replies);
        console.log('💡 Tip: Pass feedbackArray to checkForFeedbackReplies() for immediate processing');
      }
    } catch (error) {
      console.error('Error checking for feedback replies:', error);
    }
  }

  // Get summary for display (parking and feedback only)
  getSummary(): { total: number; unread: number; recent: number } {
    const validNotifications = this.notifications.filter(n => 
      ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type)
    );
    
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
      123, // ✅ FIXED: Now explicitly pass a number
      'Test feedback about parking sensors not working properly',
      'Thank you for your feedback! We have fixed the sensor issue on Floor 4.',
      'Admin Team'
    );
    console.log('🧪 Test feedback notification created');
  }

  // ✅ NEW: Reset last feedback check time (useful for testing)
  async resetFeedbackCheckTime(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LAST_FEEDBACK_CHECK_KEY);
      console.log('🔄 Feedback check time reset');
    } catch (error) {
      console.error('Error resetting feedback check time:', error);
    }
  }
}

export const NotificationManager = new NotificationManagerClass();