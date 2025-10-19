import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface MapLayoutProps {
  styles: any;
}

export const MapLayout: React.FC<MapLayoutProps> = ({ styles }) => {
  return (
    <>
      {/* Section A - Box */}
      <View style={{ position: 'absolute', left: 690, top: 110, width: 44, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 690, top: 170, width: 44, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section B - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 498, top: 30, width: 180, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 498, top: 90, width: 180, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section B - Vertical dividers */}
      <View style={{ position: 'absolute', left: 540, top: 30, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 585, top: 30, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 630, top: 30, width: 2, height: 59, backgroundColor: '#fff' }} />
      
      {/* Section C - Vertical dividers */}
      <View style={{ position: 'absolute', left: 437, top: 100, width: 2, height: 90, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 497, top: 98, width: 2, height: 90, backgroundColor: '#fff' }} />
      
      {/* Section C - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 440, top: 145, width: 58, height: 2, backgroundColor: '#fff' }} />
    
      {/* Section D - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 100, top: 198, width: 335, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 100, top: 257, width: 335, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section D - Vertical dividers */}
      <View style={{ position: 'absolute', left: 150, top: 198, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 205, top: 198, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 250, top: 198, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 305, top: 198, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 350, top: 198, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 395, top: 198, width: 2, height: 59, backgroundColor: '#fff' }} />
      
      {/* Section E - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 53, top: 313, width: 2, height: 205, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 112, top: 313, width: 2, height: 205, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 53, top: 375, width: 59, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 53, top: 440, width: 59, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section F - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 115, top: 518, width: 330, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 115, top: 577, width: 330, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section F - Vertical dividers */}
      <View style={{ position: 'absolute', left: 160, top: 518, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 215, top: 518, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 260, top: 518, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 305, top: 518, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 360, top: 518, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 405, top: 518, width: 2, height: 59, backgroundColor: '#fff' }} />
      
      {/* Section G - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 498, top: 588, width: 2, height: 305, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 542, top: 588, width: 2, height: 305, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 498, top: 645, width: 44, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 498, top: 705, width: 44, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 498, top: 765, width: 44, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 498, top: 825, width: 44, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section I - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 678, top: 588, width: 2, height: 305, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 722, top: 588, width: 2, height: 305, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 678, top: 645, width: 44, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 678, top: 705, width: 44, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 678, top: 765, width: 44, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 678, top: 825, width: 44, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section H - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 545, top: 890, width: 135, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 550, top: 947, width: 135, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section H - Vertical dividers */}
      <View style={{ position: 'absolute', left: 600, top: 890, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 645, top: 890, width: 2, height: 59, backgroundColor: '#fff' }} />

      {/* Section J - Horizontal dividers */}
      <View style={{ position: 'absolute', left: 270, top: 368, width: 250, height: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 270, top: 427, width: 250, height: 2, backgroundColor: '#fff' }} />
      
      {/* Section J - Vertical dividers */}
      <View style={{ position: 'absolute', left: 310, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 370, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 430, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 485, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />

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