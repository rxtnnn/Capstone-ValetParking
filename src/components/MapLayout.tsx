import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface MapLayoutProps {
  styles: any;
}

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