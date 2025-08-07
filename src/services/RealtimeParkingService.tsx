import NotificationService from './NotificationService';
import { NotificationManager } from './NotifManager';
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
  private isFetching = false;
  private fetchController: AbortController | null = null;
  private shouldStop = false;
  private consecErrors = 0;
  private maxConsecutiveErrors = 5;

  private readonly SENSOR_ID_TO_LABEL: Record<number, string> = {
    1: 'B4', 2: 'B3', 3: 'B2', 4: 'B1', 5: 'C1' };

  start(): void {
    if (this.isRunning) return;
    
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
    if (!this.isRunning) return;
    
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

  setRefreshRate(intervalMs: number): void {
    intervalMs = Math.max(2000, Math.min(60000, intervalMs));
    
    this.updateIntervalMs = intervalMs;
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
        console.log('Error in initial callback:', error);
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
    if (this.isFetching || this.shouldStop || !this.isRunning) return; //para dili mag double fetch

    const now = Date.now(); //track last fetch time
    
    if (now - this.lastFetchTime < 5000) return; //every 5 secs to avoid flooding 

    if (this.consecErrors >= this.maxConsecutiveErrors) { // Stop if too many errors
      console.log(`Too many consecutive errors (${this.consecErrors}), stopping service`);
      this.stop();
      return;
    }
    
    this.isFetching = true;
    this.lastFetchTime = now;
    this.fetchController = new AbortController(); //if server is slow

    const timeoutId = setTimeout(() => { //if it takes 8 sec, abort from fetching
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

      clearTimeout(timeoutId); //if completed before timeout
      if (this.fetchController.signal.aborted) return; //if ni abort due to timeout, exit

      if (response.status === 401 || response.status === 403) { //invalid token
        console.log(`API authentication error: ${response.status}`);
        this.setConnectionStatus('error');
        this.consecErrors++;
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData: ParkingSpace[] = await response.json(); //convert response to JSON
      if (!Array.isArray(rawData)) { //ensures response is an array
        throw new Error('Invalid response format from server');
      }
      
      if (this.shouldStop || !this.isRunning) return; //skip if the user stopped the service

      const newData = this.transformRawData(rawData, rawData);
      this.checkForChanges(newData);//trigger for notif to notify user for nw spots available
      
      this.lastData = newData;
      this.notifyParkingUpdate(newData);
      this.setConnectionStatus('connected'); 
      this.retryCount = 0;
      this.consecErrors = 0;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || this.shouldStop) return; // if aborted or stopped, exit

      this.retryCount++;
      this.consecErrors++;
      console.log(`Fetch error (attempt ${this.retryCount}/${this.maxRetries}):`, error.message);
      
      this.setConnectionStatus('error');
      
      if (this.lastData) { //if api fetch failed, use last data
        const oldData = {
          ...this.lastData,
          isLive: false,
          lastUpdated: `Error: ${error.message}`,
        };
        this.notifyParkingUpdate(oldData); //to notify pages that the data is not live
      }
      
      if (this.retryCount <= this.maxRetries && this.consecErrors < this.maxConsecutiveErrors && this.isRunning && !this.shouldStop) {
        const delay = Math.min(2000 * Math.pow(2, this.retryCount), 30000); //retry with longer delay
        
        setTimeout(() => {
          if (this.isRunning && !this.shouldStop) {
            this.fetchAndUpdate();
          }
        }, delay);
      } else {
        console.log('Max retries exceeded, stopping automatic updates');
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
  if (!this.lastData?.sensorData || !newData.sensorData) return;

  const oldData = this.lastData;
  const oldAvailable = new Set((oldData.sensorData ?? []).filter(s => !s.is_occupied).map(s => s.sensor_id));

  // Find newly available spots
  const newlyAvailableSpots = newData.sensorData.filter(
    s => !s.is_occupied && !oldAvailable.has(s.sensor_id)
  );

  if (newlyAvailableSpots.length > 0) {
    const floorGrouped: Record<number, string[]> = {};
    for (const spot of newlyAvailableSpots) {
      const floor = this.extractFloorFromLocation(spot.floor_level);
      const label = this.SENSOR_ID_TO_LABEL[spot.sensor_id] || `S${spot.sensor_id}`;
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

  // existing floor update logic...
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
    if (!this.isRunning || this.isFetching) return;
    this.consecErrors = 0; // reset error counters for manual refresh
    this.retryCount = 0;
    
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
    };
  }
}

export const RealTimeParkingService = new RealTimeParkingServiceClass();