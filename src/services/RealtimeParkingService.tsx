import NotificationService from './NotificationService';
import { NotificationManager } from './NotifManager';

export interface ParkingSpace {
  id: number;
  sensor_id: number | null;
  is_occupied: boolean;
  distance_cm: number | null;
  created_at: string;
  updated_at: string;
  floor_level: string;
  slot_name: string | null;
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
  private apiUrl = 'https://valetdevelop.up.railway.app/api/public/parking';
  private readonly API_TOKEN = '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad';
  
  private updateCallbacks: ParkingUpdateCallback[] = [];
  private connectionCallbacks: ConnectionStatusCallback[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastData: ParkingStats | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private updateIntervalMs = 3000;
  private retryCount = 0;
  private maxRetries = 5;
  private lastFetchTime = 0;
  private isFetching = false;
  private fetchController: AbortController | null = null;
  private shouldStop = false;
  private consecErrors = 0;
  private maxConsecutiveErrors = 8;
  private isInitialized = false;

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    this.isRunning = true;
    this.shouldStop = false;
    
    console.log('RealTimeParkingService initialized');
  }

  start(): void {
    if (!this.isInitialized) {
      this.initializeService();
    }
    
    if (this.updateInterval) {
      console.log('Service already running, skipping start');
      return;
    }
    
    console.log('Starting RealTimeParkingService data fetching');
    this.isRunning = true;
    this.shouldStop = false;
    this.consecErrors = 0;
    this.retryCount = 0;
    
    this.fetchAndUpdate();

    this.updateInterval = setInterval(() => {
      if (!this.shouldStop && this.isRunning && !this.isFetching) {
        this.fetchAndUpdate();
      }
    }, this.updateIntervalMs);
  }



  stop(): void {
    console.log('Stopping RealTimeParkingService completely');
    
    this.shouldStop = true;
    this.isRunning = false;
    
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

  manualStop(): void {
    console.log('Manual stop requested - use for logout/app close only');
    this.stop();
  }

  setRefreshRate(intervalMs: number): void {
    intervalMs = Math.max(1000, Math.min(60000, intervalMs));
    
    this.updateIntervalMs = intervalMs;
    if (this.updateInterval) {
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
        console.log('Error in initial callback:', error);
      }
    }
    
    if (!this.updateInterval && this.isInitialized) {
      this.start();
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
      console.log('Error in connection status callback:', error);
    }
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  private async fetchAndUpdate(): Promise<void> {
    if (this.isFetching || this.shouldStop || !this.isRunning) return;

    const now = Date.now();
    
    if (now - this.lastFetchTime < 2000) return;

    if (this.consecErrors >= this.maxConsecutiveErrors) {
      console.log(`Too many consecutive errors (${this.consecErrors}), extending retry delay`);
      const extendedDelay = Math.min(30000, this.updateIntervalMs * 3);
      setTimeout(() => {
        if (this.isRunning && !this.shouldStop) {
          this.consecErrors = Math.floor(this.maxConsecutiveErrors / 2);
          this.fetchAndUpdate();
        }
      }, extendedDelay);
      return;
    }
    
    this.isFetching = true;
    this.lastFetchTime = now;
    this.fetchController = new AbortController();

    const timeoutId = setTimeout(() => {
      if (this.fetchController) {
        this.fetchController.abort();
      }
    }, 6000);

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
      if (this.fetchController.signal.aborted) return;

      if (response.status === 401 || response.status === 403) {
        console.log(`API authentication error: ${response.status}`);
        this.setConnectionStatus('error');
        this.consecErrors++;
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData: ParkingSpace[] = await response.json();
      if (!Array.isArray(rawData)) {
        throw new Error('Invalid response format from server');
      }
      
      if (this.shouldStop || !this.isRunning) return;

      const newData = this.transformRawData(rawData);
      this.checkForChanges(newData);
      
      this.lastData = newData;
      this.notifyParkingUpdate(newData);
      this.setConnectionStatus('connected'); 
      this.retryCount = 0;
      this.consecErrors = 0;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || this.shouldStop) return;

      this.retryCount++;
      this.consecErrors++;
      console.log(`Fetch error (attempt ${this.retryCount}/${this.maxRetries}):`, error.message);
      
      this.setConnectionStatus('error');
      
      if (this.lastData) {
        const oldData = {
          ...this.lastData,
          isLive: false,
          lastUpdated: `Error: ${error.message}`,
        };
        this.notifyParkingUpdate(oldData);
      }
      
      if (this.retryCount <= this.maxRetries && this.consecErrors < this.maxConsecutiveErrors && this.isRunning && !this.shouldStop) {
        const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 10000);
        
        setTimeout(() => {
          if (this.isRunning && !this.shouldStop) {
            this.fetchAndUpdate();
          }
        }, delay);
      }
    } finally {
      this.isFetching = false;
      this.fetchController = null;
      clearTimeout(timeoutId);
    }
  }

  private static floorPattern = /(\d+)(?:st|nd|rd|th)?\s*floor/i;
  
  private extractFloorFromLocation = (floor_level: string): number => {
    if (!floor_level) return 2;

    const match = floor_level.match(RealTimeParkingServiceClass.floorPattern);
    if (match) {
      const floorNumber = parseInt(match[1]);
      if (floorNumber >= 1 && floorNumber <= 5) {
        return floorNumber;
      }
    }
    return 2;
  };

  private transformRawData(rawData: ParkingSpace[]): ParkingStats {
    // Filter to only include spots that have sensors assigned (sensor_id is not null)
    // A slot is considered "assigned" if it has a sensor_id linked via sensor_assignments
    // - is_occupied = true means car is detected (occupied)
    // - is_occupied = false means no car detected (available)
    // Slots without sensor_id are unassigned (gray in parking map, not counted)
    const activeSpots = rawData.filter(space =>
      space.slot_name !== null &&
      space.slot_name !== undefined &&
      space.sensor_id !== null &&
      space.sensor_id !== undefined
    );

    console.log('Raw API data:', rawData.length, 'records, Active sensors:', activeSpots.length);

    const totalSpots = activeSpots.length;
    let availableSpots = 0;

    const floorGroups: { [key: number]: { total: number; available: number; spaces: ParkingSpace[] } } = {};

    for (const space of activeSpots) {
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
    }).sort((a, b) => b.available - a.available);

    console.log('Processed floors:', floors);
    console.log('Total:', totalSpots, 'Available:', availableSpots);

    return {
      totalSpots,
      availableSpots,
      occupiedSpots: totalSpots - availableSpots,
      floors,
      lastUpdated: new Date().toLocaleTimeString(),
      isLive: true,
      sensorData: activeSpots,
    };
  }

  private checkForChanges(newData: ParkingStats): void {
    if (!this.lastData?.sensorData || !newData.sensorData) return;

    const oldData = this.lastData;
    // Track previously available spots by slot_name
    const oldAvailable = new Set(
      (oldData.sensorData ?? [])
        .filter(s => !s.is_occupied && s.slot_name)
        .map(s => s.slot_name)
    );

    // Find spots that are now available but weren't before
    const newlyAvailableSpots = newData.sensorData.filter(
      s => !s.is_occupied && s.slot_name && !oldAvailable.has(s.slot_name)
    );

    if (newlyAvailableSpots.length > 0) {
      const floorGrouped: Record<number, string[]> = {};
      for (const spot of newlyAvailableSpots) {
        const floor = this.extractFloorFromLocation(spot.floor_level);
        // Use slot_name directly from API
        const label = spot.slot_name || 'Unknown';
        (floorGrouped[floor] = floorGrouped[floor] || []).push(label);
      }

      for (const floorStr in floorGrouped) {
        const floor = parseInt(floorStr, 10);
        const spotIds = floorGrouped[floor];

        NotificationService.showSpotAvailableNotification(
          spotIds.length,
          floor,
          spotIds
        );

        NotificationService.getNotificationSettings()
          .then(settings => {
            if (settings.spotAvailable) {
              NotificationManager.addSpotAvailableNotification(
                spotIds.length,
                floor,
                spotIds
              );
            }
          })
          .catch(err => console.log('Error fetching settings:', err));
      }
    }

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
  }

  private notifyParkingUpdate(data: ParkingStats): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(data);
      } catch (error) {
        console.log('Error in parking update callback:', error);
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
          console.log('Error in connection status callback:', error);
        }
      }
    }
  }

  async forceUpdate(): Promise<void> {
    this.consecErrors = 0;
    this.retryCount = 0;
    
    if (!this.updateInterval) {
      this.start();
    }
    
    await this.fetchAndUpdate();
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
      consecErrors: this.consecErrors,
      apiEndpoint: this.apiUrl,
      hasValidToken: !!this.API_TOKEN,
      sensorCount: this.lastData?.sensorData?.length || 0,
      isInitialized: this.isInitialized,
      hasActiveInterval: !!this.updateInterval,
    };
  }
}

export const RealTimeParkingService = new RealTimeParkingServiceClass();