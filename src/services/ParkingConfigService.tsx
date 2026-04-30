import AsyncStorage from '@react-native-async-storage/async-storage';
import {ParkingLocationConfig, FloorConfig, ParkingConfigApiResponse, ConfigCacheMetadata,
  SensorToSpotMapping, Position } from '../types/parkingConfig';
import { API_ENDPOINTS, API_TOKEN } from '../constants/AppConst';
import { generateFloorSpots, NAVIGATION_WAYPOINTS, NAVIGATION_ROUTES, GESTURE_LIMITS,
  INITIAL_VIEW, ENTRANCE_POINT } from '../components/MapLayout';

type ConfigListener = (config: ParkingLocationConfig) => void;

class ParkingConfigServiceClass {
  private static readonly API_BASE_URL = API_ENDPOINTS.baseUrl;
  private static readonly CACHE_KEY = 'parking_config_cache';
  private static readonly CACHE_METADATA_KEY = 'parking_config_metadata';
  private static readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000;  //24hrs

  private cachedConfig: ParkingLocationConfig | null = null;
  private isLoading = false;
  private loadPromise: Promise<ParkingLocationConfig> | null = null;
  private listeners: ConfigListener[] = [];

  async getConfig(locationId: string = 'usjr_quadricentennial'): Promise<ParkingLocationConfig> {
    if (this.cachedConfig && this.cachedConfig.location_id === locationId) {
      return this.cachedConfig;
    }

    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.loadConfigWithFallback(locationId);

    try {
      const config = await this.loadPromise;
      this.cachedConfig = config;
      this.notifyListeners(config);
      return config;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  private async loadConfigWithFallback(locationId: string): Promise<ParkingLocationConfig> {
    try {
      const cachedConfig = await this.loadFromCache(locationId);
      if (cachedConfig) {
        console.log('Loaded parking config from cache');
        this.fetchAndCacheConfig(locationId).catch(err =>
          console.log('Background config update failed:', err)
        );
        return cachedConfig;
      }

      const apiConfig = await this.fetchAndCacheConfig(locationId);
      return apiConfig;
    } catch (error) {
      console.log('Failed to load config from cache/API, using fallback:', error);
      return this.getDefaultParkingConfig(locationId);
    }
  }

  private async fetchAndCacheConfig(locationId: string): Promise<ParkingLocationConfig> {
    try {
      const url = `${ParkingConfigServiceClass.API_BASE_URL}${API_ENDPOINTS.parkingConfig(locationId)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const apiResponse: ParkingConfigApiResponse = await response.json();

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error('Invalid API response format');
      }

      const config = apiResponse.data;
      await this.saveToCache(config);

      return config;
    } catch (error) {
      throw error;
    }
  }

  private async loadFromCache(locationId: string): Promise<ParkingLocationConfig | null> {
    try {
      const [metadataJson, configJson] = await Promise.all([
        AsyncStorage.getItem(ParkingConfigServiceClass.CACHE_METADATA_KEY),
        AsyncStorage.getItem(ParkingConfigServiceClass.CACHE_KEY),
      ]);

      if (!metadataJson || !configJson) {
        return null;
      }

      const metadata: ConfigCacheMetadata = JSON.parse(metadataJson);

      if (metadata.location_id !== locationId) {
        return null;
      }

      const expiresAt = new Date(metadata.expires_at);
      if (expiresAt < new Date()) {
        console.log('Cache expired');
        return null;
      }

      const config: ParkingLocationConfig = JSON.parse(configJson);
      return config;
    } catch (error) {
      console.log('Error loading from cache:', error);
      return null;
    }
  }

  private async saveToCache(config: ParkingLocationConfig): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ParkingConfigServiceClass.CACHE_DURATION_MS);

      const metadata: ConfigCacheMetadata = {
        location_id: config.location_id,
        version: config.version,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      await Promise.all([
        AsyncStorage.setItem(ParkingConfigServiceClass.CACHE_METADATA_KEY, JSON.stringify(metadata)),
        AsyncStorage.setItem(ParkingConfigServiceClass.CACHE_KEY, JSON.stringify(config)),
      ]);

      console.log('Parking config cached successfully');
    } catch (error) {
      console.error('Failed to save config to cache:', error);
    }
  }

  async getFloorConfig(locationId: string, floorNumber: number): Promise<FloorConfig | null> {
    const config = await this.getConfig(locationId);
    return config.floors.find(f => f.floor_number === floorNumber) || null;
  }

  async getFloorNumbers(locationId: string = 'usjr_quadricentennial'): Promise<number[]> {
    const config = await this.getConfig(locationId);
    return config.floors.map(f => f.floor_number).sort((a, b) => a - b);
  }

  async getDefaultFloors(locationId: string = 'usjr_quadricentennial') {
    const floorNumbers = await this.getFloorNumbers(locationId);
    return floorNumbers.map(floor => ({
      floor,
      total: 0,
      available: 0,
      malfunctioned: 0,
      occupancyRate: 0,
      status: 'no_data' as const,
    }));
  }

  subscribe(listener: ConfigListener): () => void {
    this.listeners.push(listener);
    if (this.cachedConfig) listener(this.cachedConfig);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(config: ParkingLocationConfig): void {
    this.listeners.forEach(l => l(config));
  }

  getSensorToSpotMapping(floorConfig: FloorConfig): SensorToSpotMapping {
    const mapping: SensorToSpotMapping = {};
    floorConfig.parking_spots.forEach(spot => {
      if (spot.sensor_id !== null) {
        mapping[spot.sensor_id] = spot.spot_id;
      }
    });
    return mapping;
  }

  getWaypointsMap(floorConfig: FloorConfig): { [id: string]: Position } {
    const map: { [id: string]: Position } = {};
    floorConfig.navigation_waypoints.forEach(waypoint => {
      map[waypoint.id] = waypoint.position;
    });
    return map;
  }

  private getDefaultParkingConfig(locationId: string): ParkingLocationConfig {

    const createFloorConfig = (floorNumber: number, floorName: string): FloorConfig => ({
      floor_number: floorNumber,
      floor_name: floorName,
      building_name: 'USJ-R Quadricentennial',
      map_component: 'MapLayout',
      entrance_point: ENTRANCE_POINT,
      parking_spots: generateFloorSpots(floorNumber),
      navigation_waypoints: NAVIGATION_WAYPOINTS,
      navigation_routes: NAVIGATION_ROUTES,
      gesture_limits: GESTURE_LIMITS,
      initial_view: INITIAL_VIEW,
    });

    return {
      location_id: locationId,
      location_name: 'USJ-R Quadricentennial',
      floors: [
        createFloorConfig(1, '1st Floor'),
        createFloorConfig(2, '2nd Floor'),
        createFloorConfig(3, '3rd Floor'),
        createFloorConfig(4, '4th Floor'),
      ],
      last_updated: new Date().toISOString(),
      version: '1.0.0-fallback',
    };
  }
}

export const ParkingConfigService = new ParkingConfigServiceClass();
