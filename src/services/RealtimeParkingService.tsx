// src/services/RealTimeParkingService.ts
import { NotificationService } from './NotificationService';

export interface ParkingSpace {
  id: number;
  sensor_id: number;
  is_occupied: number;      
  distance_cm: number;
  created_at: string;
  updated_at: string;
  floor_level: string; 
}

export interface ParkingStats {
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  floors: Array<{
    floor: number;
    total: number;
    available: number;
    occupancyRate: number;
    status: 'available' | 'limited' | 'full';
  }>;
  lastUpdated: string;
  isLive: boolean;
  sensorData?: ParkingSpace[]; // 🔥 ADD THIS: Include raw sensor data for individual spot updates
}

type ParkingUpdateCallback = (data: ParkingStats) => void;
type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'error') => void;

class RealTimeParkingServiceClass {
  private apiUrl = 'https://valet.up.railway.app/api/public/parking';
  
  // API Token for authentication
  private readonly API_TOKEN = '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad';
  
  private updateCallbacks: ParkingUpdateCallback[] = [];
  private connectionCallbacks: ConnectionStatusCallback[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastData: ParkingStats | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private updateIntervalMs = 5000; // 5 seconds
  private retryCount = 0;
  private maxRetries = 3;
  private lastFetchTime = 0; // Track last fetch to prevent spam

  constructor() {}

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Service already running');
      return;
    }
    
    console.log('🚀 Starting parking service with API token authentication');
    this.isRunning = true;
    this.fetchAndUpdate();
    
    this.updateInterval = setInterval(() => {
      this.fetchAndUpdate();
    }, this.updateIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    console.log('⏹️ Stopping parking service');
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.setConnectionStatus('disconnected');
  }

  // Allow dynamic refresh rate changes
  setRefreshRate(intervalMs: number): void {
    if (intervalMs < 1000) {
      console.warn('⚠️ Minimum refresh rate is 1 second, setting to 1000ms');
      intervalMs = 1000;
    }
    
    if (intervalMs > 60000) {
      console.warn('⚠️ Maximum refresh rate is 60 seconds, setting to 60000ms');
      intervalMs = 60000;
    }

    console.log(`🔄 Changing refresh rate from ${this.updateIntervalMs}ms to ${intervalMs}ms`);
    this.updateIntervalMs = intervalMs;

    // Restart with new interval if currently running
    if (this.isRunning && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = setInterval(() => {
        this.fetchAndUpdate();
      }, this.updateIntervalMs);
    }
  }

  getRefreshRate(): number {
    return this.updateIntervalMs;
  }

  // Subscribe to parking updates
  onParkingUpdate(callback: ParkingUpdateCallback): () => void { 
    this.updateCallbacks.push(callback);
 
    if (this.lastData) {
      callback(this.lastData);
    }
    
    return () => { // Unsubscribe function
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.connectionCallbacks.push(callback);
    callback(this.connectionStatus);
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  private async fetchAndUpdate(): Promise<void> {
    const now = Date.now();
    
    // Prevent rapid consecutive requests
    if (now - this.lastFetchTime < 1000) {
      console.log('⏭️ Skipping fetch - too soon since last request');
      return;
    }
    
    this.lastFetchTime = now;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log(`📡 Fetching parking data with API token... (${new Date().toLocaleTimeString()})`);

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`, // 🔐 Added API token authentication
          'Cache-Control': 'no-cache',
          'User-Agent': 'VALET-RealTime/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors
      if (response.status === 401) {
        console.error('🔒 API token is invalid or expired');
        throw new Error('Authentication failed: Invalid API token');
      }

      if (response.status === 403) {
        console.error('🚫 API token does not have permission to access parking data');
        throw new Error('Authorization failed: Insufficient permissions');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData: ParkingSpace[] = await response.json();
      
      // Validate response data
      if (!Array.isArray(rawData)) {
        console.error('❌ Invalid response format - expected array of parking spaces');
        throw new Error('Invalid response format from server');
      }
      
      // 🔥 FIXED: Pass the raw sensor data to the transform function
      const newData = this.transformRawData(rawData, rawData);
      this.checkForChanges(newData);
      
      this.lastData = newData;
      this.notifyParkingUpdate(newData);
      this.setConnectionStatus('connected'); 
      this.retryCount = 0; 
      
      console.log(`✅ Successfully updated parking data - ${newData.availableSpots}/${newData.totalSpots} spots available`);
      console.log(`📊 Sensor data included: ${newData.sensorData?.length || 0} sensors`);
      
    } catch (error: any) {
      this.retryCount++;
      console.error(`❌ Fetch error (attempt ${this.retryCount}/${this.maxRetries}):`, error.message);
      
      // Handle specific error types
      if (error.message.includes('Authentication failed')) {
        console.error('🔒 API token authentication failed - check token validity');
        this.setConnectionStatus('error');
        // Don't retry authentication errors immediately
        return;
      }
      
      if (error.message.includes('Authorization failed')) {
        console.error('🚫 API token permissions insufficient');
        this.setConnectionStatus('error');
        return;
      }
      
      this.setConnectionStatus('error');
      
      if (this.lastData) {
        const staleData = {
          ...this.lastData,
          isLive: false,
          lastUpdated: `Error: ${error.message}`,
        };
        this.notifyParkingUpdate(staleData);
      }
      
      if (this.retryCount <= this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
        console.log(`🔄 Retrying in ${delay}ms...`);
        
        setTimeout(() => {
          if (this.isRunning) {
            this.fetchAndUpdate();
          }
        }, delay);
      } else {
        console.error('❌ Max retries exceeded, stopping automatic updates');
        this.stop();
      }
    }
  }

  private extractFloorFromLocation = (floor_level: string): number => {
    if (!floor_level) {
      return 1;
    }

    const pattern = /(\d+)(?:st|nd|rd|th)?\s*floor/i;
    const match = floor_level.match(pattern);

    if (match) {
      const floorNumber = parseInt(match[1]);
      if (floorNumber >= 1 && floorNumber <= 4) {
        return floorNumber;
      }
    }

    return 1;
  };

  // 🔥 FIXED: Updated to include raw sensor data in the response
  private transformRawData(rawData: ParkingSpace[], sensorData: ParkingSpace[]): ParkingStats {   
    const totalSpots = rawData.length;
    const availableSpots = rawData.filter(space => !space.is_occupied).length;
    const occupiedSpots = rawData.filter(space => space.is_occupied).length;

    const floorGroups: { [key: number]: ParkingSpace[] } = {};
    
    rawData.forEach(space => {
      const floor = this.extractFloorFromLocation(space.floor_level);
      
      if (!floorGroups[floor]) {
        floorGroups[floor] = [];
      }
      floorGroups[floor].push(space);
    });

    const floors = Object.entries(floorGroups).map(([floorNum, spaces]) => {
      const total = spaces.length;
      const available = spaces.filter(s => !s.is_occupied).length;
      const occupancyRate = total > 0 ? ((total - available) / total) * 100 : 0;
      
      let status: 'available' | 'limited' | 'full';
      if (available === 0) {
        status = 'full';
      } else if (available / total < 0.2) {
        status = 'limited';
      } else {
        status = 'available';
      }

      return {
        floor: parseInt(floorNum),
        total,
        available,
        occupancyRate,
        status,
      };
    }).sort((a, b) => a.floor - b.floor);

    // 🔥 FIXED: Include the raw sensor data in the response
    return {
      totalSpots,
      availableSpots,
      occupiedSpots,
      floors,
      lastUpdated: new Date().toLocaleTimeString(),
      isLive: true,
      sensorData, // Include the raw sensor data for individual spot mapping
    };
  }

  private checkForChanges(newData: ParkingStats): void {
    if (!this.lastData) return;

    const oldData = this.lastData;

    // Check for new available spots
    if (newData.availableSpots > oldData.availableSpots) {
      const increase = newData.availableSpots - oldData.availableSpots;
      console.log(`🟢 ${increase} new spot(s) available!`);
      
      NotificationService.showSpotAvailableNotification(
        newData.availableSpots,
        // Find which floor has the most available spots
        newData.floors.reduce((prev, current) => 
          prev.available > current.available ? prev : current
        ).floor
      );
    }

    // Check if spots decreased
    if (newData.availableSpots < oldData.availableSpots) {
      const decrease = oldData.availableSpots - newData.availableSpots;
      console.log(`🔴 ${decrease} spot(s) taken`);
    }
    
    // 🔥 ADDED: Log individual sensor changes for debugging
    if (newData.sensorData && oldData.sensorData) {
      newData.sensorData.forEach(newSensor => {
        const oldSensor = oldData.sensorData?.find(s => s.sensor_id === newSensor.sensor_id);
        if (oldSensor && oldSensor.is_occupied !== newSensor.is_occupied) {
          console.log(`🔄 Sensor ${newSensor.sensor_id}: ${oldSensor.is_occupied ? 'OCCUPIED' : 'FREE'} → ${newSensor.is_occupied ? 'OCCUPIED' : 'FREE'}`);
        }
      });
    }
    
    // Check floor status changes
    newData.floors.forEach(newFloor => {
      const oldFloor = oldData.floors.find(f => f.floor === newFloor.floor);
      
      if (oldFloor && oldFloor.status !== newFloor.status) {
        if (newFloor.status === 'available' && oldFloor.status !== 'available') {
          console.log(`🏢 Floor ${newFloor.floor} status changed to available`);
          NotificationService.showFloorUpdateNotification(
            newFloor.floor,
            newFloor.available,
            newFloor.total
          );
        }
      }
    });
  }

  private notifyParkingUpdate(data: ParkingStats): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('💥 Error in parking update callback:', error);
      }
    });
  }

  private setConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
    if (this.connectionStatus !== status) {
      const oldStatus = this.connectionStatus;
      this.connectionStatus = status;
      console.log(`🔗 Connection status: ${oldStatus} → ${status}`);
      
      this.connectionCallbacks.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('💥 Error in connection status callback:', error);
        }
      });

      if (status === 'connected' && oldStatus !== 'connected') {
        NotificationService.showConnectionStatusNotification(true);
      } else if (status === 'error') {
        NotificationService.showConnectionStatusNotification(false);
      }
    }
  }

  // Manual refresh for user-triggered updates
  async forceUpdate(): Promise<void> {
    console.log('🔄 Force update requested');
    if (this.isRunning) {
      await this.fetchAndUpdate();
    } else {
      console.warn('⚠️ Service not running, cannot force update');
    }
  }

  // Test API connection with token
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing API connection...');
      
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
        },
      });

      if (response.status === 401) {
        return {
          success: false,
          message: 'API token is invalid or expired',
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          message: 'API token does not have permission to access parking data',
        };
      }

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connection successful! Found ${Array.isArray(data) ? data.length : 0} parking spaces.`,
        };
      }

      return {
        success: false,
        message: `Server error: ${response.status} ${response.statusText}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  // Get service statistics
  getServiceStats() {
    return {
      isRunning: this.isRunning,
      refreshRate: this.updateIntervalMs,
      connectionStatus: this.connectionStatus,
      lastUpdate: this.lastData?.lastUpdated || 'Never',
      subscriberCount: this.updateCallbacks.length,
      retryCount: this.retryCount,
      apiEndpoint: this.apiUrl,
      hasValidToken: !!this.API_TOKEN,
      sensorCount: this.lastData?.sensorData?.length || 0,
    };
  }

  // Update API token if needed (for future use)
  updateApiToken(newToken: string): void {
    console.log('🔑 API token updated');
    // Note: This would require making API_TOKEN non-readonly
    // For now, restart the service to use the new token
    if (this.isRunning) {
      this.stop();
      setTimeout(() => {
        this.start();
      }, 1000);
    }
  }

  // 🔥 ADDED: Method to get raw sensor data for debugging
  getRawSensorData(): ParkingSpace[] | null {
    return this.lastData?.sensorData || null;
  }

  // 🔥 ADDED: Method to get sensor data for a specific sensor ID
  getSensorById(sensorId: number): ParkingSpace | null {
    return this.lastData?.sensorData?.find(sensor => sensor.sensor_id === sensorId) || null;
  }
}

export const RealTimeParkingService = new RealTimeParkingServiceClass();