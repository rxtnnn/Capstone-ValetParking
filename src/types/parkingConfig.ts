export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ParkingSpotConfig {
  spot_id: string;      
  sensor_id: number | null; 
  position: Position;      
  dimensions: Dimensions;   
  rotation: string;   
  section: string;  
}

export interface NavigationWaypoint {
  id: string;
  position: Position;
}

export interface NavigationRoute {
  section: string;          
  waypoints: string[];     
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
  map_image_url?: string;    
  map_component?: string;   
  entrance_point: Position;
  parking_spots: ParkingSpotConfig[];
  navigation_waypoints: NavigationWaypoint[];
  navigation_routes: NavigationRoute[];
  gesture_limits?: GestureLimits;       
  initial_view?: {                     
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
  [sensorId: number]: string;
}

export interface SpotToSensorMapping {
  [spotId: string]: number;  
}
export interface ConfigCacheMetadata {
  location_id: string;
  version: string;
  cached_at: string;
  expires_at: string;
}
export interface ParkingConfigApiResponse {
  success: boolean;
  data: ParkingLocationConfig;
  message?: string;
}
