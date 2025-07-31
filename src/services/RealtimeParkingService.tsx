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
  private readonly API_TOKEN = '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad';
  
  private updateCallbacks: ParkingUpdateCallback[] = [];
  private connectionCallbacks: ConnectionStatusCallback[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastData: ParkingStats | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private updateIntervalMs = 5000;
  private retryCount = 0;
  private maxRetries = 3;
  private lastFetchTime = 0;
  
  // Prevent multiple simultaneous requests
  private isFetching = false;
  private fetchController: AbortController | null = null;
  private shouldStop = false;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.shouldStop = false;
    this.consecutiveErrors = 0;
    this.retryCount = 0;
    
    this.fetchAndUpdate();
    
    // Set up interval
    this.updateInterval = setInterval(() => {
      if (!this.shouldStop && this.isRunning && !this.isFetching) {
        this.fetchAndUpdate();
      }
    }, this.updateIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    
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

  setRefreshRate(intervalMs: number): void {
    // Clamp to safe range
    intervalMs = Math.max(2000, Math.min(60000, intervalMs));
    
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

  onParkingUpdate(callback: ParkingUpdateCallback): () => void { 
    this.updateCallbacks.push(callback);
 
    if (this.lastData) {
      try {
        callback(this.lastData);
      } catch (error) {
        console.error('Error in initial callback:', error);
      }
    }
    
    return () => {
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
      console.error('Error in connection status callback:', error);
    }
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  private async fetchAndUpdate(): Promise<void> {
    // Early exit checks - optimized for performance
    if (this.isFetching || this.shouldStop || !this.isRunning) return;

    const now = Date.now();
    
    // Rate limiting - minimum 2 seconds between requests
    if (now - this.lastFetchTime < 2000) return;

    // Check consecutive errors limit
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.error(`Too many consecutive errors (${this.consecutiveErrors}), stopping service`);
      this.stop();
      return;
    }
    
    this.isFetching = true;
    this.lastFetchTime = now;

    // Create abort controller with timeout
    this.fetchController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (this.fetchController) {
        this.fetchController.abort();
      }
    }, 8000);

    try {
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

      // Handle aborted requests
      if (this.fetchController.signal.aborted) return;

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.error(`API authentication error: ${response.status}`);
        this.setConnectionStatus('error');
        this.consecutiveErrors++;
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData: ParkingSpace[] = await response.json();
      
      // Validate response
      if (!Array.isArray(rawData)) {
        throw new Error('Invalid response format from server');
      }
      
      // Check if service was stopped during fetch
      if (this.shouldStop || !this.isRunning) return;

      const newData = this.transformRawData(rawData, rawData);
      this.checkForChanges(newData);
      
      this.lastData = newData;
      this.notifyParkingUpdate(newData);
      this.setConnectionStatus('connected'); 
      this.retryCount = 0;
      this.consecutiveErrors = 0;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Don't log errors if the request was aborted
      if (error.name === 'AbortError' || this.shouldStop) return;

      this.retryCount++;
      this.consecutiveErrors++;
      console.error(`Fetch error (attempt ${this.retryCount}/${this.maxRetries}):`, error.message);
      
      this.setConnectionStatus('error');
      
      if (this.lastData) {
        const staleData = {
          ...this.lastData,
          isLive: false,
          lastUpdated: `Error: ${error.message}`,
        };
        this.notifyParkingUpdate(staleData);
      }
      
      // Retry with exponential backoff
      if (this.retryCount <= this.maxRetries && this.consecutiveErrors < this.maxConsecutiveErrors && this.isRunning && !this.shouldStop) {
        const delay = Math.min(2000 * Math.pow(2, this.retryCount), 30000);
        
        setTimeout(() => {
          if (this.isRunning && !this.shouldStop) {
            this.fetchAndUpdate();
          }
        }, delay);
      } else {
        console.error('Max retries exceeded, stopping automatic updates');
        this.stop();
      }
    } finally {
      this.isFetching = false;
      this.fetchController = null;
      clearTimeout(timeoutId);
    }
  }

  // Optimized floor extraction - cached regex
  private static floorPattern = /(\d+)(?:st|nd|rd|th)?\s*floor/i;
  
  private extractFloorFromLocation = (floor_level: string): number => {
    if (!floor_level) return 1;

    const match = floor_level.match(RealTimeParkingServiceClass.floorPattern);
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
    let availableSpots = 0;
    
    // Group by floors and count in single pass
    const floorGroups: { [key: number]: { total: number; available: number; spaces: ParkingSpace[] } } = {};
    
    for (const space of rawData) {
      const floor = this.extractFloorFromLocation(space.floor_level);
      const isAvailable = !space.is_occupied;
      
      if (isAvailable) availableSpots++;
      
      if (!floorGroups[floor]) {
        floorGroups[floor] = { total: 0, available: 0, spaces: [] };
      }
      
      floorGroups[floor].total++;
      if (isAvailable) floorGroups[floor].available++;
      floorGroups[floor].spaces.push(space);
    }

    const floors = Object.entries(floorGroups).map(([floorNum, data]) => {
      const occupancyRate = data.total > 0 ? ((data.total - data.available) / data.total) * 100 : 0;
      
      let status: 'available' | 'limited' | 'full';
      if (data.available === 0) {
        status = 'full';
      } else if (data.available / data.total < 0.2) {
        status = 'limited';
      } else {
        status = 'available';
      }

      return {
        floor: parseInt(floorNum),
        total: data.total,
        available: data.available,
        occupancyRate,
        status,
      };
    }).sort((a, b) => a.floor - b.floor);

    return {
      totalSpots,
      availableSpots,
      occupiedSpots: totalSpots - availableSpots,
      floors,
      lastUpdated: new Date().toLocaleTimeString(),
      isLive: true,
      sensorData,
    };
  }

  private checkForChanges(newData: ParkingStats): void {
    if (!this.lastData) return;

    const oldData = this.lastData;

    try {
      // Check for new available spots (only notify if significant increase)
      if (newData.availableSpots > oldData.availableSpots) {
        const increase = newData.availableSpots - oldData.availableSpots;
        
        // Only send notification for 1+ spots
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
      
      // Check floor status changes (only increases)
      for (const newFloor of newData.floors) {
        const oldFloor = oldData.floors.find(f => f.floor === newFloor.floor);
        
        if (oldFloor && newFloor.available > oldFloor.available) {
          NotificationService.showFloorUpdateNotification(
            newFloor.floor,
            newFloor.available,
            newFloor.total,
            oldFloor.available
          );
        }
      }
    } catch (error) {
      console.error('Error checking for changes:', error);
    }
  }

  private notifyParkingUpdate(data: ParkingStats): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in parking update callback:', error);
      }
    }
  }

  private setConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      
      for (const callback of this.connectionCallbacks) {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in connection status callback:', error);
        }
      }
    }
  }

  async forceUpdate(): Promise<void> {
    if (!this.isRunning || this.isFetching) return;

    // Reset error counters for manual refresh
    this.consecutiveErrors = 0;
    this.retryCount = 0;
    
    await this.fetchAndUpdate();
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
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

  resetErrorCounters(): void {
    this.retryCount = 0;
    this.consecutiveErrors = 0;
  }

  isHealthy(): boolean {
    return this.isRunning && 
           this.consecutiveErrors < this.maxConsecutiveErrors && 
           this.connectionStatus !== 'error';
  }
}

export const RealTimeParkingService = new RealTimeParkingServiceClass();