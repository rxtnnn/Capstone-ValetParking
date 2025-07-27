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
  sensorData?: ParkingSpace[];
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
  private lastFetchTime = 0;
  
  // 🔥 NEW: Prevent multiple simultaneous requests
  private isFetching = false;
  private fetchController: AbortController | null = null;
  private shouldStop = false; // Flag to indicate service should stop
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;

  constructor() {}

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Service already running');
      return;
    }
    
    console.log('🚀 Starting parking service with API token authentication');
    this.isRunning = true;
    this.shouldStop = false;
    this.consecutiveErrors = 0;
    this.retryCount = 0;
    
    // Initial fetch
    this.fetchAndUpdate();
    
    // Set up interval
    this.updateInterval = setInterval(() => {
      if (!this.shouldStop && this.isRunning && !this.isFetching) {
        this.fetchAndUpdate();
      } else if (this.isFetching) {
        console.log('⏭️ Skipping interval fetch - request already in progress');
      }
    }, this.updateIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    console.log('⏹️ Stopping parking service');
    this.shouldStop = true;
    this.isRunning = false;
    
    // Cancel any ongoing request
    if (this.fetchController) {
      this.fetchController.abort();
      this.fetchController = null;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.isFetching = false;
    this.setConnectionStatus('disconnected');
  }

  // Allow dynamic refresh rate changes
  setRefreshRate(intervalMs: number): void {
    if (intervalMs < 2000) {
      console.warn('⚠️ Minimum refresh rate is 2 seconds, setting to 2000ms');
      intervalMs = 2000;
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
        if (!this.shouldStop && this.isRunning && !this.isFetching) {
          this.fetchAndUpdate();
        }
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
      try {
        callback(this.lastData);
      } catch (error) {
        console.error('💥 Error in initial callback:', error);
      }
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
    
    try {
      callback(this.connectionStatus);
    } catch (error) {
      console.error('💥 Error in connection status callback:', error);
    }
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  // 🔥 FIXED: Enhanced fetch method with better loop prevention
  private async fetchAndUpdate(): Promise<void> {
    // Prevent multiple simultaneous requests
    if (this.isFetching) {
      console.log('⏭️ Fetch already in progress, skipping');
      return;
    }

    // Check if service should stop
    if (this.shouldStop || !this.isRunning) {
      console.log('⏹️ Service stopping, aborting fetch');
      return;
    }

    const now = Date.now();
    
    // Prevent rapid consecutive requests (minimum 2 seconds between requests)
    if (now - this.lastFetchTime < 2000) {
      console.log('⏭️ Skipping fetch - too soon since last request');
      return;
    }

    // Check consecutive errors limit
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.error(`❌ Too many consecutive errors (${this.consecutiveErrors}), stopping service`);
      this.stop();
      return;
    }
    
    this.isFetching = true;
    this.lastFetchTime = now;

    // Create new abort controller for this request
    this.fetchController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (this.fetchController) {
        this.fetchController.abort();
      }
    }, 8000); // 8 second timeout

    try {
      console.log(`📡 Fetching parking data... (${new Date().toLocaleTimeString()})`);

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
          'Cache-Control': 'no-cache',
          'User-Agent': 'VALET-RealTime/1.0',
        },
        signal: this.fetchController.signal,
      });

      clearTimeout(timeoutId);

      // Check if request was aborted
      if (this.fetchController.signal.aborted) {
        console.log('🛑 Request was aborted');
        return;
      }

      // Handle authentication errors
      if (response.status === 401) {
        console.error('🔒 API token is invalid or expired');
        this.setConnectionStatus('error');
        this.consecutiveErrors++;
        return;
      }

      if (response.status === 403) {
        console.error('🚫 API token does not have permission to access parking data');
        this.setConnectionStatus('error');
        this.consecutiveErrors++;
        return;
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
      
      // Check if service was stopped while fetching
      if (this.shouldStop || !this.isRunning) {
        console.log('⏹️ Service stopped during fetch, discarding data');
        return;
      }

      const newData = this.transformRawData(rawData, rawData);
      this.checkForChanges(newData);
      
      this.lastData = newData;
      this.notifyParkingUpdate(newData);
      this.setConnectionStatus('connected'); 
      this.retryCount = 0;
      this.consecutiveErrors = 0; // Reset consecutive errors on success
      
      console.log(`✅ Successfully updated - ${newData.availableSpots}/${newData.totalSpots} spots available`);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Don't log errors if the request was aborted (service stopping)
      if (error.name === 'AbortError' || this.shouldStop) {
        console.log('🛑 Request aborted (service stopping)');
        return;
      }

      this.retryCount++;
      this.consecutiveErrors++;
      console.error(`❌ Fetch error (attempt ${this.retryCount}/${this.maxRetries}, consecutive: ${this.consecutiveErrors}):`, error.message);
      
      // Handle specific error types
      if (error.message.includes('Authentication failed') || error.message.includes('Authorization failed')) {
        console.error('🔒 API authentication/authorization failed');
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
      
      // Only retry if we haven't exceeded limits and service is still running
      if (this.retryCount <= this.maxRetries && this.consecutiveErrors < this.maxConsecutiveErrors && this.isRunning && !this.shouldStop) {
        const delay = Math.min(2000 * Math.pow(2, this.retryCount), 30000);
        console.log(`🔄 Retrying in ${delay}ms...`);
        
        setTimeout(() => {
          if (this.isRunning && !this.shouldStop) {
            this.fetchAndUpdate();
          }
        }, delay);
      } else {
        console.error('❌ Max retries or consecutive errors exceeded, stopping automatic updates');
        this.stop();
      }
    } finally {
      this.isFetching = false;
      this.fetchController = null;
      clearTimeout(timeoutId);
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

    return {
      totalSpots,
      availableSpots,
      occupiedSpots,
      floors,
      lastUpdated: new Date().toLocaleTimeString(),
      isLive: true,
      sensorData,
    };
  }

  // 🔥 FIXED: Better change detection with throttling
  private checkForChanges(newData: ParkingStats): void {
    if (!this.lastData) return;

    const oldData = this.lastData;

    try {
      // Check for new available spots (only notify if significant increase)
      if (newData.availableSpots > oldData.availableSpots) {
        const increase = newData.availableSpots - oldData.availableSpots;
        console.log(`🟢 ${increase} new spot(s) available!`);
        
        // Only send notification for significant changes (1+ spots)
        if (increase >= 1) {
          const bestFloor = newData.floors.reduce((prev, current) => 
            prev.available > current.available ? prev : current
          );
          
          NotificationService.showSpotAvailableNotification(
            newData.availableSpots,
            bestFloor.floor
          );
        }
      }

      // Log spot decreases (but don't send notifications)
      if (newData.availableSpots < oldData.availableSpots) {
        const decrease = oldData.availableSpots - newData.availableSpots;
        console.log(`🔴 ${decrease} spot(s) taken`);
      }
      
      // Check floor status changes (throttle these notifications)
      newData.floors.forEach(newFloor => {
        const oldFloor = oldData.floors.find(f => f.floor === newFloor.floor);
        
        if (oldFloor && oldFloor.available !== newFloor.available) {
          // Only notify if there's an increase in available spots
          if (newFloor.available > oldFloor.available) {
            console.log(`🏢 Floor ${newFloor.floor}: ${oldFloor.available} → ${newFloor.available} spots`);
            NotificationService.showFloorUpdateNotification(
              newFloor.floor,
              newFloor.available,
              newFloor.total,
              oldFloor.available
            );
          }
        }
      });
    } catch (error) {
      console.error('💥 Error checking for changes:', error);
    }
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

      // Don't send connection status notifications (these are disabled)
      // NotificationService.showConnectionStatusNotification is not called
    }
  }

  // 🔥 FIXED: Force update with safety checks
  async forceUpdate(): Promise<void> {
    console.log('🔄 Force update requested');
    
    if (!this.isRunning) {
      console.warn('⚠️ Service not running, cannot force update');
      return;
    }

    if (this.isFetching) {
      console.log('⚠️ Fetch already in progress, waiting...');
      return;
    }

    // Reset error counters for manual refresh
    this.consecutiveErrors = 0;
    this.retryCount = 0;
    
    await this.fetchAndUpdate();
  }

  // Test API connection with token
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing API connection...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      isFetching: this.isFetching,
      refreshRate: this.updateIntervalMs,
      connectionStatus: this.connectionStatus,
      lastUpdate: this.lastData?.lastUpdated || 'Never',
      subscriberCount: this.updateCallbacks.length,
      retryCount: this.retryCount,
      consecutiveErrors: this.consecutiveErrors,
      apiEndpoint: this.apiUrl,
      hasValidToken: !!this.API_TOKEN,
      sensorCount: this.lastData?.sensorData?.length || 0,
    };
  }

  getRawSensorData(): ParkingSpace[] | null {
    return this.lastData?.sensorData || null;
  }

  getSensorById(sensorId: number): ParkingSpace | null {
    return this.lastData?.sensorData?.find(sensor => sensor.sensor_id === sensorId) || null;
  }

  // 🔥 NEW: Method to reset error counters
  resetErrorCounters(): void {
    this.retryCount = 0;
    this.consecutiveErrors = 0;
    console.log('🔄 Error counters reset');
  }

  // 🔥 NEW: Check if service is healthy
  isHealthy(): boolean {
    return this.isRunning && 
           this.consecutiveErrors < this.maxConsecutiveErrors && 
           this.connectionStatus !== 'error';
  }
}

export const RealTimeParkingService = new RealTimeParkingServiceClass();