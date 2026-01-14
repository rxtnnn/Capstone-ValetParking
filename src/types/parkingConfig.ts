// src/types/parkingConfig.ts

/**
 * Core types for dynamic parking configuration system
 * Allows businesses to manage parking layouts without developer intervention
 */

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ParkingSpotConfig {
  spot_id: string;           // e.g., "A1", "B2"
  sensor_id: number | null;  // Physical sensor ID (null if no sensor assigned)
  position: Position;        // X,Y coordinates on map
  dimensions: Dimensions;    // Width and height
  rotation: string;          // e.g., "0deg", "90deg", "180deg", "270deg"
  section: string;           // Section letter, e.g., "A", "B"
}

export interface NavigationWaypoint {
  id: string;
  position: Position;
}

export interface NavigationRoute {
  section: string;           // Section this route serves, e.g., "A"
  waypoints: string[];       // Ordered list of waypoint IDs
}

export interface GestureLimits {
  maxTranslateX: number;
  minTranslateX: number;
  maxTranslateY: number;
  minTranslateY: number;
  minScale: number;
  maxScale: number;
  clampMinScale: number;
  clampMaxScale: number;
}

export interface FloorConfig {
  floor_number: number;
  floor_name: string;
  building_name: string;
  map_image_url?: string;               // Optional: for custom floor layouts
  map_component?: string;               // Component name: "MapLayout" or "Floor2Layout"
  entrance_point: Position;
  parking_spots: ParkingSpotConfig[];
  navigation_waypoints: NavigationWaypoint[];
  navigation_routes: NavigationRoute[];
  gesture_limits?: GestureLimits;       // Optional: custom pan/zoom limits
  initial_view?: {                      // Optional: initial camera position
    translateX: number;
    translateY: number;
    scale: number;
  };
}

export interface ParkingLocationConfig {
  location_id: string;
  location_name: string;
  floors: FloorConfig[];
  last_updated: string;
  version: string;
}

export interface SensorToSpotMapping {
  [sensorId: number]: string;  // sensor_id -> spot_id
}

export interface SpotToSensorMapping {
  [spotId: string]: number;    // spot_id -> sensor_id
}

/**
 * Cache metadata for configuration data
 */
export interface ConfigCacheMetadata {
  location_id: string;
  version: string;
  cached_at: string;
  expires_at: string;
}

/**
 * API Response format
 */
export interface ParkingConfigApiResponse {
  success: boolean;
  data: ParkingLocationConfig;
  message?: string;
}
