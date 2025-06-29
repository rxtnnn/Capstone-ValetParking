// src/services/ParkingService.ts (Expo version)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from '@react-native-community/netinfo';

interface ParkingSpace {
  id: number;
  sensor_id: number;
  is_occupied: boolean;
  distance_cm: number;
  timestamp: string;
  location: string;
}

interface ParkingSpot {
  id: string;
  position: { x: number; y: number };
  isOccupied: boolean;
  isReserved: boolean;
  spotNumber: string;
  sensorId: number;
  distanceCm?: number;
  lastUpdated: string;
}

interface FloorData {
  floor: number;
  spots: ParkingSpot[];
  availableCount: number;
  totalCount: number;
}

interface ParkingData {
  totalSpots: number;
  availableSpots: number;
  floors: Array<{
    floor: number;
    total: number;
    available: number;
  }>;
}

class ParkingServiceClass {
  private apiBaseUrl = 'https://valet.up.railway.app/api';
  private cache: { [key: string]: any } = {};
  private cacheTimeout = 30000; // 30 seconds

  async getParkingStatus(): Promise<ParkingData> {
    try {
      // Check network connectivity
      const networkState = await Network.fetch();
      if (!networkState.isConnected) {
        console.log('No internet connection, using cached data');
        return this.getCachedData('parkingStatus') || this.getMockParkingData();
      }

      console.log('Fetching parking data from:', `${this.apiBaseUrl}/parking`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.apiBaseUrl}/parking`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'VALET-Mobile-App/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const rawData: ParkingSpace[] = await response.json();
      console.log('Raw parking data received:', rawData?.length || 0, 'records');
      
      const transformedData = this.transformToParkingData(rawData);
      
      // Cache the successful response
      await this.setCachedData('parkingStatus', transformedData);
      
      return transformedData;
    } catch (error: any) {
      console.error('Error fetching parking status:', error);
      
      if (error.name === 'AbortError') {
        console.log('Request timed out');
      }
      
      // Try to return cached data first
      const cachedData = await this.getCachedData('parkingStatus');
      if (cachedData) {
        console.log('Using cached parking data');
        return cachedData;
      }
      
      // Fall back to mock data
      console.log('Using mock data as fallback');
      return this.getMockParkingData();
    }
  }

  async getFloorData(floor: number): Promise<FloorData> {
    try {
      const networkState = await Network.fetch();
      if (!networkState.isConnected) {
        console.log('No internet connection, using cached floor data');
        return this.getCachedData(`floor-${floor}`) || this.getMockFloorData(floor);
      }

      console.log('Fetching floor data for floor:', floor);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.apiBaseUrl}/parking`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'VALET-Mobile-App/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData: ParkingSpace[] = await response.json();
      const transformedData = this.transformToFloorData(rawData, floor);
      
      // Cache the floor data
      await this.setCachedData(`floor-${floor}`, transformedData);
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching floor data:', error);
      
      // Try cached data first
      const cachedData = await this.getCachedData(`floor-${floor}`);
      if (cachedData) {
        return cachedData;
      }
      
      // Fall back to mock data
      return this.getMockFloorData(floor);
    }
  }

  async sendFeedback(feedback: {
    type: string;
    message: string;
    rating?: number;
    email?: string;
    issues?: string[];
  }): Promise<boolean> {
    try {
      // Store feedback locally (since no feedback endpoint exists yet)
      const existingFeedback = await AsyncStorage.getItem('feedback');
      const feedbackList = existingFeedback ? JSON.parse(existingFeedback) : [];
      
      feedbackList.push({
        ...feedback,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        submitted: false, // Mark as not yet synced with server
      });
      
      await AsyncStorage.setItem('feedback', JSON.stringify(feedbackList));
      
      // TODO: Try to send to server when endpoint is available
      // For now, just return success
      return true;
    } catch (error) {
      console.error('Error storing feedback:', error);
      return false;
    }
  }

  async getNotificationSettings(): Promise<any> {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      return settings ? JSON.parse(settings) : {
        spotAvailable: true,
        floorUpdates: true,
        maintenanceAlerts: false,
        vibration: true,
        sound: true,
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {};
    }
  }

  async saveNotificationSettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // Cache management
  private async setCachedData(key: string, data: any): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  private async getCachedData(key: string): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      const age = Date.now() - cacheEntry.timestamp;
      
      if (age > this.cacheTimeout) {
        // Cache expired
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return cacheEntry.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  // Transform Railway API data to app format
  private transformToParkingData(rawData: ParkingSpace[]): ParkingData {
    if (!rawData || !Array.isArray(rawData)) {
      console.warn('Invalid parking data received:', rawData);
      return this.getMockParkingData();
    }

    const totalSpots = rawData.length;
    const availableSpots = rawData.filter(space => !space.is_occupied).length;
    
    // Group by floor based on location or sensor_id
    const floorGroups = this.groupByFloor(rawData);
    
    const floors = Object.entries(floorGroups).map(([floorNum, spaces]) => ({
      floor: parseInt(floorNum),
      total: spaces.length,
      available: spaces.filter(s => !s.is_occupied).length,
    })).sort((a, b) => a.floor - b.floor);

    return {
      totalSpots,
      availableSpots,
      floors,
    };
  }

  private transformToFloorData(rawData: ParkingSpace[], targetFloor: number): FloorData {
    if (!rawData || !Array.isArray(rawData)) {
      return this.getMockFloorData(targetFloor);
    }

    const floorGroups = this.groupByFloor(rawData);
    const floorSpaces = floorGroups[targetFloor] || [];
    
    const spots: ParkingSpot[] = floorSpaces.map((space, index) => ({
      id: space.id.toString(),
      position: this.calculateSpotPosition(space.sensor_id, index),
      isOccupied: space.is_occupied,
      isReserved: false,
      spotNumber: this.generateSpotNumber(space.sensor_id, targetFloor),
      sensorId: space.sensor_id,
      distanceCm: space.distance_cm,
      lastUpdated: new Date(space.timestamp).toLocaleTimeString(),
    }));

    const availableCount = spots.filter(spot => !spot.isOccupied).length;

    return {
      floor: targetFloor,
      spots,
      availableCount,
      totalCount: spots.length,
    };
  }

  private groupByFloor(spaces: ParkingSpace[]): Record<number, ParkingSpace[]> {
    return spaces.reduce((groups, space) => {
      let floor = 1; // Default floor
      
      // Extract floor from location if available
      if (space.location) {
        const floorMatch = space.location.match(/floor\s*(\d+)/i) || 
                          space.location.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i);
        if (floorMatch) {
          floor = parseInt(floorMatch[1]);
        }
      } else {
        // Estimate floor based on sensor_id pattern
        floor = Math.ceil(space.sensor_id / 40);
        floor = Math.max(1, Math.min(3, floor)); // Limit to floors 1-3
      }
      
      if (!groups[floor]) {
        groups[floor] = [];
      }
      groups[floor].push(space);
      return groups;
    }, {} as Record<number, ParkingSpace[]>);
  }

  private calculateSpotPosition(sensorId: number, index: number): { x: number; y: number } {
    const spotsPerRow = 4;
    const spotWidth = 60;
    const spotHeight = 80;
    const startX = 30;
    const startY = 50;
    
    const row = Math.floor(index / spotsPerRow);
    const col = index % spotsPerRow;
    
    return {
      x: startX + (col * spotWidth),
      y: startY + (row * spotHeight),
    };
  }

  private generateSpotNumber(sensorId: number, floor: number): string {
    const sectionLetter = sensorId % 2 === 0 ? 'A' : 'B';
    const spotNum = ((sensorId - 1) % 20) + 1;
    return `${sectionLetter}${spotNum}`;
  }

  // Mock data for development/offline mode
  private getMockParkingData(): ParkingData {
    return {
      totalSpots: 120,
      availableSpots: 45,
      floors: [
        { floor: 1, total: 40, available: 15 },
        { floor: 2, total: 40, available: 18 },
        { floor: 3, total: 40, available: 12 },
      ],
    };
  }

  private getMockFloorData(floor: number): FloorData {
    const spots: ParkingSpot[] = [];
    const totalSpots = 40;
    
    for (let i = 1; i <= totalSpots; i++) {
      const sensorId = ((floor - 1) * 40) + i;
      spots.push({
        id: `${floor}-${i}`,
        position: this.calculateSpotPosition(sensorId, i - 1),
        isOccupied: Math.random() > 0.6,
        isReserved: false,
        spotNumber: this.generateSpotNumber(sensorId, floor),
        sensorId,
        distanceCm: Math.floor(Math.random() * 200) + 50,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    }

    const availableCount = spots.filter(spot => !spot.isOccupied).length;

    return {
      floor,
      spots,
      availableCount,
      totalCount: totalSpots,
    };
  }
}

export const ParkingService = new ParkingServiceClass();

// src/services/NotificationService.ts (Expo version)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class NotificationServiceClass {
  async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('parking-updates', {
        name: 'VALET Parking Updates',
        description: 'Real-time notifications for parking spot availability',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#B71C1C',
        sound: 'default',
      });
    }
  }

  async showLocalNotification(title: string, message: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showSpotAvailableNotification(floor: number, spotNumber: string, sensorId: number): Promise<void> {
    await this.showLocalNotification(
      'Parking Spot Available! 🚗',
      `Spot ${spotNumber} on Floor ${floor} is now available`,
      { type: 'spot-available', floor, spotNumber, sensorId }
    );
  }

  async showFloorUpdateNotification(floor: number, availableSpots: number): Promise<void> {
    await this.showLocalNotification(
      'Floor Update 📊',
      `Floor ${floor} now has ${availableSpots} available spots`,
      { type: 'floor-update', floor, availableSpots }
    );
  }

  async showSensorAlertNotification(sensorId: number, issue: string): Promise<void> {
    await this.showLocalNotification(
      'Sensor Alert ⚠️',
      `Sensor ${sensorId}: ${issue}`,
      { type: 'sensor-alert', sensorId, issue }
    );
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }
}

export const NotificationService = new NotificationServiceClass();