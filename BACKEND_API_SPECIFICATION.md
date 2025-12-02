# Backend API Specification for Dynamic Parking Configuration

## Overview

This document specifies the API endpoints and data formats needed to support dynamic parking configuration in the mobile app. With this implementation, the business can manage parking layouts without requiring developer intervention.

## API Endpoint

### Get Parking Configuration

**Endpoint:** `GET /api/public/parking-config/{location_id}`

**Headers:**
```
Authorization: Bearer {API_TOKEN}
Accept: application/json
Content-Type: application/json
```

**Path Parameters:**
- `location_id` (string): Unique identifier for the parking location (e.g., "usjr_quadricentennial")

**Response Format:**

```json
{
  "success": true,
  "data": {
    "location_id": "usjr_quadricentennial",
    "location_name": "USJ-R Quadricentennial",
    "floors": [
      {
        "floor_number": 4,
        "floor_name": "4th Floor",
        "building_name": "USJ-R Quadricentennial",
        "map_component": "MapLayout",
        "entrance_point": {
          "x": 650,
          "y": 250
        },
        "parking_spots": [
          {
            "spot_id": "A1",
            "sensor_id": 7,
            "position": {
              "x": 685,
              "y": 116
            },
            "dimensions": {
              "width": 57,
              "height": 45
            },
            "rotation": "90deg",
            "section": "A"
          },
          {
            "spot_id": "B1",
            "sensor_id": 4,
            "position": {
              "x": 635,
              "y": 32
            },
            "dimensions": {
              "width": 40,
              "height": 55
            },
            "rotation": "0deg",
            "section": "B"
          }
          // ... more spots
        ],
        "navigation_waypoints": [
          {
            "id": "entrance",
            "position": {
              "x": 650,
              "y": 250
            }
          },
          {
            "id": "intersectionA",
            "position": {
              "x": 650,
              "y": 150
            }
          },
          {
            "id": "intersectionH",
            "position": {
              "x": 600,
              "y": 900
            }
          }
          // ... more waypoints
        ],
        "navigation_routes": [
          {
            "section": "H",
            "waypoints": ["entrance", "intersectionH", "destination"]
          },
          {
            "section": "A",
            "waypoints": ["entrance", "intersectionA", "destination"]
          }
          // ... more routes
        ],
        "gesture_limits": {
          "maxTranslateX": 300,
          "minTranslateX": -300,
          "maxTranslateY": 200,
          "minTranslateY": -600,
          "minScale": 0.7,
          "maxScale": 3,
          "clampMinScale": 0.8,
          "clampMaxScale": 2.5
        },
        "initial_view": {
          "translateX": -300,
          "translateY": 100,
          "scale": 1
        }
      }
      // ... more floors
    ],
    "last_updated": "2025-12-02T10:30:00Z",
    "version": "1.0.0"
  },
  "message": "Configuration loaded successfully"
}
```

## Data Structure Definitions

### ParkingLocationConfig
Root configuration object for a parking location.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| location_id | string | Yes | Unique identifier (e.g., "usjr_quadricentennial") |
| location_name | string | Yes | Display name for the location |
| floors | FloorConfig[] | Yes | Array of floor configurations |
| last_updated | string (ISO 8601) | Yes | Last modification timestamp |
| version | string | Yes | Configuration version (semantic versioning) |

### FloorConfig
Configuration for a single floor.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| floor_number | number | Yes | Floor number (e.g., 4) |
| floor_name | string | Yes | Display name (e.g., "4th Floor") |
| building_name | string | Yes | Building name to display |
| map_component | string | No | Component name for custom layouts |
| entrance_point | Position | Yes | Main entrance coordinates |
| parking_spots | ParkingSpotConfig[] | Yes | Array of parking spot definitions |
| navigation_waypoints | NavigationWaypoint[] | Yes | Waypoints for navigation |
| navigation_routes | NavigationRoute[] | Yes | Routes to each section |
| gesture_limits | GestureLimits | No | Optional pan/zoom limits |
| initial_view | InitialView | No | Optional initial camera position |

### ParkingSpotConfig
Defines a single parking spot.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| spot_id | string | Yes | Unique spot identifier (e.g., "A1") |
| sensor_id | number | Yes | Physical sensor ID |
| position | Position | Yes | X,Y coordinates on the map |
| dimensions | Dimensions | Yes | Width and height in pixels |
| rotation | string | Yes | CSS rotation (e.g., "0deg", "90deg") |
| section | string | Yes | Section letter (e.g., "A", "B") |

### Position
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| x | number | Yes | X coordinate in pixels |
| y | number | Yes | Y coordinate in pixels |

### Dimensions
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| width | number | Yes | Width in pixels |
| height | number | Yes | Height in pixels |

### NavigationWaypoint
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique waypoint ID |
| position | Position | Yes | X,Y coordinates |

### NavigationRoute
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| section | string | Yes | Section this route serves (e.g., "A") |
| waypoints | string[] | Yes | Ordered list of waypoint IDs. Use "destination" as final waypoint |

### GestureLimits
Optional pan and zoom limits.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| maxTranslateX | number | No | 300 | Maximum X translation |
| minTranslateX | number | No | -300 | Minimum X translation |
| maxTranslateY | number | No | 200 | Maximum Y translation |
| minTranslateY | number | No | -600 | Minimum Y translation |
| minScale | number | No | 0.7 | Minimum zoom level |
| maxScale | number | No | 3 | Maximum zoom level |
| clampMinScale | number | No | 0.8 | Minimum clamped zoom |
| clampMaxScale | number | No | 2.5 | Maximum clamped zoom |

### InitialView
Optional initial camera position.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| translateX | number | No | 0 | Initial X translation |
| translateY | number | No | 0 | Initial Y translation |
| scale | number | No | 1 | Initial zoom level |

## Error Responses

### Not Found
```json
{
  "success": false,
  "message": "Location not found",
  "data": null
}
```

### Invalid Request
```json
{
  "success": false,
  "message": "Invalid location_id format",
  "data": null
}
```

### Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "data": null
}
```

## Implementation Notes

### 1. Caching
- The mobile app caches configurations for 24 hours
- Include proper `Cache-Control` headers
- Use versioning to invalidate cached configs

### 2. Sensor ID Mapping
- Each `sensor_id` must be unique within a floor
- The `sensor_id` maps to real-time sensor data from `/api/public/parking`
- Ensure consistency between parking config and real-time data

### 3. Coordinate System
- Coordinates are in pixels relative to the map image
- Origin (0,0) is top-left corner
- Positive X is rightward, positive Y is downward

### 4. Rotation Values
- Valid values: "0deg", "90deg", "180deg", "270deg", "-90deg"
- Rotation is clockwise
- Affects parking spot rendering orientation

### 5. Navigation Routes
- Each section (A, B, C, etc.) should have a corresponding route
- Routes are arrays of waypoint IDs
- Always end routes with "destination" which resolves to the actual parking spot
- Waypoints define the path from entrance to parking spot

## Admin Panel Requirements

The business should be able to:

1. **Add/Remove Parking Spots**
   - Specify spot ID, sensor ID, position, dimensions, rotation
   - Drag-and-drop interface recommended

2. **Modify Sensor Mappings**
   - Change which sensor_id maps to which spot_id
   - Bulk import/export

3. **Configure Navigation**
   - Define waypoints
   - Create routes per section
   - Visual route editor recommended

4. **Multi-Floor Management**
   - Add/remove floors
   - Copy configurations between floors

5. **Version Control**
   - Track configuration changes
   - Rollback capability
   - Preview before publishing

## Database Schema Recommendation

### Tables

**locations**
```sql
CREATE TABLE locations (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**floors**
```sql
CREATE TABLE floors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id VARCHAR(100) NOT NULL,
  floor_number INT NOT NULL,
  floor_name VARCHAR(100) NOT NULL,
  building_name VARCHAR(255) NOT NULL,
  entrance_x INT NOT NULL,
  entrance_y INT NOT NULL,
  config_json JSON,
  FOREIGN KEY (location_id) REFERENCES locations(id),
  UNIQUE KEY unique_floor (location_id, floor_number)
);
```

**parking_spots**
```sql
CREATE TABLE parking_spots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  floor_id INT NOT NULL,
  spot_id VARCHAR(20) NOT NULL,
  sensor_id INT NOT NULL,
  section VARCHAR(10) NOT NULL,
  position_x INT NOT NULL,
  position_y INT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  rotation VARCHAR(20) NOT NULL,
  FOREIGN KEY (floor_id) REFERENCES floors(id),
  UNIQUE KEY unique_spot (floor_id, spot_id),
  UNIQUE KEY unique_sensor (floor_id, sensor_id)
);
```

**navigation_waypoints**
```sql
CREATE TABLE navigation_waypoints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  floor_id INT NOT NULL,
  waypoint_id VARCHAR(50) NOT NULL,
  position_x INT NOT NULL,
  position_y INT NOT NULL,
  FOREIGN KEY (floor_id) REFERENCES floors(id),
  UNIQUE KEY unique_waypoint (floor_id, waypoint_id)
);
```

**navigation_routes**
```sql
CREATE TABLE navigation_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  floor_id INT NOT NULL,
  section VARCHAR(10) NOT NULL,
  waypoints JSON NOT NULL,
  FOREIGN KEY (floor_id) REFERENCES floors(id),
  UNIQUE KEY unique_route (floor_id, section)
);
```

## Testing Checklist

- [ ] API returns valid JSON for existing location
- [ ] API returns 404 for non-existent location
- [ ] All parking spots have unique sensor_ids
- [ ] All parking spots have unique spot_ids
- [ ] Navigation routes reference valid waypoint IDs
- [ ] Configuration validates against TypeScript types
- [ ] Mobile app successfully loads and caches config
- [ ] Fallback to hardcoded config works when API fails
- [ ] Real-time sensor data maps correctly to spots

## Migration Strategy

### Phase 1: Deploy Backend API (Week 1)
1. Implement database tables
2. Create API endpoint
3. Migrate existing Floor 4 data
4. Test with Postman/curl

### Phase 2: Mobile App Update (Week 2)
1. Mobile app already updated (this implementation)
2. Test with backend API
3. Verify fallback mechanism
4. Deploy to test users

### Phase 3: Admin Panel (Week 3-4)
1. Create admin interface
2. Implement drag-and-drop spot placement
3. Visual navigation route editor
4. Test full workflow

### Phase 4: Production Rollout (Week 5)
1. Load test API endpoint
2. Train business users
3. Monitor performance
4. Gradual rollout

## Support

For questions or issues:
- Mobile App: Check `/src/services/ParkingConfigService.tsx`
- Type Definitions: Check `/src/types/parkingConfig.ts`
- API Integration: Contact backend team

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-02
**Maintained By:** Development Team
