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
// Main corridor waypoints
export const NAVIGATION_WAYPOINTS = [
  { id: 'entrance', position: { x: 650, y: 250 } },

  // Main vertical corridor from entrance
  { id: 'corridor1', position: { x: 650, y: 130 } },  // Turn point for B section

  // Section A waypoint (directly above entrance)
  { id: 'A1_turn', position: { x: 690, y: 130 } },

  // Section B waypoints - horizontal turns for each spot
  { id: 'B2_turn', position: { x: 610, y: 130 } },
  { id: 'B3_turn', position: { x: 565, y: 130 } },
  { id: 'B4_turn', position: { x: 520, y: 130 } },

  // Section C waypoints
  { id: 'C_corridor', position: { x: 540, y: 130 } },
  { id: 'C1_turn', position: { x: 500, y: 130 } },
  { id: 'C2_turn', position: { x: 540, y: 170 } },

  // Main horizontal corridor for D, E, F, J sections
  { id: 'corridor2', position: { x: 650, y: 300 } },  // From entrance going down
  { id: 'corridor3', position: { x: 650, y: 450 } },  // Continue down
  { id: 'corridor4', position: { x: 550, y: 450 } },  // Turn left
  { id: 'corridor5', position: { x: 200, y: 450 } },  // Continue left for E section

  // Section D waypoints
  { id: 'D_corridor', position: { x: 200, y: 260 } },
  { id: 'D1_turn', position: { x: 420, y: 260 } },
  { id: 'D2_turn', position: { x: 375, y: 260 } },
  { id: 'D3_turn', position: { x: 330, y: 260 } },
  { id: 'D4_turn', position: { x: 285, y: 260 } },
  { id: 'D5_turn', position: { x: 240, y: 260 } },
  { id: 'D6_turn', position: { x: 195, y: 260 } },
  { id: 'D7_turn', position: { x: 150, y: 260 } },

  // Section E waypoints
  { id: 'E_corridor', position: { x: 120, y: 450 } },
  { id: 'E1_turn', position: { x: 120, y: 475 } },
  { id: 'E2_turn', position: { x: 120, y: 410 } },
  { id: 'E3_turn', position: { x: 120, y: 345 } },

  // Section F waypoints
  { id: 'F_corridor', position: { x: 200, y: 580 } },
  { id: 'F1_turn', position: { x: 160, y: 580 } },
  { id: 'F2_turn', position: { x: 205, y: 580 } },
  { id: 'F3_turn', position: { x: 250, y: 580 } },
  { id: 'F4_turn', position: { x: 295, y: 580 } },
  { id: 'F5_turn', position: { x: 340, y: 580 } },
  { id: 'F6_turn', position: { x: 385, y: 580 } },
  { id: 'F7_turn', position: { x: 430, y: 580 } },

  // Section J waypoints
  { id: 'J_corridor', position: { x: 500, y: 430 } },
  { id: 'J1_turn', position: { x: 480, y: 430 } },
  { id: 'J2_turn', position: { x: 420, y: 430 } },
  { id: 'J3_turn', position: { x: 360, y: 430 } },
  { id: 'J4_turn', position: { x: 300, y: 430 } },
  { id: 'J5_turn', position: { x: 240, y: 430 } },

  // Bottom section corridor
  { id: 'corridor6', position: { x: 600, y: 550 } },
  { id: 'corridor7', position: { x: 600, y: 830 } },

  // Section G waypoints
  { id: 'G_corridor', position: { x: 560, y: 550 } },
  { id: 'G1_turn', position: { x: 560, y: 610 } },
  { id: 'G2_turn', position: { x: 560, y: 660 } },
  { id: 'G3_turn', position: { x: 560, y: 710 } },
  { id: 'G4_turn', position: { x: 560, y: 760 } },
  { id: 'G5_turn', position: { x: 560, y: 810 } },

  // Section H waypoints
  { id: 'H_corridor', position: { x: 600, y: 920 } },
  { id: 'H1_turn', position: { x: 570, y: 920 } },
  { id: 'H2_turn', position: { x: 615, y: 920 } },
  { id: 'H3_turn', position: { x: 660, y: 920 } },

  // Section I waypoints
  { id: 'I_corridor', position: { x: 720, y: 830 } },
  { id: 'I1_turn', position: { x: 720, y: 810 } },
  { id: 'I2_turn', position: { x: 720, y: 760 } },
  { id: 'I3_turn', position: { x: 720, y: 710 } },
  { id: 'I4_turn', position: { x: 720, y: 660 } },
  { id: 'I5_turn', position: { x: 720, y: 610 } },
];

// Navigation routes - path from entrance to each spot
// Each route goes: entrance -> corridor -> turn point aligned with spot -> destination
export const NAVIGATION_ROUTES = [
  // Section A - right of entrance, go up then right
  { section: 'A', index: 1, waypoints: ['entrance', 'corridor1', 'A1_turn'] },

  // Section B - top row, go up then turn at each spot's x position
  { section: 'B', index: 1, waypoints: ['entrance', 'destination'] },
  { section: 'B', index: 2, waypoints: ['entrance', 'corridor1', 'B2_turn', 'destination'] },
  { section: 'B', index: 3, waypoints: ['entrance', 'corridor1', 'B3_turn', 'destination'] },
  { section: 'B', index: 4, waypoints: ['entrance', 'corridor1', 'B4_turn', 'destination'] },

  // Section C - near elevator 1, go up, turn left, then to spot
  { section: 'C', index: 1, waypoints: ['entrance', 'corridor1', 'C_corridor', 'C1_turn'] },
  { section: 'C', index: 2, waypoints: ['entrance', 'corridor1', 'C_corridor', 'C2_turn', 'destination'] },

  // Section D - upper middle, go down, left through corridors, up to D row
  { section: 'D', index: 1, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'D1_turn', 'destination'] },
  { section: 'D', index: 2, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'D2_turn', 'destination'] },
  { section: 'D', index: 3, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'D3_turn', 'destination'] },
  { section: 'D', index: 4, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'D4_turn', 'destination'] },
  { section: 'D', index: 5, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'D5_turn', 'destination'] },
  { section: 'D', index: 6, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'D6_turn', 'destination'] },
  { section: 'D', index: 7, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'D7_turn', 'destination'] },

  // Section E - left side, go down and left
  { section: 'E', index: 1, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'E_corridor', 'E1_turn', 'destination'] },
  { section: 'E', index: 2, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'E_corridor', 'E2_turn', 'destination'] },
  { section: 'E', index: 3, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'E_corridor', 'E3_turn', 'destination'] },

  // Section F - lower middle row
  { section: 'F', index: 1, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'F_corridor', 'F1_turn', 'destination'] },
  { section: 'F', index: 2, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'F_corridor', 'F2_turn', 'destination'] },
  { section: 'F', index: 3, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'F_corridor', 'F3_turn', 'destination'] },
  { section: 'F', index: 4, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'F_corridor', 'F4_turn', 'destination'] },
  { section: 'F', index: 5, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'F_corridor', 'F5_turn', 'destination'] },
  { section: 'F', index: 6, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'F_corridor', 'F6_turn', 'destination'] },
  { section: 'F', index: 7, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'corridor5', 'F_corridor', 'F7_turn', 'destination'] },

  // Section G - left column bottom
  { section: 'G', index: 1, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'G_corridor', 'G1_turn', 'destination'] },
  { section: 'G', index: 2, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'G_corridor', 'G2_turn', 'destination'] },
  { section: 'G', index: 3, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'G_corridor', 'G3_turn', 'destination'] },
  { section: 'G', index: 4, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'G_corridor', 'G4_turn', 'destination'] },
  { section: 'G', index: 5, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'G_corridor', 'G5_turn', 'destination'] },

  // Section H - bottom row
  { section: 'H', index: 1, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'H_corridor', 'H1_turn', 'destination'] },
  { section: 'H', index: 2, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'H_corridor', 'H2_turn', 'destination'] },
  { section: 'H', index: 3, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'H_corridor', 'H3_turn', 'destination'] },

  // Section I - right column bottom
  { section: 'I', index: 1, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'I_corridor', 'I1_turn', 'destination'] },
  { section: 'I', index: 2, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'I_corridor', 'I2_turn', 'destination'] },
  { section: 'I', index: 3, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'I_corridor', 'I3_turn', 'destination'] },
  { section: 'I', index: 4, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'I_corridor', 'I4_turn', 'destination'] },
  { section: 'I', index: 5, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor6', 'corridor7', 'I_corridor', 'I5_turn', 'destination'] },

  // Section J - middle row
  { section: 'J', index: 1, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'J1_turn', 'destination'] },
  { section: 'J', index: 2, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'J2_turn', 'destination'] },
  { section: 'J', index: 3, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'J3_turn', 'destination'] },
  { section: 'J', index: 4, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'J4_turn', 'destination'] },
  { section: 'J', index: 5, waypoints: ['entrance', 'corridor2', 'corridor3', 'corridor4', 'J_corridor', 'J5_turn', 'destination'] },
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
