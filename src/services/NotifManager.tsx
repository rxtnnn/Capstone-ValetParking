import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { TokenManager } from '../config/api';
import { AppNotification, CreateNotificationInput, createSpotAvailableNotification, createFeedbackReplyNotification,
  getNotificationUserId, setNotificationUserId, SpotMalfunctionData,
  RfidAlertData, GuestRequestData, LongParkedData } from '../types/NotifTypes';
import { FeedbackData } from '../types/feedback';

const STORAGE_KEYS = {
  NOTIFICATIONS: '@valet_notifications',
  FEEDBACK_CHECK: '@valet_last_feedback_check',
  PROCESSED_REPLIES: '@valet_processed_replies',
  SPOT_NOTIFS_PAUSED: '@valet_spot_notifs_paused',
  RFID_ENTRY_DETECTED: '@valet_rfid_entry_detected',
} as const;

const MAX_NOTIFICATIONS = 100;
const ALLOWED_TYPES = ['spot_available', 'feedback_reply', 'spot_malfunction', 'rfid_alert', 'guest_request', 'long_parked'] as const;
const BLOCKED_TITLES = ['VALET Connected!', 'Connection Established', 'Welcome to VALET', 'System Ready', 'App Initialized'];

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationManagerClass {
  private notifications: AppNotification[] = [];
  private listeners: NotificationListener[] = [];
  private processedReplies = new Set<string>();
  private currentUserId: number | null = null;
  private userChangeListeners: (() => void)[] = [];
  private isInitializing = false;
  private spotNotificationsPaused = true;
  private rfidEntryDetected = false;

  constructor() {
    this.init();
    this.setupUserChangeMonitoring();
  }

  private async init(): Promise<void> {
    this.currentUserId = this.getCurrentUserId();

    await Promise.all([
      this.loadNotifications(),
      this.loadProcessedReplies(),
      this.loadSpotNotificationsPaused(),
      this.loadRfidEntryDetected(),
    ]);
  }

  private async loadSpotNotificationsPaused(): Promise<void> {
    try {
      const userId = this.currentUserId ?? TokenManager.getUser()?.id;
      if (!userId) return;
      const key = `${STORAGE_KEYS.SPOT_NOTIFS_PAUSED}_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      // If no stored value, default to true (paused until RFID entry)
      this.spotNotificationsPaused = stored === null ? true : stored === 'true';
    } catch {
      this.spotNotificationsPaused = true;
    }
  }

  private async saveSpotNotificationsPaused(): Promise<void> {
    try {
      const userId = this.currentUserId ?? TokenManager.getUser()?.id;
      if (!userId) return;
      const key = `${STORAGE_KEYS.SPOT_NOTIFS_PAUSED}_${userId}`;
      await AsyncStorage.setItem(key, String(this.spotNotificationsPaused));
    } catch {

    }
  }

  private async loadRfidEntryDetected(): Promise<void> {
    try {
      const userId = this.currentUserId ?? TokenManager.getUser()?.id;
      if (!userId) return;
      const key = `${STORAGE_KEYS.RFID_ENTRY_DETECTED}_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      this.rfidEntryDetected = stored === 'true';
    } catch {
      this.rfidEntryDetected = false;
    }
  }

  private async saveRfidEntryDetected(): Promise<void> {
    try {
      const userId = this.currentUserId ?? TokenManager.getUser()?.id;
      if (!userId) return;
      const key = `${STORAGE_KEYS.RFID_ENTRY_DETECTED}_${userId}`;
      await AsyncStorage.setItem(key, String(this.rfidEntryDetected));
    } catch {

    }
  }

  private setupUserChangeMonitoring(): void {
    setInterval(() => {
      const newUserId = this.getCurrentUserId();
      if (newUserId !== this.currentUserId && !this.isInitializing) {
        this.handleUserChange(newUserId);
      }
    }, 1000);
  }

  private async handleUserChange(newUserId: number | null): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;
    try {
      this.currentUserId = newUserId;
      this.notifications = [];
      this.processedReplies.clear();
      if (newUserId) {
        await Promise.all([
          this.loadNotifications(),
          this.loadProcessedReplies(),
          this.loadRfidEntryDetected(),
        ]);
        if (!this.rfidEntryDetected) {
          this.spotNotificationsPaused = true;
          await this.saveSpotNotificationsPaused();
        } else {
          await this.loadSpotNotificationsPaused();
        }
      }
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
      
      this.notifications = this.currentUserId 
        ? storedNotifications.filter((notif: AppNotification) => {
            const userId = getNotificationUserId(notif);
            return !userId || userId === this.currentUserId;
          })
        : [];
      this.notifyListeners();      
    } catch (error) {
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
    // spot_available notifications should always be shown — state changes are meaningful
    if (notification.type === 'spot_available') return false;

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

    if (!this.rfidEntryDetected || this.spotNotificationsPaused) {
      return;
    }

    if (!this.currentUserId) {
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

  async addFloorUpdateNotification(floor: number, available: number, total: number, previousAvailable: number): Promise<void> {
    if (!this.currentUserId) return;
    if (!this.rfidEntryDetected || this.spotNotificationsPaused) return;

    const difference = available - previousAvailable;
    const newNotification: AppNotification = {
      id: `floor_update_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'spot_available',
      title: 'Floor Update',
      message: difference > 0
        ? `Floor ${floor}: ${difference} more spot${difference > 1 ? 's' : ''} available (${available}/${total} total)`
        : `Floor ${floor}: ${available}/${total} spots available`,
      timestamp: Date.now(),
      isRead: false,
      priority: 'normal',
      data: { floor, available, total, previousAvailable, userId: this.currentUserId },
    } as unknown as AppNotification;

    this.notifications.unshift(newNotification);
    await this.saveNotifications();
    this.notifyListeners();
  }

  async addMalfunctionNotification(data: SpotMalfunctionData): Promise<void> {
    if (!this.currentUserId) return;

    const newNotification: AppNotification = {
      id: `malfunction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'spot_malfunction',
      title: `⚠️ Spot ${data.spotCode} Malfunctioned`,
      message: `Floor ${data.floor} • Reported by ${data.reportedBy} • ${data.reason}`,
      timestamp: Date.now(),
      isRead: false,
      priority: 'high',
      data: { ...data, userId: this.currentUserId },
    } as AppNotification;

    this.notifications.unshift(newNotification);
    await this.saveNotifications();
    this.notifyListeners();
  }

  async addRfidAlertNotification(data: RfidAlertData): Promise<void> {
    if (!this.currentUserId) return;

    const alertLabels: Record<string, string> = {
      invalid: 'Invalid RFID Detected',
      expired: 'Expired RFID Detected',
      suspended: 'Suspended RFID Detected',
      unknown: 'Unknown Card Detected',
    };

    const newNotification: AppNotification = {
      id: `rfid_alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'rfid_alert',
      title: alertLabels[data.alertType] ?? 'RFID Alert',
      message: `${data.rfidUid} at ${data.readerLocation}${data.userName ? ` — ${data.userName}` : ''}`,
      timestamp: Date.now(),
      isRead: false,
      priority: 'high',
      data: { ...data, userId: this.currentUserId },
    } as AppNotification;

    this.notifications.unshift(newNotification);
    await this.saveNotifications();
    this.notifyListeners();
  }

  async addGuestRequestNotification(data: GuestRequestData): Promise<void> {
    if (!this.currentUserId) return;

    const newNotification: AppNotification = {
      id: `guest_request_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'guest_request',
      title: 'New Guest Access Request',
      message: `${data.guestName} (${data.vehiclePlate}) — ${data.purpose}`,
      timestamp: Date.now(),
      isRead: false,
      priority: 'high',
      data: { ...data, userId: this.currentUserId },
    } as AppNotification;

    this.notifications.unshift(newNotification);
    await this.saveNotifications();
    this.notifyListeners();
  }

  async addLongParkedNotification(data: LongParkedData): Promise<void> {
    if (!this.currentUserId) return;

    const preview = data.vehicles.slice(0, 2).map(v => `${v.vehicle_plate} (${v.hours}h)`).join(', ');
    const message = data.count === 1
      ? `${data.vehicles[0].vehicle_plate} has been parked for ${data.vehicles[0].hours}h`
      : `${data.count} vehicles over 12h: ${preview}${data.count > 2 ? '...' : ''}`;

    const newNotification: AppNotification = {
      id: `long_parked_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'long_parked',
      title: `Long-Parked Vehicle${data.count > 1 ? 's' : ''} Detected`,
      message,
      timestamp: Date.now(),
      isRead: false,
      priority: 'high',
      data: { ...data, userId: this.currentUserId },
    } as AppNotification;

    this.notifications.unshift(newNotification);
    await this.saveNotifications();
    this.notifyListeners();
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

  async checkForFeedbackReplies(userId: number, feedbackArray?: FeedbackData[]): Promise<void> {
    try {
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

  setRfidEntryDetected(detected: boolean): void {
    this.rfidEntryDetected = detected;
    this.saveRfidEntryDetected();
  }

  isRfidEntryDetected(): boolean {
    return this.rfidEntryDetected;
  }

  async pauseSpotNotifications(): Promise<void> {
    this.spotNotificationsPaused = true;
    await this.saveSpotNotificationsPaused();
    Notifications.dismissAllNotificationsAsync();
    Notifications.cancelAllScheduledNotificationsAsync();
  }

  async resumeSpotNotifications(): Promise<void> {
    this.spotNotificationsPaused = false;
    await this.saveSpotNotificationsPaused();
  }

  isSpotNotificationsPaused(): boolean {
    return this.spotNotificationsPaused;
  }

  async syncPausedStateFromStorage(): Promise<boolean> {
    await this.loadSpotNotificationsPaused();
    return this.spotNotificationsPaused;
  }
}

export const NotificationManager = new NotificationManagerClass();