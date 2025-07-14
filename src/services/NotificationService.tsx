// src/services/NotificationService.ts
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
      alert('Error initializing NotificationService:'+ error);
    }
  }

  private async createNotificationChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('parking-updates', {
      name: 'VALET Parking Updates',
      description: 'Real-time notifications for parking spot availability',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B71C1C', 
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('floor-updates', {
      name: 'Floor Status Updates',
      description: 'Updates about floor occupancy changes',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 150, 150],
      lightColor: '#B71C1C',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('maintenance-alerts', {
      name: 'Maintenance Alerts',
      description: 'Important system maintenance notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 300, 300],
      lightColor: '#FF9800',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('emergency-alerts', {
      name: 'Emergency Alerts',
      description: 'Critical emergency notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500],
      lightColor: '#F44336',
      sound: 'default',
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
        alert('Push notification permissions not granted');
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

  async showLocalNotification(
    title: string, 
    message: string, 
    data?: any,
    channelId: string = 'parking-updates'
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings.spotAvailable && channelId === 'parking-updates') return;
      if (!settings.floorUpdates && channelId === 'floor-updates') return;
      if (!settings.maintenanceAlerts && channelId === 'maintenance-alerts') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: data || {},
          sound: settings.sound ? 'default' : undefined,
          vibrate: settings.vibration ? [0, 250, 250, 250] : undefined,
        },
        trigger: null, 
        identifier: `valet_${Date.now()}`,
      });

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showSpotAvailableNotification(
    floor: number, 
    spotNumber: string, 
    sensorId: number
  ): Promise<void> {
    await this.showLocalNotification(
      'Parking Spot Available!',
      `Spot ${spotNumber} on Floor ${floor} is now available`,
      { 
        type: 'spot-available', 
        floor, 
        spotNumber, 
        sensorId,
        timestamp: Date.now()
      },
      'parking-updates'
    );
  }

  async showFloorUpdateNotification(
    floor: number, 
    availableSpots: number,
    totalSpots: number
  ): Promise<void> {
    const percentage = Math.round((availableSpots / totalSpots) * 100);
    
    await this.showLocalNotification(
      'Floor Update',
      `Floor ${floor}: ${availableSpots}/${totalSpots} spots available (${percentage}% free)`,
      { 
        type: 'floor-update', 
        floor, 
        availableSpots,
        totalSpots,
        percentage,
        timestamp: Date.now()
      },
      'floor-updates'
    );
  }

  async showMaintenanceAlert(message: string, priority: 'low' | 'high' = 'low'): Promise<void> {
    const title = priority === 'high' ? '⚠️ Urgent Maintenance Alert' : '🔧 Maintenance Notice';
    
    await this.showLocalNotification(
      title,
      message,
      { 
        type: 'maintenance-alert', 
        priority,
        timestamp: Date.now()
      },
      'maintenance-alerts'
    );
  }

  async showSensorAlertNotification(sensorId: number, issue: string): Promise<void> {
    await this.showLocalNotification(
      'Sensor Alert',
      `Sensor ${sensorId}: ${issue}`,
      { 
        type: 'sensor-alert', 
        sensorId, 
        issue,
        timestamp: Date.now()
      },
      'maintenance-alerts'
    );
  }

  async showParkingReminderNotification(
    spotNumber: string, 
    timeLeft: number
  ): Promise<void> {
    await this.showLocalNotification(
      'Parking Reminder',
      `Your parking at spot ${spotNumber} expires in ${timeLeft} minutes`,
      { 
        type: 'parking-reminder', 
        spotNumber, 
        timeLeft,
        timestamp: Date.now()
      },
      'parking-updates'
    );
  }

  async showWelcomeNotification(): Promise<void> {
    await this.showLocalNotification(
      '🚗 Welcome to VALET!',
      'Your smart parking assistant is ready to help you find spots at USJ-R',
      { 
        type: 'welcome',
        timestamp: Date.now()
      },
      'parking-updates'
    );
  }

  async showConnectionStatusNotification(isConnected: boolean): Promise<void> {
    if (isConnected) {
      await this.showLocalNotification(
        'Connected to VALET',
        'Real-time parking data is now available',
        { 
          type: 'connection-status',
          connected: true,
          timestamp: Date.now()
        },
        'parking-updates'
      );
    } else {
      await this.showLocalNotification(
        'Connection Issue',
        'Unable to connect to parking sensors. Using cached data.',
        { 
          type: 'connection-status',
          connected: false,
          timestamp: Date.now()
        },
        'maintenance-alerts'
      );
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  async cancelNotificationsByType(type: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === type) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
    } catch (error) {
      console.error('Error cancelling notifications by type:', error);
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      return settings ? JSON.parse(settings) : {
        spotAvailable: true,
        floorUpdates: true,
        maintenanceAlerts: true,
        vibration: true,
        sound: true,
      };
    } catch (error) {
      return {
        spotAvailable: true,
        floorUpdates: true,
        maintenanceAlerts: true,
        vibration: true,
        sound: true,
      };
    }
  }

  async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      alert('💾 Notification settings saved:'+ settings);
    } catch (error) {
      alert('Error saving notification settings:'+ error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      return false;
    }
  }

  async getPermissionStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error getting permission status:', error);
      return 'undetermined';
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  addNotificationReceivedListener(listener: (notification: any) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(listener: (response: any) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  removeNotificationSubscription(subscription: any) {
    return Notifications.removeNotificationSubscription(subscription);
  }
}

export const NotificationService = new NotificationServiceClass();