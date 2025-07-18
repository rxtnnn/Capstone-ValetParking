// src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  spotAvailable: boolean;
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
    await Notifications.setNotificationChannelAsync('floor-updates', {
      name: 'Floor Status Updates',
      description: 'Updates about floor occupancy changes',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 150, 150],
      sound: 'default',
    });
  }

  private async registerForPushNotifications(): Promise<string | null> { //obtain unique push token
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
        const tokenData = await Notifications.getExpoPushTokenAsync({ //return unique push token
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
    channelId: string = 'floor-updates'
  ): Promise<void> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings.spotAvailable && channelId === 'floor-updates') return;

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

  async showFloorUpdateNotification(
    floor: number, 
    availableSpots: number,
    totalSpots: number
  ): Promise<void> {
    
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
      'floor-updates'
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
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> { //retrieve notif settings from local storage
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      return settings ? JSON.parse(settings) : {
        spotAvailable: true,
        vibration: true,
        sound: true,
      };
    } catch (error) {
      return {
        spotAvailable: true,
        vibration: true,
        sound: true,
      };
    }
  }

  async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      alert('Notification settings saved:'+ settings);
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

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const NotificationService = new NotificationServiceClass();