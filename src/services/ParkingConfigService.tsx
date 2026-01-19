// src/services/ParkingConfigService.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ParkingLocationConfig,
  FloorConfig,
  ParkingConfigApiResponse,
  ConfigCacheMetadata,
  SensorToSpotMapping,
  Position,
} from '../types/parkingConfig';
import { API_ENDPOINTS } from '../constants/AppConst';
import {
  generateFloorSpots,
  NAVIGATION_WAYPOINTS,
  NAVIGATION_ROUTES,
  GESTURE_LIMITS,
  INITIAL_VIEW,
  ENTRANCE_POINT,
} from '../components/MapLayout';

/**
 * ParkingConfigService
 *
 * Manages dynamic parking configuration for scalable multi-location support.
 * Features:
 * - Fetches parking layout from API
 * - Caches configuration locally
 * - Provides fallback to hardcoded data
 * - Supports multiple floors and locations
 */
class ParkingConfigServiceClass {
  private static readonly API_BASE_URL = API_ENDPOINTS.baseUrl;
  private static readonly CONFIG_ENDPOINT = '/public/parking-config';
  private static readonly API_TOKEN = '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad';

  private static readonly CACHE_KEY = 'parking_config_cache';
  private static readonly CACHE_METADATA_KEY = 'parking_config_metadata';
  private static readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  private cachedConfig: ParkingLocationConfig | null = null;
  private isLoading = false;
  private loadPromise: Promise<ParkingLocationConfig> | null = null;

  /**
   * Get parking configuration for a specific location
   * Uses cache if available and valid, otherwise fetches from API
   */
  async getConfig(locationId: string = 'usjr_quadricentennial'): Promise<ParkingLocationConfig> {
    // Return cached config if available
    if (this.cachedConfig && this.cachedConfig.location_id === locationId) {
      return this.cachedConfig;
    }

    // If already loading, return existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start new load
    this.isLoading = true;
    this.loadPromise = this.loadConfigWithFallback(locationId);

    try {
      const config = await this.loadPromise;
      this.cachedConfig = config;
      return config;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Load configuration with fallback strategy:
   * 1. Try cache first
   * 2. Try API
   * 3. Fall back to hardcoded default
   */
  private async loadConfigWithFallback(locationId: string): Promise<ParkingLocationConfig> {
    try {
      // Try cache first
      const cachedConfig = await this.loadFromCache(locationId);
      if (cachedConfig) {
        console.log('Loaded parking config from cache');
        // Fetch updated config in background
        this.fetchAndCacheConfig(locationId).catch(err =>
          console.log('Background config update failed:', err)
        );
        return cachedConfig;
      }

      // Cache miss - fetch from API
      console.log('Cache miss - fetching parking config from API');
      const apiConfig = await this.fetchAndCacheConfig(locationId);
      return apiConfig;
    } catch (error) {
      console.log('Failed to load config from cache/API, using fallback:', error);
      // Fall back to hardcoded default
      return this.getHardcodedFallbackConfig(locationId);
    }
  }

  /**
   * Fetch configuration from API and cache it
   */
  private async fetchAndCacheConfig(locationId: string): Promise<ParkingLocationConfig> {
    try {
      const url = `${ParkingConfigServiceClass.API_BASE_URL}${ParkingConfigServiceClass.CONFIG_ENDPOINT}/${locationId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ParkingConfigServiceClass.API_TOKEN}`,
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

      // Cache the configuration
      await this.saveToCache(config);

      return config;
    } catch (error) {
      console.error('Failed to fetch parking config from API:', error);
      throw error;
    }
  }

  /**
   * Load configuration from local cache
   */
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

      // Check if cache is for the correct location
      if (metadata.location_id !== locationId) {
        return null;
      }

      // Check if cache has expired
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

  /**
   * Save configuration to local cache
   */
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

  /**
   * Get configuration for a specific floor
   */
  async getFloorConfig(locationId: string, floorNumber: number): Promise<FloorConfig | null> {
    const config = await this.getConfig(locationId);
    return config.floors.find(f => f.floor_number === floorNumber) || null;
  }

  /**
   * Get sensor to spot mapping for a floor
   */
  getSensorToSpotMapping(floorConfig: FloorConfig): SensorToSpotMapping {
    const mapping: SensorToSpotMapping = {};
    floorConfig.parking_spots.forEach(spot => {
      if (spot.sensor_id !== null) {
        mapping[spot.sensor_id] = spot.spot_id;
      }
    });
    return mapping;
  }

  /**
   * Get navigation waypoints as a map
   */
  getWaypointsMap(floorConfig: FloorConfig): { [id: string]: Position } {
    const map: { [id: string]: Position } = {};
    floorConfig.navigation_waypoints.forEach(waypoint => {
      map[waypoint.id] = waypoint.position;
    });
    return map;
  }

  /**
   * Hardcoded fallback configuration
   * Uses spot layout from MapLayout.tsx for all floors
   */
  private getHardcodedFallbackConfig(locationId: string): ParkingLocationConfig {
    console.warn('Using hardcoded fallback configuration');

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
