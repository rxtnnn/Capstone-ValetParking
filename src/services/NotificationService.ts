import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenManager } from '../config/api';
import apiClient from '../config/api';

export interface NotificationSettings {
  spotAvailable: boolean;
  floorUpdates: boolean;
  vibration: boolean;
  sound: boolean;
}

const DEFAULT_VIBRATION = [0, 250, 250, 250];
const DEFAULT_SETTINGS: NotificationSettings = {
  spotAvailable: true,
  floorUpdates: true,
  vibration: true,
  sound: true,
};

const CHANNELS = {
  SPOT_AVAILABLE: 'spot-available',
  FLOOR_UPDATES: 'floor-updates',
  FEEDBACK_REPLIES: 'feedback-replies',
  RFID_ALERTS: 'rfid-alerts',
  GUEST_REQUESTS: 'guest-requests',
  DEFAULT: 'default'
} as const;

class NotificationServiceClass {
  private expoPushToken: string | null = null;

  async initialize(): Promise<void> {
    try {
      // FIX 1: Add missing properties to NotificationBehavior
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const settings = await this.getNotificationSettings();
          return {
            shouldShowAlert: true,
            shouldPlaySound: settings.sound,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });

      if (Platform.OS === 'android' || Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            android: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('Push notification permissions not granted');
          return;
        }
      }

      await Promise.all([
        Platform.OS === 'android' ? this.createNotificationChannels() : Promise.resolve(),
        this.registerPushNotif()
      ]);
    } catch (error) {
      console.log('Error initializing NotificationService:', error);
    }
  }

   private async createNotificationChannels(): Promise<void> {
    const settings = await this.getNotificationSettings();
    
    const channels = [
      {
        id: CHANNELS.SPOT_AVAILABLE,
        name: 'Parking Spots Available',
        description: 'Notifications when new parking spots become available',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#4CAF50',
        vibrationPattern: settings.vibration ? DEFAULT_VIBRATION : [0],
        enableVibrate: settings.vibration,
        sound: settings.sound ? 'default' : undefined, // FIX: Proper sound setting
        enableLights: true,
      },
      {
        id: CHANNELS.FLOOR_UPDATES,
        name: 'Floor Status Updates',
        description: 'Updates about floor occupancy changes',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#2196F3',
        vibrationPattern: settings.vibration ? DEFAULT_VIBRATION : [0],
        enableVibrate: settings.vibration,
        sound: settings.sound ? 'default' : undefined,
        enableLights: true,
      },
      {
        id: CHANNELS.FEEDBACK_REPLIES,
        name: 'Feedback Replies',
        description: 'Admin replies to your feedback',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#B22020',
        vibrationPattern: settings.vibration ? DEFAULT_VIBRATION : [0],
        enableVibrate: settings.vibration,
        sound: settings.sound ? 'default' : undefined,
        enableLights: true,
      },
      {
        id: CHANNELS.RFID_ALERTS,
        name: 'RFID Security Alerts',
        description: 'Alerts for invalid or unregistered RFID scans',
        importance: Notifications.AndroidImportance.MAX,
        lightColor: '#FF0000',
        vibrationPattern: settings.vibration ? [0, 500, 200, 500] : [0],
        enableVibrate: settings.vibration,
        sound: settings.sound ? 'default' : undefined,
        enableLights: true,
      },
      {
        id: CHANNELS.GUEST_REQUESTS,
        name: 'Guest Access Requests',
        description: 'New guest access requests pending approval',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#FF9800',
        vibrationPattern: settings.vibration ? DEFAULT_VIBRATION : [0],
        enableVibrate: settings.vibration,
        sound: settings.sound ? 'default' : undefined,
        enableLights: true,
      }
    ];

    await Promise.all(
      channels.map(channel =>
        Notifications.setNotificationChannelAsync(channel.id, channel)
      )
    );
  }

   async updateNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      await this.createNotificationChannels();
    }
  }

  private async registerPushNotif(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return null;
    }

    if (Platform.OS === 'android') {
      const settings = await this.getNotificationSettings();
      
      await Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: settings.vibration ? DEFAULT_VIBRATION : [0],
        lightColor: '#B71C1C',
        enableVibrate: settings.vibration,
        sound: settings.sound ? 'default' : undefined, // FIX: Proper sound setting
        enableLights: true,
      });
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      const finalStatus = existingStatus !== 'granted' 
        ? (await Notifications.requestPermissionsAsync()).status 
        : existingStatus;
      
      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      this.expoPushToken = tokenData.data;
      return tokenData.data;
    } catch (error) {
      console.log('Error getting push token:', error);
      return null;
    }
  }

  private getUserStorageKey(): string {
    const user = TokenManager.getUser();
    const userId = user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return `valet_notification_settings_${userId}`;
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const key = this.getUserStorageKey();
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as NotificationSettings) };
      }
    } catch (e) {
      console.log('Load settings error:', e);
    }
    return DEFAULT_SETTINGS;
  }

  async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await this.saveSettingsLocally(settings);
      await this.updateNotificationChannels();
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: settings.sound,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      
    } catch (error) {
      throw new Error('Failed to save notification settings');
    }
  }

  private async saveSettingsLocally(settings: NotificationSettings): Promise<void> {
    const key = this.getUserStorageKey();
    await AsyncStorage.setItem(key, JSON.stringify(settings));
  }

  private async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await this.saveSettingsLocally(settings);
    } catch (error) {
      console.log('Error saving notification settings locally:', error);
      throw error;
    }
  }


  async clearUserSettings(): Promise<void> {
    try {
      const storageKey = this.getUserStorageKey();
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.log('Error clearing notification settings:', error);
    }
  }

  async showSpotAvailableNotificationSmart(
    spotsAvailable: number, 
    floor?: number, 
    spotIds?: string[],
    forceShow: boolean = false
  ): Promise<void> {
    if (spotsAvailable <= 0) return;

    try {
      const settings = await this.getNotificationSettings();
      if (!settings.spotAvailable && !forceShow) return;

      let title: string;
      let message: string;

      if (spotIds && spotIds.length > 0) {
        if (spotIds.length === 1) {
          title = 'New Parking Spot Available!';
          message = floor 
            ? `Spot ${spotIds[0]} just became available on Floor ${floor}`
            : `Spot ${spotIds[0]} just became available`;
        } else if (spotIds.length <= 3) {
          title = 'New Parking Spots Available!';
          const spotList = spotIds.join(', ');
          message = floor 
            ? `Spots ${spotList} just became available on Floor ${floor}`
            : `Spots ${spotList} just became available`;
        } else {
          title = 'Multiple New Spots Available!';
          const firstSpots = spotIds.slice(0, 2).join(', ');
          message = floor 
            ? `${spotsAvailable} new spots on Floor ${floor} (including ${firstSpots}...)`
            : `${spotsAvailable} new spots available (including ${firstSpots}...)`;
        }
      } else {
        title = 'New Parking Spots Available!';
        message = floor 
          ? `${spotsAvailable} new spot${spotsAvailable > 1 ? 's' : ''} available on Floor ${floor}`
          : `${spotsAvailable} new spot${spotsAvailable > 1 ? 's' : ''} available`;
      }

      const notificationData = { 
        type: 'spot-available', 
        spotsAvailable, 
        floor, 
        spotIds: spotIds || [],
        timestamp: Date.now(),
        uniqueId: `${Date.now()}_${Math.random()}`,
        isNewUpdate: true,
        userId: TokenManager.getUser()?.id
      };

      await this.showLocalNotification(
        title,
        message,
        notificationData,
        CHANNELS.SPOT_AVAILABLE,
        settings
      );
    } catch (error) {
      console.log('Error showing spot notification:', error);
    }
  }

  async showFloorUpdateNotification(
    floor: number, 
    availableSpots: number,
    totalSpots: number,
    previousAvailable?: number
  ): Promise<void> {
    if (availableSpots <= 0) return;

    try {
      const settings = await this.getNotificationSettings();
      if (!settings.floorUpdates) return;

      let title = 'Floor Update';
      let message: string;

      if (previousAvailable !== undefined) {
        const difference = availableSpots - previousAvailable;
        if (difference > 0) {
          message = `Floor ${floor}: ${difference} more spot${difference > 1 ? 's' : ''} available (${availableSpots}/${totalSpots} total)`;
        } else {
          message = `Floor ${floor}: ${availableSpots}/${totalSpots} spots available`;
        }
      } else {
        message = `Floor ${floor}: ${availableSpots}/${totalSpots} spots available`;
      }

      const notificationData = {
        type: 'floor-update', 
        floor, 
        availableSpots, 
        totalSpots, 
        previousAvailable,
        timestamp: Date.now(),
        uniqueId: `floor_${floor}_${Date.now()}_${Math.random()}`,
        userId: TokenManager.getUser()?.id
      };

      await this.showLocalNotification(
        title,
        message,
        notificationData,
        CHANNELS.FLOOR_UPDATES,
        settings
      );
    } catch (error) {
      console.log('Error showing floor update:', error);
    }
  }

  async showFeedbackReplyNotification(
    feedbackId: number,
    originalFeedback: string,
    adminReply: string,
    adminName?: string
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      const title = 'Admin Reply Received';
      const message = `Your feedback has been responded to by ${adminName || 'Admin'}`;

      await this.showLocalNotification(
        title,
        message,
        {
          type: 'feedback-reply',
          feedbackId,
          originalFeedback: originalFeedback.substring(0, 50) + '...',
          adminReply: adminReply.substring(0, 50) + '...',
          adminName,
          timestamp: Date.now(),
          userId: TokenManager.getUser()?.id
        },
        CHANNELS.FEEDBACK_REPLIES,
        settings
      );
    } catch (error) {
      console.log('Error showing feedback reply notification:', error);
    }
  }

  // RFID Alert Notifications - For Security Personnel
  async showRfidAlertNotification(
    alertType: 'invalid' | 'expired' | 'suspended' | 'unknown',
    rfidUid: string,
    readerLocation: string,
    additionalInfo?: {
      userName?: string;
      vehiclePlate?: string;
      message?: string;
    }
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();

      const alertMessages: Record<string, { title: string; message: string }> = {
        invalid: {
          title: 'Invalid RFID Detected',
          message: `Unregistered card ${rfidUid} at ${readerLocation}`,
        },
        expired: {
          title: 'Expired RFID Detected',
          message: `Expired card ${rfidUid} at ${readerLocation}${additionalInfo?.userName ? ` - ${additionalInfo.userName}` : ''}`,
        },
        suspended: {
          title: 'Suspended RFID Detected',
          message: `Suspended card ${rfidUid} at ${readerLocation}${additionalInfo?.userName ? ` - ${additionalInfo.userName}` : ''}`,
        },
        unknown: {
          title: 'Unknown Card Detected',
          message: `Unknown card ${rfidUid} scanned at ${readerLocation}`,
        },
      };

      const { title, message } = alertMessages[alertType] || alertMessages.unknown;

      await this.showLocalNotification(
        title,
        additionalInfo?.message || message,
        {
          type: 'rfid-alert',
          alertType,
          rfidUid,
          readerLocation,
          userName: additionalInfo?.userName,
          vehiclePlate: additionalInfo?.vehiclePlate,
          timestamp: Date.now(),
          userId: TokenManager.getUser()?.id,
        },
        CHANNELS.RFID_ALERTS,
        settings
      );
    } catch (error) {
      console.log('Error showing RFID alert notification:', error);
    }
  }

  // Guest Request Notifications - For Security Personnel
  async showGuestRequestNotification(
    guestName: string,
    vehiclePlate: string,
    purpose: string,
    guestId?: string
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      const title = 'New Guest Access Request';
      const message = `${guestName} (${vehiclePlate}) - ${purpose}`;

      await this.showLocalNotification(
        title,
        message,
        {
          type: 'guest-request',
          guestName,
          vehiclePlate,
          purpose,
          guestId,
          timestamp: Date.now(),
          userId: TokenManager.getUser()?.id,
        },
        CHANNELS.GUEST_REQUESTS,
        settings
      );
    } catch (error) {
      console.log('Error showing guest request notification:', error);
    }
  }

  private async showLocalNotification(
    title: string, 
    message: string, 
    data: any,
    channelId: string,
    settings: NotificationSettings
  ): Promise<void> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      const notificationContent: Notifications.NotificationContentInput = {
        title,
        body: message,
        data: data || {},
        sound: settings.sound ? 'default' : false, // FIX: Explicit sound setting
        vibrate: settings.vibration ? DEFAULT_VIBRATION : [0], // FIX: Explicit vibration
      };

      // FIX 5: Use proper identifier and trigger
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
        identifier: `valet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      console.log('Notification scheduled with settings:', {
        sound: settings.sound,
        vibration: settings.vibration,
        channel: channelId
      });
      
    } catch (error) {
      console.log('Error scheduling notification:', error);
    }
  }

  async showSimpleNotification(title: string, message: string, data?: any): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      await this.showLocalNotification(
        title,
        message,
        data || { type: 'general', timestamp: Date.now(), userId: TokenManager.getUser()?.id },
        CHANNELS.DEFAULT,
        settings
      );
    } catch (error) {
      console.log('Error showing simple notification:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Physical device required for notifications');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      const finalStatus = existingStatus !== 'granted' 
        ? (await Notifications.requestPermissionsAsync()).status 
        : existingStatus;
      
      return finalStatus === 'granted';
    } catch (error) {
      console.log('Error requesting permissions:', error);
      return false;
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async checkNotificationPermissions(): Promise<{
    granted: boolean;
    canPlaySound: boolean;
    android?: {
      importance: number;
    };
  }> {
    const { status, android } = await Notifications.getPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canPlaySound: Platform.OS === 'android' ? false : true,
      android: Platform.OS === 'android' ? {
        importance: android?.importance ?? 0,
      } : undefined,
    };
  }

  async initializeWithManager(): Promise<void> {
    await this.initialize();
  }
  
  async showSpotAvailableNotification(
    spotsAvailable: number, 
    floor?: number, 
    spotIds?: string[]
  ): Promise<void> {
    return this.showSpotAvailableNotificationSmart(spotsAvailable, floor, spotIds, false);
  }
  
  async simulateParkingNotifications(): Promise<void> {
    await this.showSpotAvailableNotification(1, 4, ['4B1']);
    setTimeout(() => this.showSpotAvailableNotification(3, 4, ['4B2', '4B3', '4C1']), 2000);
    setTimeout(() => this.showFloorUpdateNotification(4, 5, 42, 2), 4000);
  }

  getStatus() {
    const user = TokenManager.getUser();
    return {
      hasToken: !!this.expoPushToken,
      token: this.expoPushToken?.substring(0, 20) + '...',
      platform: Platform.OS,
      isDevice: Device.isDevice,
      currentUser: user ? `${user.name} (ID: ${user.id})` : 'Not logged in',
      overlayFilter: 'parking & feedback only',
    };
  }

  getNotificationStats() {
    const user = TokenManager.getUser();
    return {
      service: 'NotificationService',
      pushToken: !!this.expoPushToken,
      platform: Platform.OS,
      deviceSupport: Device.isDevice,
      channels: Platform.OS === 'android' ? 3 : 0,
      integrations: ['NotificationManager (filtered)', 'TokenManager', 'Dynamic API'],
      overlayTypes: ['spot_available', 'feedback_reply'],
      currentUser: user ? `${user.name} (${user.id})` : 'None',
      userSpecific: true,
    };
  }

  async resetToDefaults(): Promise<void> {
    await this.saveNotificationSettings(DEFAULT_SETTINGS);
  }

  // enable/disable all notifications at once for current user
  async setAllNotifications(enabled: boolean): Promise<void> {
    const settings: NotificationSettings = {
      spotAvailable: enabled,
      floorUpdates: enabled,
      vibration: enabled,
      sound: enabled,
    };
    
    await this.saveNotificationSettings(settings);
  }

  //check if user has any notifs enabled
  async hasNotificationsEnabled(): Promise<boolean> {
    try {
      const settings = await this.getNotificationSettings();
      return Object.values(settings).some(enabled => enabled === true);
    } catch {
      return false;
    }
  }

  getCurrentSettingsKey(): string | null {
    try {
      return this.getUserStorageKey();
    } catch {
      return null;
    }
  }

  async clearNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Promise.all([
          Notifications.deleteNotificationChannelAsync(CHANNELS.SPOT_AVAILABLE),
          Notifications.deleteNotificationChannelAsync(CHANNELS.FLOOR_UPDATES),
          Notifications.deleteNotificationChannelAsync(CHANNELS.FEEDBACK_REPLIES)
        ]);
      } catch (error) {
        console.log('Error clearing notification channels:', error);
      }
    }
  }

  async getStorageInfo(): Promise<{ key: string; hasSettings: boolean; settingsPreview?: any }> {
    try {
      const key = this.getUserStorageKey();
      const stored = await AsyncStorage.getItem(key);
      
      return {
        key,
        hasSettings: !!stored,
        settingsPreview: stored ? JSON.parse(stored) : null
      };
    } catch (error) {
      return {
        key: 'Error getting key',
        hasSettings: false,
        settingsPreview: null
      };
    }
  }

  async syncWithServer(): Promise<void> {
    try {
      const localSettings = await this.getNotificationSettings();
      await this.saveSettings(localSettings);
    } catch (error) {
      console.log('Failed to sync settings with server:', error);
    }
  }

  // ----------------------------------------
  // Push Token Backend Sync
  // ----------------------------------------

  /**
   * Send the Expo push token to the backend for push notifications
   * Should be called after user login
   */
  async syncPushTokenWithBackend(): Promise<boolean> {
    try {
      // Get or register the push token
      let token = this.expoPushToken;
      if (!token) {
        token = await this.registerPushNotif();
      }

      if (!token) {
        console.log('No push token available to sync');
        return false;
      }

      // Send to backend
      const response = await apiClient.post('/user/push-token', {
        expo_push_token: token,
      });

      if (response.data?.success) {
        console.log('Push token synced with backend successfully');
        return true;
      }

      console.log('Failed to sync push token:', response.data?.message);
      return false;
    } catch (error: any) {
      // Don't fail silently - log the error but don't crash
      console.log('Error syncing push token with backend:', error?.message || error);
      return false;
    }
  }

  /**
   * Remove the push token from the backend
   * Should be called on user logout
   */
  async removePushTokenFromBackend(): Promise<boolean> {
    try {
      const response = await apiClient.delete('/user/push-token');

      if (response.data?.success) {
        console.log('Push token removed from backend successfully');
        return true;
      }

      console.log('Failed to remove push token:', response.data?.message);
      return false;
    } catch (error: any) {
      // Don't fail on logout - just log it
      console.log('Error removing push token from backend:', error?.message || error);
      return false;
    }
  }
}

export { NotificationServiceClass };
export default new NotificationServiceClass();