import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MapLayoutProps {
  styles: any;
}

// Spot layout template - positions are shared across all floors
// To change spot positions, modify the x, y values here
// To change spot sizes, modify the width, height values
// To change spot rotation, modify the rotation value
export const SPOT_LAYOUT = [
  // Section A - near entrance
  { section: 'A', index: 1, position: { x: 690, y: 95 }, dimensions: { width: 40, height: 55 }, rotation: '90deg' },

  // Section B - top row
  { section: 'B', index: 4, position: { x: 500, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'B', index: 3, position: { x: 545, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'B', index: 2, position: { x: 590, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'B', index: 1, position: { x: 635, y: 32 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
 
  // Section C - neaar elevator 1
  { section: 'C', index: 1, position: { x: 450, y: 95 }, dimensions: { width: 40, height: 55 }, rotation: '-90deg' },
  { section: 'C', index: 2, position: { x: 450, y: 140 }, dimensions: { width: 40, height: 55 }, rotation: '-90deg' },

  // Section D - upper middle row
  { section: 'D', index: 7, position: { x: 130, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'D', index: 6, position: { x: 175, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'D', index: 5, position: { x: 220, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'D', index: 4, position: { x: 265, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'D', index: 3, position: { x: 310, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'D', index: 2, position: { x: 355, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'D', index: 1, position: { x: 400, y: 200 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },

  // Section J - middle row
  { section: 'J', index: 5, position: { x: 220, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'J', index: 4, position: { x: 280, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'J', index: 3, position: { x: 340, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'J', index: 2, position: { x: 400, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'J', index: 1, position: { x: 460, y: 370 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },

  // Section E - left side
  { section: 'E', index: 3, position: { x: 55, y: 315 }, dimensions: { width: 55, height: 60 }, rotation: '90deg' },
  { section: 'E', index: 2, position: { x: 55, y: 380 }, dimensions: { width: 55, height: 60 }, rotation: '90deg' },
  { section: 'E', index: 1, position: { x: 55, y: 445 }, dimensions: { width: 55, height: 60 }, rotation: '90deg' },

  // Section F - lower middle row
  { section: 'F', index: 1, position: { x: 140, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'F', index: 2, position: { x: 185, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'F', index: 3, position: { x: 230, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'F', index: 4, position: { x: 275, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'F', index: 5, position: { x: 320, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'F', index: 6, position: { x: 365, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },
  { section: 'F', index: 7, position: { x: 410, y: 520 }, dimensions: { width: 40, height: 55 }, rotation: '0deg' },

  // Section G - left column bottom
  { section: 'G', index: 1, position: { x: 500, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '90deg' },
  { section: 'G', index: 2, position: { x: 500, y: 640 }, dimensions: { width: 40, height: 55 }, rotation: '90deg' },
  { section: 'G', index: 3, position: { x: 500, y: 690 }, dimensions: { width: 40, height: 55 }, rotation: '90deg' },
  { section: 'G', index: 4, position: { x: 500, y: 740 }, dimensions: { width: 40, height: 55 }, rotation: '90deg' },
  { section: 'G', index: 5, position: { x: 500, y: 790 }, dimensions: { width: 40, height: 55 }, rotation: '90deg' },

  // Section H - bottom row
  { section: 'H', index: 1, position: { x: 550, y: 870 }, dimensions: { width: 40, height: 55 }, rotation: '180deg' },
  { section: 'H', index: 2, position: { x: 595, y: 870 }, dimensions: { width: 40, height: 55 }, rotation: '180deg' },
  { section: 'H', index: 3, position: { x: 640, y: 870 }, dimensions: { width: 40, height: 55 }, rotation: '180deg' },

  // Section I - right column bottom
  { section: 'I', index: 5, position: { x: 680, y: 590 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'I', index: 4, position: { x: 680, y: 640 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'I', index: 3, position: { x: 680, y: 690 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'I', index: 2, position: { x: 680, y: 740 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
  { section: 'I', index: 1, position: { x: 680, y: 790 }, dimensions: { width: 40, height: 55 }, rotation: '270deg' },
];

// Navigation waypoints - adjust x, y to change navigation path positions
// You can add custom waypoints for each slot (e.g., 'A1_turn', 'B2_turn')
export const NAVIGATION_WAYPOINTS = [
  // Default entrance
  { id: 'entrance', position: { x: 650, y: 250 } },

  // Section-specific entrances (customize starting point per section)
  { id: 'entranceA', position: { x: 650, y: 250 } },
  { id: 'entranceB', position: { x: 650, y: 250 } },
  { id: 'entranceC', position: { x: 650, y: 250 } },
  { id: 'entranceD', position: { x: 620, y: 280 } },
  { id: 'entranceE', position: { x: 650, y: 250 } },
  { id: 'entranceF', position: { x: 650, y: 250 } },
  { id: 'entranceG', position: { x: 650, y: 250 } },
  { id: 'entranceH', position: { x: 650, y: 250 } },
  { id: 'entranceI', position: { x: 650, y: 250 } },
  { id: 'entranceJ', position: { x: 650, y: 250 } },

  // Section intersection waypoints
  { id: 'intersectionA', position: { x: 650, y: 125 } },
  { id: 'intersectionB', position: { x: 560, y: 125 } },
  { id: 'intersectionC', position: { x: 467, y: 150 } },
  { id: 'intersectionD', position: { x: 270, y: 260 } },
  { id: 'intersectionE', position: { x: 120, y: 380 } },
  { id: 'intersectionF', position: { x: 270, y: 580 } },
  { id: 'intersectionG', position: { x: 560, y: 700 } },
  { id: 'intersectionH', position: { x: 600, y: 920 } },
  { id: 'intersectionI', position: { x: 720, y: 700 } },
  { id: 'intersectionJ', position: { x: 350, y: 430 } },

  // Section A slot waypoints
  { id: 'A1_turn', position: { x: 710, y: 125 } },

  // Section B slot waypoints
  { id: 'B1_turn', position: { x: 655, y: 130 } },
  { id: 'B2_turn', position: { x: 610, y: 125 } },
  { id: 'B3_turn', position: { x: 565, y: 130 } },
  { id: 'B4_turn', position: { x: 525, y: 125 } },

  // Section C slot waypoints
  { id: 'C1_turn', position: { x: 500, y: 125 } },
  { id: 'C2_turn', position: { x: 525, y: 170 } },

  // Section D slot waypoints
  { id: 'D1_turn', position: { x: 420, y: 280 } },
  { id: 'D2_turn', position: { x: 376, y: 280 } },
  { id: 'D3_turn', position: { x: 330, y: 280 } },
  { id: 'D4_turn', position: { x: 285, y: 280 } },
  { id: 'D5_turn', position: { x: 240, y: 280 } },
  { id: 'D6_turn', position: { x: 195, y: 280 } },
  { id: 'D7_turn', position: { x: 150, y: 280 } },

  // Section E slot waypoints
  { id: 'E1_turn', position: { x: 120, y: 475 } },
  { id: 'E2_turn', position: { x: 120, y: 410 } },
  { id: 'E3_turn', position: { x: 120, y: 345 } },

  // Section F slot waypoints
  { id: 'F1_turn', position: { x: 160, y: 580 } },
  { id: 'F2_turn', position: { x: 205, y: 580 } },
  { id: 'F3_turn', position: { x: 250, y: 580 } },
  { id: 'F4_turn', position: { x: 295, y: 580 } },
  { id: 'F5_turn', position: { x: 340, y: 580 } },
  { id: 'F6_turn', position: { x: 385, y: 580 } },
  { id: 'F7_turn', position: { x: 430, y: 580 } },

  // Section G slot waypoints
  { id: 'G1_turn', position: { x: 560, y: 620 } },
  { id: 'G2_turn', position: { x: 560, y: 670 } },
  { id: 'G3_turn', position: { x: 560, y: 720 } },
  { id: 'G4_turn', position: { x: 560, y: 770 } },
  { id: 'G5_turn', position: { x: 560, y: 820 } },

  // Section H slot waypoints
  { id: 'H1_turn', position: { x: 570, y: 920 } },
  { id: 'H2_turn', position: { x: 615, y: 920 } },
  { id: 'H3_turn', position: { x: 660, y: 920 } },

  // Section I slot waypoints
  { id: 'I1_turn', position: { x: 720, y: 820 } },
  { id: 'I2_turn', position: { x: 720, y: 770 } },
  { id: 'I3_turn', position: { x: 720, y: 720 } },
  { id: 'I4_turn', position: { x: 720, y: 670 } },
  { id: 'I5_turn', position: { x: 720, y: 620 } },

  // Section J slot waypoints
  { id: 'J1_turn', position: { x: 480, y: 400 } },
  { id: 'J2_turn', position: { x: 420, y: 400 } },
  { id: 'J3_turn', position: { x: 360, y: 400 } },
  { id: 'J4_turn', position: { x: 300, y: 400 } },
  { id: 'J5_turn', position: { x: 240, y: 400 } },
];

// Destination offsets - customize where the line ends for each spot
// offsetX: horizontal offset from spot position, offsetY: vertical offset from spot position
export const DESTINATION_OFFSETS: { [key: string]: { offsetX: number; offsetY: number } } = {
  // Section A
  'A1': { offsetX: -5, offsetY: 30 },

  // Section B
  'B1': { offsetX: 20, offsetY: 50 },
  'B2': { offsetX: 20, offsetY: 50 },
  'B3': { offsetX: 15, offsetY: 55 },
  'B4': { offsetX: 25, offsetY: 55 },

  // Section C
  'C1': { offsetX: 50, offsetY: 30 },
  'C2': { offsetX: 50, offsetY: 30 },

  // Section D
  'D1': { offsetX: 20, offsetY: 60 },
  'D2': { offsetX: 20, offsetY: 60 },
  'D3': { offsetX: 20, offsetY: 60 },
  'D4': { offsetX: 20, offsetY: 60 },
  'D5': { offsetX: 20, offsetY: 60 },
  'D6': { offsetX: 20, offsetY: 60 },
  'D7': { offsetX: 20, offsetY: 60 },

  // Section E
  'E1': { offsetX: 70, offsetY: 30 },
  'E2': { offsetX: 70, offsetY: 30 },
  'E3': { offsetX: 70, offsetY: 30 },

  // Section F
  'F1': { offsetX: 20, offsetY: -10 },
  'F2': { offsetX: 20, offsetY: -10 },
  'F3': { offsetX: 20, offsetY: -10 },
  'F4': { offsetX: 20, offsetY: -10 },
  'F5': { offsetX: 20, offsetY: -10 },
  'F6': { offsetX: 20, offsetY: -10 },
  'F7': { offsetX: 20, offsetY: -10 },

  // Section G
  'G1': { offsetX: 60, offsetY: 30 },
  'G2': { offsetX: 60, offsetY: 30 },
  'G3': { offsetX: 60, offsetY: 30 },
  'G4': { offsetX: 60, offsetY: 30 },
  'G5': { offsetX: 60, offsetY: 30 },

  // Section H
  'H1': { offsetX: 20, offsetY: -10 },
  'H2': { offsetX: 20, offsetY: -10 },
  'H3': { offsetX: 20, offsetY: -10 },

  // Section I
  'I1': { offsetX: -20, offsetY: 30 },
  'I2': { offsetX: -20, offsetY: 30 },
  'I3': { offsetX: -20, offsetY: 30 },
  'I4': { offsetX: -20, offsetY: 30 },
  'I5': { offsetX: -20, offsetY: 30 },

  // Section J
  'J1': { offsetX: -20, offsetY: 30 },
  'J2': { offsetX: -20, offsetY: 30 },
  'J3': { offsetX: -20, offsetY: 30 },
  'J4': { offsetX: -20, offsetY: 30 },
  'J5': { offsetX: -20, offsetY: 30 },
};

// Navigation routes - path from entrance to each slot (customizable per index)
export const NAVIGATION_ROUTES = [
  // Section A
  { section: 'A', index: 1, waypoints: ['entrance', 'intersectionA', 'destination'] },

  // Section B
  { section: 'B', index: 1, waypoints: ['entrance', 'destination'] },
  { section: 'B', index: 2, waypoints: ['entrance', 'intersectionA', 'B2_turn', 'destination'] },
  { section: 'B', index: 3, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'destination'] },
  { section: 'B', index: 4, waypoints: ['entrance', 'intersectionA', 'B4_turn', 'destination'] },

  // Section C
  { section: 'C', index: 1, waypoints: ['entrance', 'intersectionA', 'destination'] },
  { section: 'C', index: 2, waypoints: ['entrance', 'intersectionA', 'B4_turn', 'C2_turn', 'destination'] },

  // Section D
  { section: 'D', index: 1, waypoints: ['entranceD', 'D1_turn', 'destination'] },
  { section: 'D', index: 2, waypoints: ['entranceD', 'D2_turn', 'destination'] },
  { section: 'D', index: 3, waypoints: ['entranceD', 'D3_turn','destination'] },
  { section: 'D', index: 4, waypoints: ['entranceD', 'D4_turn', 'destination'] },
  { section: 'D', index: 5, waypoints: ['entranceD', 'D5_turn', 'destination'] },
  { section: 'D', index: 6, waypoints: ['entranceD', 'D6_turn', 'destination'] },
  { section: 'D', index: 7, waypoints: ['entranceD', 'D7_turn', 'destination'] },

  // Section E
  { section: 'E', index: 1, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'destination'] },
  { section: 'E', index: 2, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'destination'] },
  { section: 'E', index: 3, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'destination'] },

  // Section F
  { section: 'F', index: 1, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'destination'] },
  { section: 'F', index: 2, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'destination'] },
  { section: 'F', index: 3, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'destination'] },
  { section: 'F', index: 4, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'destination'] },
  { section: 'F', index: 5, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'destination'] },
  { section: 'F', index: 6, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'destination'] },
  { section: 'F', index: 7, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'destination'] },

  // Section G
  { section: 'G', index: 1, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'destination'] },
  { section: 'G', index: 2, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'destination'] },
  { section: 'G', index: 3, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'destination'] },
  { section: 'G', index: 4, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'destination'] },
  { section: 'G', index: 5, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'destination'] },

  // Section H
  { section: 'H', index: 1, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'destination'] },
  { section: 'H', index: 2, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'destination'] },
  { section: 'H', index: 3, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'destination'] },

  // Section I
  { section: 'I', index: 1, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'intersectionI', 'destination'] },
  { section: 'I', index: 2, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'intersectionI', 'destination'] },
  { section: 'I', index: 3, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'intersectionI', 'destination'] },
  { section: 'I', index: 4, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'intersectionI', 'destination'] },
  { section: 'I', index: 5, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionE', 'intersectionF', 'intersectionG', 'intersectionH', 'intersectionI', 'destination'] },

  // Section J
  { section: 'J', index: 1, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionJ', 'destination'] },
  { section: 'J', index: 2, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionJ', 'destination'] },
  { section: 'J', index: 3, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionJ', 'destination'] },
  { section: 'J', index: 4, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionJ', 'destination'] },
  { section: 'J', index: 5, waypoints: ['entrance', 'intersectionA', 'intersectionB', 'intersectionC', 'intersectionD', 'intersectionJ', 'destination'] },
];

// Gesture limits for map interaction
export const GESTURE_LIMITS = {
  maxTranslateX: 300,
  minTranslateX: -300,
  maxTranslateY: 200,
  minTranslateY: -600,
  minScale: 0.7,
  maxScale: 3,
  clampMinScale: 0.8,
  clampMaxScale: 2.5,
};

// Initial view position
export const INITIAL_VIEW = {
  translateX: -300,
  translateY: 100,
  scale: 1,
};

// Entrance point
export const ENTRANCE_POINT = { x: 650, y: 250 };

// Helper function to generate floor-specific spots from layout template
export const generateFloorSpots = (floorNumber: number) => {
  return SPOT_LAYOUT.map(spot => ({
    spot_id: `${floorNumber}${spot.section}${spot.index}`,
    sensor_id: null,
    position: spot.position,
    dimensions: spot.dimensions,
    rotation: spot.rotation,
    section: spot.section,
  }));
};

export const MapLayout: React.FC<MapLayoutProps> = ({ styles }) => {
  return (
    <>

      {/* Elevator 1 */}
      <View style={styles.elevator1}>
        <Text style={styles.elevatorText}>Elevator</Text>
      </View>

      {/* Elevator 2 */}
      <View style={styles.elevator2}>
        <Text style={styles.elevatorText}>Elevator</Text>
      </View>

      {/* Elevator 3 */}
      <View style={styles.elevator3}>
        <Text style={styles.elevatorText}>Elevator</Text>
      </View>

      {/* Stairs */}
      <View style={styles.stairs}>
        <Text style={styles.stairsText}>STAIRS</Text>
      </View>

      {/* Entrance */}
      <View style={styles.entrance}>
        <Text style={styles.entranceText}>Entrance</Text>
      </View>

      {/* Exit Sign */}
      <View style={styles.exitSign}>
        <Text style={styles.exitText}>EXIT</Text>
      </View>

      {/* Arrow 1 */}
      <View style={styles.arrow1}>
        <Ionicons name="arrow-up" size={28} color="white" />
      </View>

      {/* Arrow 2 */}
      <View style={styles.arrow2}>
        <Ionicons name="arrow-back" size={28} color="white" />
      </View>

      {/* Arrow 3 */}
      <View style={styles.arrow3}>
        <Ionicons name="arrow-back" size={28} color="white" />
      </View>

      {/* Arrow 4 */}
      <View style={styles.arrow4}>
        <Ionicons name="arrow-down" size={28} color="white" />
      </View>

      {/* Arrow 5 */}
      <View style={styles.arrow5}>
        <Ionicons name="arrow-down" size={28} color="white" />
      </View>

      {/* Arrow 6 */}
      <View style={styles.arrow6}>
        <Ionicons name="arrow-back" size={28} color="white" />
      </View>

      {/* Arrow 7 */}
      <View style={styles.arrow7}>
        <Ionicons name="arrow-back" size={28} color="white" />
      </View>

      {/* Arrow 8 */}
      <View style={styles.arrow8}>
        <Ionicons name="arrow-back" size={28} color="white" />
      </View>

      {/* Arrow 9 */}
      <View style={styles.arrow9}>
        <Ionicons name="arrow-down" size={28} color="white" />
      </View>

      {/* Arrow 11 */}
      <View style={styles.arrow11}>
        <Ionicons name="arrow-forward" size={28} color="white" />
      </View>

      {/* Arrow 12 */}
      <View style={styles.arrow12}>
        <Ionicons name="arrow-forward" size={28} color="white" />
      </View>

      {/* Arrow 13 */}
      <View style={styles.arrow13}>
        <Ionicons name="arrow-forward" size={28} color="white" />
      </View>

      {/* Arrow 14 */}
      <View style={styles.arrow14}>
        <Ionicons name="arrow-down" size={28} color="white" />
      </View>

      {/* Arrow 15 */}
      <View style={styles.arrow15}>
        <Ionicons name="arrow-down" size={28} color="white" />
      </View>

      {/* Arrow 16 */}
      <View style={styles.arrow16}>
        <Ionicons name="arrow-down" size={28} color="white" />
      </View>

      {/* Arrow 17 */}
      <View style={styles.arrow17}>
        <Ionicons name="arrow-forward" size={28} color="white" />
      </View>

      {/* Arrow 18 */}
      <View style={styles.arrow18}>
        <Ionicons name="arrow-up" size={28} color="white" />
      </View>

      {/* Arrow 19 */}
      <View style={styles.arrow19}>
        <Ionicons name="arrow-up" size={28} color="white" />
      </View>

      {/* Arrow 20 */}
      <View style={styles.arrow20}>
        <Ionicons name="arrow-up" size={28} color="white" />
      </View>

      {/* Arrow 21 */}
      <View style={styles.arrow21}>
        <Ionicons name="arrow-forward" size={28} color="white" />
      </View>
    </>
  );
};
