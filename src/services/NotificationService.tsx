import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    await Notifications.setNotificationChannelAsync('connection-status', {
      name: 'Connection Status',
      description: 'VALET connection status updates',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 100],
      sound: 'default',
      lightColor: '#B71C1C',
    });
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

  async showSpotAvailableNotification(
    spotsAvailable: number,
    floor?: number
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings.spotAvailable) {
        return;
      }

      const title = 'Parking Spots Available!';
      const message = floor 
        ? `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available on Floor ${floor}`
        : `${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`;

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

  async showFloorUpdateNotification(
    floor: number, 
    availableSpots: number,
    totalSpots: number
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings.floorUpdates) {
        return;
      }

      await this.showLocalNotification(
        'Floor Update',
        `Floor ${floor}: ${availableSpots}/${totalSpots} spots available`,
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

  async showConnectionStatusNotification(isConnected: boolean): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (isConnected) {
        await this.showLocalNotification(
          'VALET Connected',
          'Real-time parking data is now available',
          { 
            type: 'connection-status',
            connected: true,
            timestamp: Date.now()
          },
          'connection-status',
          settings
        );
      } else {
        await this.showLocalNotification(
          'VALET Disconnected',
          'Trying to reconnect to parking data...',
          { 
            type: 'connection-status',
            connected: false,
            timestamp: Date.now()
          },
          'connection-status',
          settings
        );
      }

    } catch (error) {
      console.error('Error showing connection status:', error);
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
          vibrate: settings.vibration ? [0, 250, 250, 250] : undefined,
        },
        trigger: null,
        identifier: `valet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

    } catch (error) {
      console.error('Error scheduling notification:', error);
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

  async testNotification(): Promise<void> {
    const settings = await this.getNotificationSettings();
    
    await this.showLocalNotification(
      'VALET Test',
      'This is a test notification to verify your settings work!',
      { type: 'test', timestamp: Date.now() },
      'default',
      settings
    );
  }

  getStatus() {
    return {
      hasToken: !!this.expoPushToken,
      token: this.expoPushToken?.substring(0, 20) + '...',
      platform: Platform.OS,
      isDevice: Device.isDevice,
    };
  }
}

export const NotificationService = new NotificationServiceClass();