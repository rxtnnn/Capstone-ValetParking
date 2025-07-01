// src/services/SocketService.ts (Expo version - simplified)
import io, { Socket } from 'socket.io-client';
import * as Network from '@react-native-community/netinfo';

class SocketServiceClass {
  private socket: Socket | null = null;
  private url = 'https://valet.up.railway.app';
  private reconnectInterval: NodeJS.Timeout | null = null;
  private connected = false;
  private listeners: { [key: string]: Function[] } = {};

  async connect(): Promise<void> {
    // Check network connectivity first
    const networkState = await Network.fetch();
    if (!networkState.isConnected) {
      console.log('No internet connection, skipping socket connection');
      return;
    }

    if (this.socket?.connected) return;

    try {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected to Railway');
        this.connected = true;
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.connected = false;
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.startReconnectAttempts();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        this.connected = false;
        this.startReconnectAttempts();
      });

      // Listen for parking space updates
      this.socket.on('parking_space_updated', (data) => {
        console.log('Parking space updated via socket:', data);
        this.notifyListeners('parking_space_updated', data);
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
      this.startReconnectAttempts();
    }
  }

  disconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.listeners = {};
  }

  private async startReconnectAttempts(): Promise<void> {
    if (this.reconnectInterval) return;
    
    this.reconnectInterval = setInterval(async () => {
      const networkState = await Network.fetch();
      if (!this.connected && networkState.isConnected) {
        console.log('Attempting to reconnect socket...');
        this.connect();
      }
    }, 5000);
  }

  private notifyListeners(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket listener:', error);
        }
      });
    }
  }

  onParkingUpdate(callback: (data: any) => void): void {
    this.addListener('parking_space_updated', callback);
    this.addListener('parking_update', callback);
  }

  offParkingUpdate(): void {
    this.removeAllListeners('parking_space_updated');
    this.removeAllListeners('parking_update');
  }

  onFloorUpdate(floor: number, callback: (data: any) => void): void {
    const floorCallback = (data: any) => {
      if (this.isFloorUpdate(data, floor)) {
        callback(data);
      }
    };
    
    this.addListener(`floor-${floor}-update`, callback);
    this.addListener('parking_space_updated', floorCallback);
  }

  offFloorUpdate(floor: number): void {
    this.removeAllListeners(`floor-${floor}-update`);
  }

  onSpotUpdate(callback: (data: any) => void): void {
    this.addListener('parking_space_updated', callback);
    this.addListener('spot_update', callback);
  }

  offSpotUpdate(): void {
    this.removeAllListeners('parking_space_updated');
    this.removeAllListeners('spot_update');
  }

  private addListener(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private removeAllListeners(event: string): void {
    delete this.listeners[event];
  }

  private isFloorUpdate(data: any, floor: number): boolean {
    if (data.sensor_id) {
      const estimatedFloor = Math.ceil(data.sensor_id / 40);
      return estimatedFloor === floor;
    }
    if (data.floor) {
      return data.floor === floor;
    }
    return false;
  }

  // Method to simulate real-time updates for testing
  simulateUpdate(): void {
    const mockUpdate = {
      id: Math.floor(Math.random() * 120) + 1,
      sensor_id: Math.floor(Math.random() * 120) + 1,
      is_occupied: Math.random() > 0.5,
      distance_cm: Math.floor(Math.random() * 200) + 50,
      timestamp: new Date().toISOString(),
      location: `Floor ${Math.ceil(Math.random() * 3)}`,
    };
    
    this.notifyListeners('parking_space_updated', mockUpdate);
    console.log('Simulated parking update:', mockUpdate);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const SocketService = new SocketServiceClass();