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

      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }

      await this.registerForPushNotifications();
    } catch (error) {
      console.error('Error initializing NotificationService:', error);
    }
  }

  private async createNotificationChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('spot-available', {
      name: 'Parking Spots Available',
      description: 'Notifications when new parking spots become available',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#4CAF50',
    });

    await Notifications.setNotificationChannelAsync('floor-updates', {
      name: 'Floor Status Updates',
      description: 'Updates about floor occupancy changes',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 150, 150],
      sound: 'default',
      lightColor: '#2196F3',
    });

    await Notifications.setNotificationChannelAsync('feedback-replies', {
      name: 'Feedback Replies',
      description: 'Admin replies to your feedback',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#B22020',
    });

    // 🔥 REMOVED: connection-status channel - no longer needed
  }

  private async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#B71C1C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }
      
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        token = tokenData.data;
        this.expoPushToken = token;
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    } else {
      console.warn('Must use physical device for Push Notifications');
    }

    return token;
  }

  // 🔥 ENHANCED: Now also adds to NotificationManager for in-app display
  async showSpotAvailableNotification(
    spotsAvailable: number,
    floor?: number
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings.spotAvailable || spotsAvailable <= 0) {
        return;
      }

      const title = 'Parking Spots Available!';
      const message = floor 
        ? `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available on Floor ${floor}`
        : `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`;

      // Add to NotificationManager for in-app display
      await NotificationManager.addSpotAvailableNotification(spotsAvailable, floor);

      // Show push notification
      await this.showLocalNotification(
        title,
        message,
        { 
          type: 'spot-available',
          spotsAvailable,
          floor,
          timestamp: Date.now()
        },
        'spot-available',
        settings
      );
    } catch (error) {
      console.error('Error showing spot notification:', error);
    }
  }

  // 🔥 ENHANCED: Now also adds to NotificationManager for in-app display
  async showFloorUpdateNotification(
    floor: number, 
    availableSpots: number,
    totalSpots: number,
    previousAvailable?: number
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings.floorUpdates || availableSpots <= 0) {
        return;
      }

      // Only proceed if there's an actual increase in available spots
      if (previousAvailable !== undefined && availableSpots <= previousAvailable) {
        console.log(`Floor ${floor}: No increase in spots, notification skipped`);
        return;
      }

      const title = 'Floor Update';
      const message = `Floor ${floor}: ${availableSpots}/${totalSpots} spots available`;

      // Add to NotificationManager for in-app display
      await NotificationManager.addFloorUpdateNotification(floor, availableSpots, totalSpots, previousAvailable);

      // Show push notification
      await this.showLocalNotification(
        title,
        message,
        { 
          type: 'floor-update', 
          floor, 
          availableSpots,
          totalSpots,
          timestamp: Date.now()
        },
        'floor-updates',
        settings
      );

      console.log(`Floor update sent: Floor ${floor} - ${availableSpots}/${totalSpots}`);
    } catch (error) {
      console.error('Error showing floor update:', error);
    }
  }

  // 🔥 CONNECTION STATUS: Completely disabled - no notifications created
  async showConnectionStatusNotification(isConnected: boolean): Promise<void> {
    // Connection status notifications are completely disabled
    console.log(`Connection status: ${isConnected ? 'connected' : 'disconnected'} - no notification shown`);
    return;
  }

  // Feedback reply notification
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

      // Add to NotificationManager for in-app display
      await NotificationManager.addFeedbackReplyNotification(
        feedbackId,
        originalFeedback,
        adminReply,
        adminName
      );

      // Show push notification
      await this.showLocalNotification(
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
        'feedback-replies',
        settings
      );

      console.log(`Feedback reply notification sent for feedback ${feedbackId}`);
    } catch (error) {
      console.error('Error showing feedback reply notification:', error);
    }
  }

  public async showLocalNotification(
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
          vibrate: settings.vibration ? [0, 250, 250, 250] : undefined,
        },
        trigger: null,
        identifier: `valet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // 🔥 UPDATED: Simple notification - does NOT add to NotificationManager anymore
  public async showSimpleNotification(
    title: string, 
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      // 🚫 DO NOT add general notifications to NotificationManager
      // Only show as push notification, not in overlay
      console.log(`📲 Simple notification (push only, not in overlay): ${title}`);
      
      // Show push notification only
      await this.showLocalNotification(
        title,
        message,
        data || { type: 'general', timestamp: Date.now() },
        'default',
        settings
      );
    } catch (error) {
      console.error('Error showing simple notification:', error);
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed;
      } else {
        const defaultSettings = {
          spotAvailable: true,
          floorUpdates: true,
          maintenanceAlerts: false,
          vibration: true,
          sound: true,
        };
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        spotAvailable: true,
        floorUpdates: true,
        maintenanceAlerts: false,
        vibration: true,
        sound: true,
      };
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
    try {
      if (!Device.isDevice) {
        console.warn('Physical device required for notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const granted = finalStatus === 'granted';
      console.log(`Notification permissions: ${granted ? 'Granted' : 'Denied'}`);
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // 🔥 UPDATED: Test notification only shows as push, not in overlay
  async testNotification(): Promise<void> {
    await this.showSimpleNotification(
      'VALET Test',
      'This is a test notification to verify your settings work!',
      { type: 'test', timestamp: Date.now() }
    );
  }

  async initializeWithManager(): Promise<void> {
    await this.initialize();
    console.log('📱 NotificationService initialized (overlay only shows parking & feedback notifications)');
  }

  // 🔥 NEW: Method to simulate feedback reply (for testing)
  async simulateFeedbackReply(
    feedbackId: number = 1,
    originalFeedback: string = 'Test feedback message',
    adminReply: string = 'Thank you for your feedback! We are working on this issue.',
    adminName: string = 'Admin Team'
  ): Promise<void> {
    await this.showFeedbackReplyNotification(feedbackId, originalFeedback, adminReply, adminName);
  }

  // 🔥 NEW: Method to simulate parking notifications (for testing)
  async simulateParkingNotifications(): Promise<void> {
    // Simulate spot available
    await this.showSpotAvailableNotification(3, 4);
    
    // Simulate floor update after 2 seconds
    setTimeout(async () => {
      await this.showFloorUpdateNotification(4, 5, 42, 2);
    }, 2000);
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
      channels: Platform.OS === 'android' ? 3 : 0, // Removed connection-status channel
      integrations: ['NotificationManager (filtered)', 'AsyncStorage', 'Expo'],
      overlayTypes: ['spot_available', 'floor_update', 'feedback_reply'],
    };
  }

  async clearNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.deleteNotificationChannelAsync('spot-available');
        await Notifications.deleteNotificationChannelAsync('floor-updates');
        await Notifications.deleteNotificationChannelAsync('feedback-replies');
        console.log('🗑️ Notification channels cleared');
      } catch (error) {
        console.error('Error clearing notification channels:', error);
      }
    }
  }

  async reset(): Promise<void> {
    try {
      await this.clearNotificationChannels();
      await AsyncStorage.removeItem(SETTINGS_KEY);
      this.expoPushToken = null;
      console.log('🔄 NotificationService reset complete');
    } catch (error) {
      console.error('Error resetting NotificationService:', error);
    }
  }
}

export const NotificationService = new NotificationServiceClass();