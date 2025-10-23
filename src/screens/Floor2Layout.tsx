import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './styles/Floor2Layout.style';

interface Floor2LayoutProps {
  styles: any;
}

export const Floor2Layout: React.FC<Floor2LayoutProps> = ({ styles: parentStyles }) => {
  return (
    <View style={parentStyles.parkingLayout}>
      {/* Main horizontal road - top */}
      <View style={styles.roadHorizontalTop} />
      
      {/* Main horizontal road - middle */}
      <View style={styles.roadHorizontalMiddle} />
      
      {/* Main horizontal road - bottom */}
      <View style={styles.roadHorizontalBottom} />
      
      {/* Vertical road - left side */}
      <View style={styles.roadVerticalLeft} />
      
      {/* Vertical road - center */}
      <View style={styles.roadVerticalCenter} />
      
      {/* Vertical road - right side */}
      <View style={styles.roadVerticalRight} />
      
      {/* Section A - Top left area (4 spots) */}
      <View style={styles.sectionA}>
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
      </View>
      
      {/* Section B - Top center-left (5 spots) */}
      <View style={styles.sectionB}>
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
      </View>
      
      {/* Section C - Top center-right (3 spots) */}
      <View style={styles.sectionC}>
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
      </View>
      
      {/* Section D - Right side vertical (5 spots) */}
      <View style={styles.sectionD}>
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
      </View>
      
      {/* Section E - Bottom right (4 spots) */}
      <View style={styles.sectionE}>
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
      </View>
      
      {/* Section F - Bottom center (5 spots) */}
      <View style={styles.sectionF}>
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
        <View style={styles.parkingSpotHorizontal} />
      </View>
      
      {/* Section G - Left side vertical (4 spots) */}
      <View style={styles.sectionG}>
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
      </View>
      
      {/* Section H - Bottom left corner (3 spots) */}
      <View style={styles.sectionH}>
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
        <View style={styles.parkingSpotVertical} />
      </View>
      
      {/* Elevator 1 - Top left */}
      <View style={styles.elevator1}>
        <Text style={styles.elevatorText}>ELEVATOR</Text>
      </View>
      
      {/* Elevator 2 - Center */}
      <View style={styles.elevator2}>
        <Text style={styles.elevatorText}>ELEVATOR</Text>
      </View>
      
      {/* Elevator 3 - Right side */}
      <View style={styles.elevator3}>
        <Text style={styles.elevatorText}>ELEVATOR</Text>
      </View>
      
      {/* Stairs - Left side */}
      <View style={styles.stairs}>
        <Text style={styles.stairsText}>STAIRS</Text>
      </View>
      
      {/* Main Entrance */}
      <View style={styles.entrance}>
        <Text style={styles.entranceText}>ENTRANCE</Text>
      </View>
      
      {/* Exit Sign */}
      <View style={styles.exitSign}>
        <Text style={styles.exitText}>EXIT ↓</Text>
      </View>
      
      {/* Building outline boxes */}
      <View style={styles.buildingOutline1} />
      <View style={styles.buildingOutline2} />
      <View style={styles.buildingOutline3} />
      <View style={styles.buildingOutline4} />
    </View>
  );
};