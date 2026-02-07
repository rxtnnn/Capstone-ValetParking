import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenManager } from '../config/api';
import { AppNotification, CreateNotificationInput, createSpotAvailableNotification, createFeedbackReplyNotification,
  getNotificationUserId, setNotificationUserId } from '../types/NotifTypes';
import { FeedbackData } from '../types/feedback';

const STORAGE_KEYS = {
  NOTIFICATIONS: '@valet_notifications',
  FEEDBACK_CHECK: '@valet_last_feedback_check',
  PROCESSED_REPLIES: '@valet_processed_replies' 
} as const;

const MAX_NOTIFICATIONS = 100;
const ALLOWED_TYPES = ['spot_available', 'feedback_reply'] as const;
const BLOCKED_TITLES = ['VALET Connected!', 'Connection Established', 'Welcome to VALET', 'System Ready', 'App Initialized'];

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationManagerClass {
  private notifications: AppNotification[] = [];
  private listeners: NotificationListener[] = [];
  private processedReplies = new Set<string>();
  private currentUserId: number | null = null;
  private userChangeListeners: (() => void)[] = [];
  private isInitializing = false; // FIX: Prevent race conditions
  private spotNotificationsPaused = false; // Flag to pause spot notifications when user has parked

  constructor() {
    this.init();
    this.setupUserChangeMonitoring();
  }

  private async init(): Promise<void> {
    this.currentUserId = this.getCurrentUserId();
    
    await Promise.all([
      this.loadNotifications(),
      this.loadProcessedReplies()
    ]);
  }

  private setupUserChangeMonitoring(): void {
    setInterval(() => {
      const newUserId = this.getCurrentUserId();
      if (newUserId !== this.currentUserId && !this.isInitializing) {
        this.handleUserChange(newUserId);
      }
    }, 1000);
  }

  // FIX: Improved user change handling
  private async handleUserChange(newUserId: number | null): Promise<void> {
    if (this.isInitializing) return; // Prevent multiple simultaneous changes
    
    this.isInitializing = true;
    const oldUserId = this.currentUserId;
    
    try {
      // Update current user immediately to prevent mismatch warnings
      this.currentUserId = newUserId;

      // Clear current data
      this.notifications = [];
      this.processedReplies.clear();

      // Load data for new user
      if (newUserId) {
        await Promise.all([
          this.loadNotifications(),
          this.loadProcessedReplies()
        ]);
      } 

      // Notify all listeners about the change
      this.notifyListeners();
      this.notifyUserChangeListeners();
      
    } catch (error) {
      console.log('Error during user change:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  private getCurrentUserId(): number | null {
    const user = TokenManager.getUser();
    return user?.id || null;
  }

  private getCurrentUserInfo(): { id: number | null; name?: string; email?: string } {
    const user = TokenManager.getUser();
    return {
      id: user?.id || null,
      name: user?.name,
      email: user?.email
    };
  }

  // FIX: Better user ID setting with immediate update
  async setCurrentUserId(userId: number | null): Promise<void> {
    if (userId !== this.currentUserId && !this.isInitializing) {
      await this.handleUserChange(userId);
    }
  }

  private async loadProcessedReplies(): Promise<void> {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES);
      if (!key) {
        this.processedReplies = new Set();
        return;
      }
      
      const stored = await AsyncStorage.getItem(key);
      this.processedReplies = stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.log('Error loading processed replies:', error);
      this.processedReplies = new Set();
    }
  }

  private async saveProcessedReplies(): Promise<void> {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES);
      if (!key) return;
      
      await AsyncStorage.setItem(key, JSON.stringify(Array.from(this.processedReplies)));
    } catch (error) {
      console.log('Error saving processed replies:', error);
    }
  }

  private async clearProcessedReplies(): Promise<void> {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES);
      if (key) {
        await AsyncStorage.removeItem(key);
      }
      this.processedReplies.clear();
    } catch (error) {
      console.log('Error clearing processed replies:', error);
    }
  }

  private generateReplyId(feedback: FeedbackData): string {
    const time = feedback.responded_at ? new Date(feedback.responded_at).getTime() : Date.now();
    return `feedback_${feedback.id}_${time}`;
  }

  private getUserStorageKey(key: string): string | null {
    if (!this.currentUserId) return null;
    return `${key}_user_${this.currentUserId}`;
  }

  private async loadNotifications(): Promise<void> {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.NOTIFICATIONS);
      if (!key) {
        this.notifications = [];
        this.notifyListeners();
        return;
      }

      const stored = await AsyncStorage.getItem(key);
      if (!stored) {
        this.notifications = [];
        this.notifyListeners();
        return;
      }

      const storedNotifications = JSON.parse(stored);
      
      // Filter notifications for current user
      this.notifications = this.currentUserId 
        ? storedNotifications.filter((notif: AppNotification) => {
            const userId = getNotificationUserId(notif);
            return !userId || userId === this.currentUserId;
          })
        : [];
      this.notifyListeners();      
    } catch (error) {
      console.log('Error loading notifications:', error);
      this.notifications = [];
      this.notifyListeners();
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.NOTIFICATIONS);
      if (!key) return;

      if (this.notifications.length > MAX_NOTIFICATIONS) {
        this.notifications = this.notifications
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_NOTIFICATIONS);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(this.notifications));
    } catch (error) {
      console.log('Error saving notifications:', error);
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
             getNotificationUserId(existing) === this.currentUserId;
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

    if (!this.currentUserId) {
      console.warn('No current user - cannot add notification');
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

    // Don't send spot notifications if user has parked
    if (this.spotNotificationsPaused) {
      return;
    }

    if (!this.currentUserId) {
      console.warn('No current user - cannot add spot notification');
      return;
    }

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
      title, message, spotsAvailable, floor, spotIds, this.currentUserId
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

    if (!this.currentUserId) {
      console.warn('No current user - cannot add feedback notification');
      return;
    }

    const replyId = `feedback_${feedbackId}_${respondedAt ? new Date(respondedAt).getTime() : Date.now()}`;
    if (this.processedReplies.has(replyId)) return;

    const notification = createFeedbackReplyNotification(
      'Admin Replied to your Feedback',
      `Reply to your ${originalFeedback.length > 30 ? 'feedback' : `"${originalFeedback.substring(0, 30)}..."`}`,
      feedbackId,
      originalFeedback.substring(0, 200) + (originalFeedback.length > 200 ? '...' : ''),
      adminReply,
      adminName,
      this.currentUserId
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
      console.log('Error processing feedback replies:', error);
    }
  }

  // FIX: Improved feedback replies checking with better user validation
  async checkForFeedbackReplies(userId: number, feedbackArray?: FeedbackData[]): Promise<void> {
    try {
      // FIX: Accept the requested userId and update if different
      if (this.currentUserId !== userId) {
        await this.setCurrentUserId(userId);
      }
      
      if (feedbackArray) {
        await this.processFeedbackReplies(feedbackArray);
      }
    } catch (error) {
      console.log('Error checking for feedback replies:', error);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      const notifUserId = getNotificationUserId(notification);
      
      if (!notifUserId || notifUserId === this.currentUserId) {
        notification.isRead = true;
        await this.saveNotifications();
        this.notifyListeners();
      }
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

  subscribeToUserChanges(listener: () => void): () => void {
    this.userChangeListeners.push(listener);
    
    return () => {
      const index = this.userChangeListeners.indexOf(listener);
      if (index > -1) this.userChangeListeners.splice(index, 1);
    };
  }

  private notifyListeners(): void {
    const notifications = this.getNotifications();
    for (const listener of this.listeners) {
      try {
        listener(notifications);
      } catch (error) {
        console.log('Error in notification listener:', error);
      }
    }
  }

  private notifyUserChangeListeners(): void {
    for (const listener of this.userChangeListeners) {
      try {
        listener();
      } catch (error) {
        console.log('Error in user change listener:', error);
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
    const userInfo = this.getCurrentUserInfo();
    
    const keys = {
      notifications: this.getUserStorageKey(STORAGE_KEYS.NOTIFICATIONS) || 'No user',
      lastFeedbackCheck: this.getUserStorageKey(STORAGE_KEYS.FEEDBACK_CHECK) || 'No user',
      processedReplies: this.getUserStorageKey(STORAGE_KEYS.PROCESSED_REPLIES) || 'No user'
    };
    
    try {
      const summary = this.getSummary();

      return {
        currentUser: {
          id: this.currentUserId,
          name: userInfo.name,
          email: userInfo.email
        },
        isInitializing: this.isInitializing,
        storageKeys: keys,
        activeNotifications: this.notifications.length,
        unreadCount: this.getUnreadCount(),
        summary,
        notificationTypes: {
          parkingSpots: summary.parkingSpots,
          feedbackReplies: summary.feedbackReplies
        },
        tokenManager: {
          hasUser: !!TokenManager.getUser(),
          hasToken: !!TokenManager.getToken(),
          userId: TokenManager.getUser()?.id
        }
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        currentUser: {
          id: this.currentUserId,
          name: userInfo.name,
          email: userInfo.email
        },
        isInitializing: this.isInitializing
      };
    }
  }
  async onUserLogin(): Promise<void> {
    const newUserId = this.getCurrentUserId();
    
    if (newUserId !== this.currentUserId) {
      await this.handleUserChange(newUserId);
    }
  }
  
  async onUserLogout(): Promise<void> {
    await this.handleUserChange(null);
  }

  getCurrentUserContext(): { id: number | null; name?: string; isAuthenticated: boolean } {
    const userInfo = this.getCurrentUserInfo();
    return {
      id: this.currentUserId,
      name: userInfo.name,
      isAuthenticated: !!this.currentUserId
    };
  }
  
  async forceRefresh(): Promise<void> {
    await this.loadNotifications();
    await this.loadProcessedReplies();
    this.notifyListeners();
  }

  // Pause spot notifications when user has parked
  pauseSpotNotifications(): void {
    this.spotNotificationsPaused = true;
  }

  // Resume spot notifications when user leaves or wants notifications again
  resumeSpotNotifications(): void {
    this.spotNotificationsPaused = false;
  }

  // Check if spot notifications are paused
  isSpotNotificationsPaused(): boolean {
    return this.spotNotificationsPaused;
  }
}

export const NotificationManager = new NotificationManagerClass();