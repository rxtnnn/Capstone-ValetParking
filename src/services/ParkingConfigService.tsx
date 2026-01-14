// src/services/ParkingConfigService.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ParkingLocationConfig,
  FloorConfig,
  ParkingConfigApiResponse,
  ConfigCacheMetadata,
  SensorToSpotMapping,
  SpotToSensorMapping,
  ParkingSpotConfig,
  NavigationWaypoint,
  NavigationRoute,
  GestureLimits,
  Position,
} from '../types/parkingConfig';

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
  private static readonly API_BASE_URL = 'https://valet.up.railway.app/api';
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
   * Clear cached configuration
   */
  async clearCache(): Promise<void> {
    this.cachedConfig = null;
    await Promise.all([
      AsyncStorage.removeItem(ParkingConfigServiceClass.CACHE_KEY),
      AsyncStorage.removeItem(ParkingConfigServiceClass.CACHE_METADATA_KEY),
    ]);
  }

  /**
   * Force refresh configuration from API
   */
  async refreshConfig(locationId: string = 'usjr_quadricentennial'): Promise<ParkingLocationConfig> {
    await this.clearCache();
    return this.getConfig(locationId);
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
   * Get spot to sensor mapping for a floor
   */
  getSpotToSensorMapping(floorConfig: FloorConfig): SpotToSensorMapping {
    const mapping: SpotToSensorMapping = {};
    floorConfig.parking_spots.forEach(spot => {
      if (spot.sensor_id !== null) {
        mapping[spot.spot_id] = spot.sensor_id;
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
   * This includes all 4 floors with matching layouts
   */
  private getHardcodedFallbackConfig(locationId: string): ParkingLocationConfig {
    console.warn('Using hardcoded fallback configuration');

    // Floor 1 configuration - Only 1D1 has Sensor 2 assigned
    const floor1Spots: ParkingSpotConfig[] = [
      { spot_id: '1A1', sensor_id: null, position: { x: 685, y: 116 }, dimensions: { width: 57, height: 45 }, rotation: '90deg', section: 'A' },
      { spot_id: '1B4', sensor_id: null, position: { x: 500, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '1B3', sensor_id: null, position: { x: 545, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '1B2', sensor_id: null, position: { x: 590, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '1B1', sensor_id: null, position: { x: 635, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '1C1', sensor_id: null, position: { x: 450, y: 95 }, dimensions: { width: 40, height: 55 }, rotation: '-90deg', section: 'C' },
      { spot_id: '1C2', sensor_id: null, position: { x: 450, y: 140 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'C' },
      { spot_id: '1D7', sensor_id: null, position: { x: 100, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '1D6', sensor_id: null, position: { x: 160, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '1D5', sensor_id: null, position: { x: 210, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '1D4', sensor_id: null, position: { x: 259, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '1D3', sensor_id: null, position: { x: 310, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '1D2', sensor_id: null, position: { x: 355, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '1D1', sensor_id: 2, position: { x: 400, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' }, // Sensor 2
      { spot_id: '1J5', sensor_id: null, position: { x: 270, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '1J4', sensor_id: null, position: { x: 320, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '1J3', sensor_id: null, position: { x: 380, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '1J2', sensor_id: null, position: { x: 440, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '1J1', sensor_id: null, position: { x: 490, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '1E3', sensor_id: null, position: { x: 55, y: 315 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '1E2', sensor_id: null, position: { x: 55, y: 380 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '1E1', sensor_id: null, position: { x: 55, y: 445 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '1F1', sensor_id: null, position: { x: 120, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '1F2', sensor_id: null, position: { x: 165, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '1F3', sensor_id: null, position: { x: 220, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '1F4', sensor_id: null, position: { x: 265, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '1F5', sensor_id: null, position: { x: 310, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '1F6', sensor_id: null, position: { x: 365, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '1F7', sensor_id: null, position: { x: 410, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '1G1', sensor_id: null, position: { x: 500, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '1G2', sensor_id: null, position: { x: 500, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '1G3', sensor_id: null, position: { x: 500, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '1G4', sensor_id: null, position: { x: 500, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '1G5', sensor_id: null, position: { x: 500, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '1H1', sensor_id: null, position: { x: 560, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '1H2', sensor_id: null, position: { x: 605, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '1H3', sensor_id: null, position: { x: 650, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '1I5', sensor_id: null, position: { x: 680, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '1I4', sensor_id: null, position: { x: 680, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '1I3', sensor_id: null, position: { x: 680, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '1I2', sensor_id: null, position: { x: 680, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '1I1', sensor_id: null, position: { x: 680, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
    ];

    // Floor 2 configuration - Only 2B1 has Sensor 1 assigned
    const floor2Spots: ParkingSpotConfig[] = [
      { spot_id: '2A1', sensor_id: null, position: { x: 685, y: 116 }, dimensions: { width: 57, height: 45 }, rotation: '90deg', section: 'A' },
      { spot_id: '2B4', sensor_id: null, position: { x: 500, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '2B3', sensor_id: null, position: { x: 545, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '2B2', sensor_id: null, position: { x: 590, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '2B1', sensor_id: 1, position: { x: 635, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' }, // Sensor 1
      { spot_id: '2C1', sensor_id: null, position: { x: 450, y: 95 }, dimensions: { width: 40, height: 55 }, rotation: '-90deg', section: 'C' },
      { spot_id: '2C2', sensor_id: null, position: { x: 450, y: 140 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'C' },
      { spot_id: '2D7', sensor_id: null, position: { x: 100, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '2D6', sensor_id: null, position: { x: 160, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '2D5', sensor_id: null, position: { x: 210, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '2D4', sensor_id: null, position: { x: 259, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '2D3', sensor_id: null, position: { x: 310, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '2D2', sensor_id: null, position: { x: 355, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '2D1', sensor_id: null, position: { x: 400, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '2J5', sensor_id: null, position: { x: 270, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '2J4', sensor_id: null, position: { x: 320, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '2J3', sensor_id: null, position: { x: 380, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '2J2', sensor_id: null, position: { x: 440, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '2J1', sensor_id: null, position: { x: 490, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '2E3', sensor_id: null, position: { x: 55, y: 315 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '2E2', sensor_id: null, position: { x: 55, y: 380 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '2E1', sensor_id: null, position: { x: 55, y: 445 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '2F1', sensor_id: null, position: { x: 120, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '2F2', sensor_id: null, position: { x: 165, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '2F3', sensor_id: null, position: { x: 220, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '2F4', sensor_id: null, position: { x: 265, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '2F5', sensor_id: null, position: { x: 310, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '2F6', sensor_id: null, position: { x: 365, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '2F7', sensor_id: null, position: { x: 410, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '2G1', sensor_id: null, position: { x: 500, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '2G2', sensor_id: null, position: { x: 500, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '2G3', sensor_id: null, position: { x: 500, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '2G4', sensor_id: null, position: { x: 500, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '2G5', sensor_id: null, position: { x: 500, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '2H1', sensor_id: null, position: { x: 560, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '2H2', sensor_id: null, position: { x: 605, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '2H3', sensor_id: null, position: { x: 650, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '2I5', sensor_id: null, position: { x: 680, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '2I4', sensor_id: null, position: { x: 680, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '2I3', sensor_id: null, position: { x: 680, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '2I2', sensor_id: null, position: { x: 680, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '2I1', sensor_id: null, position: { x: 680, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
    ];

    // Floor 3 configuration - No sensors assigned
    const floor3Spots: ParkingSpotConfig[] = [
      { spot_id: '3A1', sensor_id: null, position: { x: 685, y: 116 }, dimensions: { width: 57, height: 45 }, rotation: '90deg', section: 'A' },
      { spot_id: '3B4', sensor_id: null, position: { x: 500, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '3B3', sensor_id: null, position: { x: 545, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '3B2', sensor_id: null, position: { x: 590, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '3B1', sensor_id: null, position: { x: 635, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '3C1', sensor_id: null, position: { x: 450, y: 95 }, dimensions: { width: 40, height: 55 }, rotation: '-90deg', section: 'C' },
      { spot_id: '3C2', sensor_id: null, position: { x: 450, y: 140 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'C' },
      { spot_id: '3D7', sensor_id: null, position: { x: 100, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '3D6', sensor_id: null, position: { x: 160, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '3D5', sensor_id: null, position: { x: 210, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '3D4', sensor_id: null, position: { x: 259, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '3D3', sensor_id: null, position: { x: 310, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '3D2', sensor_id: null, position: { x: 355, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '3D1', sensor_id: null, position: { x: 400, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '3J5', sensor_id: null, position: { x: 270, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '3J4', sensor_id: null, position: { x: 320, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '3J3', sensor_id: null, position: { x: 380, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '3J2', sensor_id: null, position: { x: 440, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '3J1', sensor_id: null, position: { x: 490, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '3E3', sensor_id: null, position: { x: 55, y: 315 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '3E2', sensor_id: null, position: { x: 55, y: 380 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '3E1', sensor_id: null, position: { x: 55, y: 445 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '3F1', sensor_id: null, position: { x: 120, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '3F2', sensor_id: null, position: { x: 165, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '3F3', sensor_id: null, position: { x: 220, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '3F4', sensor_id: null, position: { x: 265, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '3F5', sensor_id: null, position: { x: 310, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '3F6', sensor_id: null, position: { x: 365, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '3F7', sensor_id: null, position: { x: 410, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '3G1', sensor_id: null, position: { x: 500, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '3G2', sensor_id: null, position: { x: 500, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '3G3', sensor_id: null, position: { x: 500, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '3G4', sensor_id: null, position: { x: 500, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '3G5', sensor_id: null, position: { x: 500, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '3H1', sensor_id: null, position: { x: 560, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '3H2', sensor_id: null, position: { x: 605, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '3H3', sensor_id: null, position: { x: 650, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '3I5', sensor_id: null, position: { x: 680, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '3I4', sensor_id: null, position: { x: 680, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '3I3', sensor_id: null, position: { x: 680, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '3I2', sensor_id: null, position: { x: 680, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '3I1', sensor_id: null, position: { x: 680, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
    ];

    // Floor 4 configuration - Only 4J3 has Sensor 3 assigned
    const floor4Spots: ParkingSpotConfig[] = [
      { spot_id: '4A1', sensor_id: null, position: { x: 685, y: 116 }, dimensions: { width: 57, height: 45 }, rotation: '90deg', section: 'A' },
      { spot_id: '4B4', sensor_id: null, position: { x: 500, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '4B3', sensor_id: null, position: { x: 545, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '4B2', sensor_id: null, position: { x: 590, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '4B1', sensor_id: null, position: { x: 635, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'B' },
      { spot_id: '4C1', sensor_id: null, position: { x: 450, y: 95 }, dimensions: { width: 40, height: 55 }, rotation: '-90deg', section: 'C' },
      { spot_id: '4C2', sensor_id: null, position: { x: 450, y: 140 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'C' },
      { spot_id: '4D7', sensor_id: null, position: { x: 100, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '4D6', sensor_id: null, position: { x: 160, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '4D5', sensor_id: null, position: { x: 210, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '4D4', sensor_id: null, position: { x: 259, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '4D3', sensor_id: null, position: { x: 310, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '4D2', sensor_id: null, position: { x: 355, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '4D1', sensor_id: null, position: { x: 400, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'D' },
      { spot_id: '4J5', sensor_id: null, position: { x: 270, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '4J4', sensor_id: null, position: { x: 320, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '4J3', sensor_id: 3, position: { x: 380, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' }, // Sensor 3
      { spot_id: '4J2', sensor_id: null, position: { x: 440, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '4J1', sensor_id: null, position: { x: 490, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'J' },
      { spot_id: '4E3', sensor_id: null, position: { x: 55, y: 315 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '4E2', sensor_id: null, position: { x: 55, y: 380 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '4E1', sensor_id: null, position: { x: 55, y: 445 }, dimensions: { width: 55, height: 60 }, rotation: '90deg', section: 'E' },
      { spot_id: '4F1', sensor_id: null, position: { x: 120, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '4F2', sensor_id: null, position: { x: 165, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '4F3', sensor_id: null, position: { x: 220, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '4F4', sensor_id: null, position: { x: 265, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '4F5', sensor_id: null, position: { x: 310, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '4F6', sensor_id: null, position: { x: 365, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '4F7', sensor_id: null, position: { x: 410, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg', section: 'F' },
      { spot_id: '4G1', sensor_id: null, position: { x: 500, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '4G2', sensor_id: null, position: { x: 500, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '4G3', sensor_id: null, position: { x: 500, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '4G4', sensor_id: null, position: { x: 500, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '4G5', sensor_id: null, position: { x: 500, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '90deg', section: 'G' },
      { spot_id: '4H1', sensor_id: null, position: { x: 560, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '4H2', sensor_id: null, position: { x: 605, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '4H3', sensor_id: null, position: { x: 650, y: 890 }, dimensions: { width: 40, height: 55 }, rotation: '180deg', section: 'H' },
      { spot_id: '4I5', sensor_id: null, position: { x: 680, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '4I4', sensor_id: null, position: { x: 680, y: 650 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '4I3', sensor_id: null, position: { x: 680, y: 710 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '4I2', sensor_id: null, position: { x: 680, y: 770 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
      { spot_id: '4I1', sensor_id: null, position: { x: 680, y: 830 }, dimensions: { width: 40, height: 55 }, rotation: '270deg', section: 'I' },
    ];

    // Shared waypoints and routes (same for all floors)
    const sharedWaypoints: NavigationWaypoint[] = [
      { id: 'entrance', position: { x: 650, y: 250 } },
      { id: 'intersectionAB', position: { x: 650, y: 130 } },
      { id: 'intersectionBC', position: { x: 520, y: 130 } },
      { id: 'intersectionA', position: { x: 650, y: 150 } },
      { id: 'intersectionH', position: { x: 600, y: 900 } },
      { id: 'intersectionG', position: { x: 550, y: 830 } },
      { id: 'intersectionF', position: { x: 450, y: 550 } },
      { id: 'intersectionE', position: { x: 100, y: 450 } },
      { id: 'intersectionD', position: { x: 200, y: 230 } },
      { id: 'intersectionC', position: { x: 467, y: 150 } },
      { id: 'intersectionB', position: { x: 660, y: 60 } },
      { id: 'intersectionJ', position: { x: 400, y: 400 } },
    ];

    const sharedRoutes: NavigationRoute[] = [
      { section: 'H', waypoints: ['entrance', 'intersectionH', 'destination'] },
      { section: 'I', waypoints: ['entrance', 'intersectionH', 'intersectionG', 'destination'] },
      { section: 'G', waypoints: ['entrance', 'intersectionH', 'intersectionG', 'destination'] },
      { section: 'F', waypoints: ['entrance', 'intersectionH', 'intersectionG', 'intersectionF', 'destination'] },
      { section: 'E', waypoints: ['entrance', 'intersectionH', 'intersectionG', 'intersectionF', 'intersectionE', 'destination'] },
      { section: 'J', waypoints: ['entrance', 'intersectionH', 'intersectionG', 'intersectionF', 'intersectionJ', 'destination'] },
      { section: 'D', waypoints: ['entrance', 'intersectionH', 'intersectionG', 'intersectionF', 'intersectionJ', 'intersectionD', 'destination'] },
      { section: 'C', waypoints: ['entrance', 'intersectionAB', 'intersectionBC', 'destination'] },
      { section: 'B', waypoints: ['entrance', 'intersectionB', 'destination'] },
      { section: 'A', waypoints: ['entrance', 'intersectionA', 'destination'] },
    ];

    const sharedGestureLimits: GestureLimits = {
      maxTranslateX: 300,
      minTranslateX: -300,
      maxTranslateY: 200,
      minTranslateY: -600,
      minScale: 0.7,
      maxScale: 3,
      clampMinScale: 0.8,
      clampMaxScale: 2.5,
    };

    const sharedInitialView = {
      translateX: -300,
      translateY: 100,
      scale: 1,
    };

    // Floor 1 Config
    const floor1Config: FloorConfig = {
      floor_number: 1,
      floor_name: '1st Floor',
      building_name: 'USJ-R Quadricentennial',
      map_component: 'MapLayout',
      entrance_point: { x: 650, y: 250 },
      parking_spots: floor1Spots,
      navigation_waypoints: sharedWaypoints,
      navigation_routes: sharedRoutes,
      gesture_limits: sharedGestureLimits,
      initial_view: sharedInitialView,
    };

    // Floor 2 Config
    const floor2Config: FloorConfig = {
      floor_number: 2,
      floor_name: '2nd Floor',
      building_name: 'USJ-R Quadricentennial',
      map_component: 'MapLayout',
      entrance_point: { x: 650, y: 250 },
      parking_spots: floor2Spots,
      navigation_waypoints: sharedWaypoints,
      navigation_routes: sharedRoutes,
      gesture_limits: sharedGestureLimits,
      initial_view: sharedInitialView,
    };

    // Floor 3 Config
    const floor3Config: FloorConfig = {
      floor_number: 3,
      floor_name: '3rd Floor',
      building_name: 'USJ-R Quadricentennial',
      map_component: 'MapLayout',
      entrance_point: { x: 650, y: 250 },
      parking_spots: floor3Spots,
      navigation_waypoints: sharedWaypoints,
      navigation_routes: sharedRoutes,
      gesture_limits: sharedGestureLimits,
      initial_view: sharedInitialView,
    };

    // Floor 4 Config
    const floor4Config: FloorConfig = {
      floor_number: 4,
      floor_name: '4th Floor',
      building_name: 'USJ-R Quadricentennial',
      map_component: 'MapLayout',
      entrance_point: { x: 650, y: 250 },
      parking_spots: floor4Spots,
      navigation_waypoints: sharedWaypoints,
      navigation_routes: sharedRoutes,
      gesture_limits: sharedGestureLimits,
      initial_view: sharedInitialView,
    };

    return {
      location_id: locationId,
      location_name: 'USJ-R Quadricentennial',
      floors: [floor1Config, floor2Config, floor3Config, floor4Config],
      last_updated: new Date().toISOString(),
      version: '1.0.0-fallback',
    };
  }
}

export const ParkingConfigService = new ParkingConfigServiceClass();
