import { NotificationService } from '../services/NotificationService';

export interface ParkingSpace {
  id: number;
  sensor_id: number;
  is_occupied: boolean;
  distance_cm: number;
  timestamp: string;
  location: string;
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
}

type ParkingUpdateCallback = (data: ParkingStats) => void;
type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'error') => void;

class RealTimeParkingServiceClass {
  private apiUrl = 'https://valet.up.railway.app/api/parking';
  private updateCallbacks: ParkingUpdateCallback[] = [];
  private connectionCallbacks: ConnectionStatusCallback[] = [];
 private updateInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private lastData: ParkingStats | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private updateIntervalMs = 5000; 
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    console.log('🚗 RealTimeParkingService initialized');
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Real-time service already running');
      return;
    }

    console.log('🚀 Starting real-time parking updates...');
    this.isRunning = true;
    this.fetchAndUpdate();
    this.updateInterval = setInterval(() => {
      this.fetchAndUpdate();
    }, this.updateIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;

    console.log('⏹️ Stopping real-time parking updates...');
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.setConnectionStatus('disconnected');
  }

  onParkingUpdate(callback: ParkingUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    if (this.lastData) {
      callback(this.lastData);
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
    callback(this.connectionStatus);

    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  private async fetchAndUpdate(): Promise<void> {
    try {
      console.log('📡 Fetching real-time parking data...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); 

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'VALET-RealTime/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData: ParkingSpace[] = await response.json();
      const newData = this.transformParkingData(rawData);
    
      this.checkForChanges(newData);
      this.lastData = newData;
      this.notifyParkingUpdate(newData);
      this.setConnectionStatus('connected');
      this.retryCount = 0; 
      
    } catch (error: any) {
      console.error('❌ Error fetching parking data:', error);
      
      this.retryCount++;
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
        console.log(`🔄 Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
          if (this.isRunning) {
            this.fetchAndUpdate();
          }
        }, delay);
      }
    }
  }

  private transformParkingData(rawData: ParkingSpace[]): ParkingStats {
    const totalSpots = rawData.length;
    const availableSpots = rawData.filter(space => !space.is_occupied).length;
    const occupiedSpots = totalSpots - availableSpots;
    const floorGroups: { [key: number]: ParkingSpace[] } = {};
    
    rawData.forEach(space => {
      let floor = 1; 
      
      if (space.location) {
        const floorMatch = space.location.match(/floor\s*(\d+)/i) || 
                          space.location.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i);
        if (floorMatch) {
          floor = parseInt(floorMatch[1]);
        }
      } else {
        floor = Math.ceil(space.sensor_id / 40);
        floor = Math.max(1, Math.min(3, floor));
      }
      
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
    };
  }

  private checkForChanges(newData: ParkingStats): void {
    if (!this.lastData) return;

    const oldData = this.lastData;

    if (newData.availableSpots > oldData.availableSpots) {
      const increase = newData.availableSpots - oldData.availableSpots;
      NotificationService.showLocalNotification(
        '🎉 More Spots Available!',
        `${increase} new parking spot${increase > 1 ? 's' : ''} just became available`,
        { 
          type: 'spots-increased',
          oldCount: oldData.availableSpots,
          newCount: newData.availableSpots,
          increase,
        }
      );
    }

    newData.floors.forEach(newFloor => {
      const oldFloor = oldData.floors.find(f => f.floor === newFloor.floor);
      
      if (oldFloor && oldFloor.status !== newFloor.status) {
        if (newFloor.status === 'available' && oldFloor.status !== 'available') {
          NotificationService.showFloorUpdateNotification(
            newFloor.floor,
            newFloor.available,
            newFloor.total
          );
        }
      }
    });

    const availabilityChange = Math.abs(newData.availableSpots - oldData.availableSpots);
    if (availabilityChange >= 5) {
      console.log(`📊 Significant change detected: ${availabilityChange} spots`);
    }
  }

  // Notify all parking update subscribers
  private notifyParkingUpdate(data: ParkingStats): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in parking update callback:', error);
      }
    });
  }

  // Set connection status and notify subscribers
  private setConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      console.log(`📡 Connection status: ${status}`);
      
      this.connectionCallbacks.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in connection status callback:', error);
        }
      });

      if (status === 'connected') {
        NotificationService.showConnectionStatusNotification(true);
      } else if (status === 'error') {
        NotificationService.showConnectionStatusNotification(false);
      }
    }
  }

  getCurrentData(): ParkingStats | null {
    return this.lastData;
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
    return this.connectionStatus;
  }

  setUpdateInterval(milliseconds: number): void {
    this.updateIntervalMs = Math.max(1000, milliseconds); 
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    
    console.log(`⏱️ Update interval set to ${this.updateIntervalMs}ms`);
  }

  async forceUpdate(): Promise<void> {
    if (this.isRunning) {
      await this.fetchAndUpdate();
    }
  }

  getStats(): { 
    isRunning: boolean;
    updateInterval: number;
    lastUpdated: string | null;
    connectionStatus: string;
    retryCount: number;
  } {
    return {
      isRunning: this.isRunning,
      updateInterval: this.updateIntervalMs,
      lastUpdated: this.lastData?.lastUpdated || null,
      connectionStatus: this.connectionStatus,
      retryCount: this.retryCount,
    };
  }
}

export const RealTimeParkingService = new RealTimeParkingServiceClass();	