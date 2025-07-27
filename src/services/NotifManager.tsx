// src/services/NotificationManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification, BaseNotification } from '../types/NotifTypes';

const NOTIFICATIONS_STORAGE_KEY = '@valet_notifications';
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

  // 🔥 UPDATED: Only add parking and feedback notifications (no general/welcome messages)
  async addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
    // 🚫 FILTER OUT: Do not add general notifications (welcome messages, connection status, etc.)
    if (notification.type === 'general') {
      console.log('🚫 General notification filtered out (not added to overlay):', notification.title);
      return;
    }

    // ✅ ONLY ALLOW: parking updates and feedback replies
    if (!['spot_available', 'floor_update', 'feedback_reply'].includes(notification.type)) {
      console.log('🚫 Notification type not supported in overlay:', notification.type);
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

  // Add feedback reply notification
  async addFeedbackReplyNotification(
    feedbackId: number,
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
        feedbackId,
        originalFeedback: originalFeedback.substring(0, 100) + (originalFeedback.length > 100 ? '...' : ''),
        adminReply,
        adminName,
        replyTimestamp: Date.now(),
      },
    });
  }

  // 🔥 UPDATED: Only add spot notifications when NEW spots become available
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

  // 🔥 UPDATED: Only add floor update notifications when there are meaningful changes
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

  // 🔥 REMOVED: Connection status notifications completely removed
  // These will never appear in the notification overlay

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

  // Get all notifications (only parking and feedback)
  getNotifications(): AppNotification[] {
    return [...this.notifications]
      .filter(n => ['spot_available', 'floor_update', 'feedback_reply'].includes(n.type))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get unread count (only parking and feedback)
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

  // Update unread count (only parking and feedback)
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

  // Get notifications by type (only parking and feedback)
  getNotificationsByType(type: AppNotification['type']): AppNotification[] {
    if (!['spot_available', 'floor_update', 'feedback_reply'].includes(type)) {
      return [];
    }
    return this.notifications.filter(n => n.type === type);
  }

  // Check for new feedback replies (call this when app becomes active)
  async checkForFeedbackReplies(userId: number): Promise<void> {
    try {
      // This would typically call your API to check for new feedback replies
      console.log(`✅ Checking for feedback replies for user ${userId}`);
      
      // Example API call structure:
      // const response = await fetch(`https://valet.up.railway.app/api/feedback/replies/${userId}`);
      // const replies = await response.json();
      // 
      // replies.forEach(reply => {
      //   this.addFeedbackReplyNotification(
      //     reply.feedback_id,
      //     reply.original_feedback,
      //     reply.admin_reply,
      //     reply.admin_name
      //   );
      // });
    } catch (error) {
      console.error('Error checking for feedback replies:', error);
    }
  }

  // Get summary for display (only parking and feedback)
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

  // 🔥 NEW: Method to test parking notifications (for development)
  async createTestParkingNotification(): Promise<void> {
    await this.addSpotAvailableNotification(3, 4);
    console.log('🧪 Test parking notification created');
  }

  // 🔥 NEW: Method to test feedback notifications (for development)  
  async createTestFeedbackNotification(): Promise<void> {
    await this.addFeedbackReplyNotification(
      123,
      'Test feedback about parking sensors not working properly',
      'Thank you for your feedback! We have fixed the sensor issue on Floor 4.',
      'Admin Team'
    );
    console.log('🧪 Test feedback notification created');
  }
}

export const NotificationManager = new NotificationManagerClass();