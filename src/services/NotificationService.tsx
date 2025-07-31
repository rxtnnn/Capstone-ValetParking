import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationManager } from '../services/NotifManager';

interface NotificationSettings {
  spotAvailable: boolean;
  floorUpdates: boolean;
  maintenanceAlerts: boolean;
  vibration: boolean;
  sound: boolean;
}

const SETTINGS_KEY = '@valet_notification_settings';
const DEFAULT_VIBRATION = [0, 250, 250, 250];
const DEFAULT_SETTINGS: NotificationSettings = {
  spotAvailable: true,
  floorUpdates: true,
  maintenanceAlerts: false,
  vibration: true,
  sound: true,
};

const CHANNELS = {
  SPOT_AVAILABLE: 'spot-available',
  FLOOR_UPDATES: 'floor-updates',
  FEEDBACK_REPLIES: 'feedback-replies',
  DEFAULT: 'default'
} as const;

class NotificationServiceClass {
  private expoPushToken: string | null = null;

  async initialize(): Promise<void> {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,      
          shouldPlaySound: true,    
          shouldSetBadge: false,  
          shouldShowBanner: true,     
          shouldShowList: true, 
        }),
      });

      await Promise.all([
        Platform.OS === 'android' ? this.createNotificationChannels() : Promise.resolve(),
        this.registerForPushNotifications()
      ]);
    } catch (error) {
      console.error('Error initializing NotificationService:', error);
    }
  }

  private async createNotificationChannels(): Promise<void> {
    const channels = [
      {
        id: CHANNELS.SPOT_AVAILABLE,
        name: 'Parking Spots Available',
        description: 'Notifications when new parking spots become available',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#4CAF50',
      },
      {
        id: CHANNELS.FLOOR_UPDATES,
        name: 'Floor Status Updates',
        description: 'Updates about floor occupancy changes',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#2196F3',
      },
      {
        id: CHANNELS.FEEDBACK_REPLIES,
        name: 'Feedback Replies',
        description: 'Admin replies to your feedback',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#B22020',
      }
    ];

    await Promise.all(
      channels.map(channel =>
        Notifications.setNotificationChannelAsync(channel.id, {
          ...channel,
          vibrationPattern: DEFAULT_VIBRATION,
          sound: 'default',
        })
      )
    );
  }

  private async registerForPushNotifications(): Promise<string | null> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: DEFAULT_VIBRATION,
        lightColor: '#B71C1C',
      });
    }

    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return null;
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
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async showSpotAvailableNotification(spotsAvailable: number, floor?: number): Promise<void> {
    if (spotsAvailable <= 0) return;

    try {
      const settings = await this.getNotificationSettings();
      if (!settings.spotAvailable) return;

      const title = 'Parking Spots Available!';
      const message = floor 
        ? `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available on Floor ${floor}`
        : `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`;

      await Promise.all([
        NotificationManager.addSpotAvailableNotification(spotsAvailable, floor),
        this.showLocalNotification(
          title,
          message,
          { type: 'spot-available', spotsAvailable, floor, timestamp: Date.now() },
          CHANNELS.SPOT_AVAILABLE,
          settings
        )
      ]);
    } catch (error) {
      console.error('Error showing spot notification:', error);
    }
  }

  async showFloorUpdateNotification(
    floor: number, 
    availableSpots: number,
    totalSpots: number,
    previousAvailable?: number
  ): Promise<void> {
    if (availableSpots <= 0 || (previousAvailable !== undefined && availableSpots <= previousAvailable)) {
      return;
    }

    try {
      const settings = await this.getNotificationSettings();
      if (!settings.floorUpdates) return;

      await this.showLocalNotification(
        'Floor Update',
        `Floor ${floor}: ${availableSpots}/${totalSpots} spots available`,
        { type: 'floor-update', floor, availableSpots, totalSpots, timestamp: Date.now() },
        CHANNELS.FLOOR_UPDATES,
        settings
      );
    } catch (error) {
      console.error('Error showing floor update:', error);
    }
  }

  async showConnectionStatusNotification(): Promise<void> {
    // Connection status notifications are disabled
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

      await Promise.all([
        NotificationManager.addFeedbackReplyNotification(feedbackId, originalFeedback, adminReply, adminName),
        this.showLocalNotification(
          title,
          message,
          { 
            type: 'feedback-reply',
            feedbackId,
            originalFeedback: originalFeedback.substring(0, 50) + '...',
            adminReply: adminReply.substring(0, 50) + '...',
            adminName,
            timestamp: Date.now()
          },
          CHANNELS.FEEDBACK_REPLIES,
          settings
        )
      ]);
    } catch (error) {
      console.error('Error showing feedback reply notification:', error);
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
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: data || {},
          sound: settings.sound ? 'default' : undefined,
          vibrate: settings.vibration ? DEFAULT_VIBRATION : undefined,
        },
        trigger: null,
        identifier: `valet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  async showSimpleNotification(title: string, message: string, data?: any): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      await this.showLocalNotification(
        title,
        message,
        data || { type: 'general', timestamp: Date.now() },
        CHANNELS.DEFAULT,
        settings
      );
    } catch (error) {
      console.error('Error showing simple notification:', error);
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
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
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async testNotification(): Promise<void> {
    await this.showSimpleNotification(
      'VALET Test',
      'This is a test notification to verify your settings work!',
      { type: 'test', timestamp: Date.now() }
    );
  }

  async initializeWithManager(): Promise<void> {
    await this.initialize();
    console.log('NotificationService initialized (overlay only shows parking & feedback notifications)');
  }

  async simulateFeedbackReply(
    feedbackId: number = 1,
    originalFeedback: string = 'Test feedback message',
    adminReply: string = 'Thank you for your feedback! We are working on this issue.',
    adminName: string = 'Admin Team'
  ): Promise<void> {
    await this.showFeedbackReplyNotification(feedbackId, originalFeedback, adminReply, adminName);
  }

  async simulateParkingNotifications(): Promise<void> {
    await this.showSpotAvailableNotification(3, 4);
    setTimeout(() => this.showFloorUpdateNotification(4, 5, 42, 2), 2000);
  }

  getStatus() {
    return {
      hasToken: !!this.expoPushToken,
      token: this.expoPushToken?.substring(0, 20) + '...',
      platform: Platform.OS,
      isDevice: Device.isDevice,
      overlayFilter: 'parking & feedback only',
    };
  }

  getNotificationStats() {
    return {
      service: 'NotificationService',
      pushToken: !!this.expoPushToken,
      platform: Platform.OS,
      deviceSupport: Device.isDevice,
      channels: Platform.OS === 'android' ? 3 : 0,
      integrations: ['NotificationManager (filtered)', 'AsyncStorage', 'Expo'],
      overlayTypes: ['spot_available', 'floor_update', 'feedback_reply'],
    };
  }

  async clearNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Promise.all([
          Notifications.deleteNotificationChannelAsync(CHANNELS.SPOT_AVAILABLE),
          Notifications.deleteNotificationChannelAsync(CHANNELS.FLOOR_UPDATES),
          Notifications.deleteNotificationChannelAsync(CHANNELS.FEEDBACK_REPLIES)
        ]);
        console.log('Notification channels cleared');
      } catch (error) {
        console.error('Error clearing notification channels:', error);
      }
    }
  }

  async reset(): Promise<void> {
    try {
      await Promise.all([
        this.clearNotificationChannels(),
        AsyncStorage.removeItem(SETTINGS_KEY)
      ]);
      this.expoPushToken = null;
      console.log('NotificationService reset complete');
    } catch (error) {
      console.error('Error resetting NotificationService:', error);
    }
  }
}

export const NotificationService = new NotificationServiceClass();