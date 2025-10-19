import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/AppConst';
import { mapLayoutStyles, SPOT_DIVIDER, createGridLineStyle } from './styles/MapLayout.style';
interface ParkingSpot {
  id: string;
  isOccupied: boolean;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  section?: string;
  rotation?: string;
}

interface MapLayoutProps {
  parkingData: ParkingSpot[];
  selectedSpot: string | null;
  highlightedSection: string | null;
  onSpotPress: (spot: ParkingSpot) => void;
  navigationPath?: { x: number; y: number }[];
  showNavigation?: boolean;
}

export const INITIAL_SPOTS: ParkingSpot[] = [
  { id: 'A1', isOccupied: false, position: { x: 685, y: 116 }, width: 57, height: 45, rotation: '90deg' },
  { id: 'B4', isOccupied: false, position: { x: 500, y: 32 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'B3', isOccupied: false, position: { x: 545, y: 32 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'B2', isOccupied: false, position: { x: 590, y: 32 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'B1', isOccupied: false, position: { x: 635, y: 32 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'C1', isOccupied: false, position: { x: 450, y: 95 }, width: 40, height: 55, rotation: '-90deg' },
  { id: 'C2', isOccupied: false, position: { x: 450, y: 150 }, width: 40, height: 55, rotation: '90deg' },
  { id: 'D7', isOccupied: false, position: { x: 100, y: 200 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'D6', isOccupied: false, position: { x: 160, y: 200 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'D5', isOccupied: false, position: { x: 210, y: 200 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'D4', isOccupied: false, position: { x: 259, y: 200 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'D3', isOccupied: false, position: { x: 310, y: 200 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'D2', isOccupied: false, position: { x: 355, y: 200 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'D1', isOccupied: false, position: { x: 400, y: 200 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'J5', isOccupied: false, position: { x: 270, y: 370 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'J4', isOccupied: false, position: { x: 320, y: 370 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'J3', isOccupied: false, position: { x: 380, y: 370 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'J2', isOccupied: false, position: { x: 440, y: 370 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'J1', isOccupied: false, position: { x: 490, y: 370 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'E3', isOccupied: false, position: { x: 55, y: 315 }, width: 55, height: 60, rotation: '90deg' },
  { id: 'E2', isOccupied: false, position: { x: 55, y: 380 }, width: 55, height: 60, rotation: '90deg' },
  { id: 'E1', isOccupied: false, position: { x: 55, y: 445 }, width: 55, height: 60, rotation: '90deg' },
  { id: 'F1', isOccupied: false, position: { x: 120, y: 520 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'F2', isOccupied: false, position: { x: 165, y: 520 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'F3', isOccupied: false, position: { x: 220, y: 520 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'F4', isOccupied: false, position: { x: 265, y: 520 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'F5', isOccupied: false, position: { x: 310, y: 520 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'F6', isOccupied: false, position: { x: 365, y: 520 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'F7', isOccupied: false, position: { x: 410, y: 520 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'G1', isOccupied: false, position: { x: 500, y: 590 }, width: 40, height: 55, rotation: '90deg' },
  { id: 'G2', isOccupied: false, position: { x: 500, y: 650 }, width: 40, height: 55, rotation: '90deg' },
  { id: 'G3', isOccupied: false, position: { x: 500, y: 710 }, width: 40, height: 55, rotation: '90deg' },
  { id: 'G4', isOccupied: false, position: { x: 500, y: 770 }, width: 40, height: 55, rotation: '90deg' },
  { id: 'G5', isOccupied: false, position: { x: 500, y: 830 }, width: 40, height: 55, rotation: '90deg' },
  { id: 'H1', isOccupied: false, position: { x: 560, y: 890 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'H2', isOccupied: false, position: { x: 605, y: 890 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'H3', isOccupied: false, position: { x: 650, y: 890 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'I5', isOccupied: false, position: { x: 680, y: 590 }, width: 40, height: 55, rotation: '270deg' },
  { id: 'I4', isOccupied: false, position: { x: 680, y: 650 }, width: 40, height: 55, rotation: '270deg' },
  { id: 'I3', isOccupied: false, position: { x: 680, y: 710 }, width: 40, height: 55, rotation: '270deg' },
  { id: 'I2', isOccupied: false, position: { x: 680, y: 770 }, width: 40, height: 55, rotation: '270deg' },
  { id: 'I1', isOccupied: false, position: { x: 680, y: 830 }, width: 40, height: 55, rotation: '270deg' },
];

const MapLayout: React.FC<MapLayoutProps> = ({
  parkingData,
  selectedSpot,
  highlightedSection,
  onSpotPress,
  navigationPath = [],
  showNavigation = false,
}) => {
  const renderParkingSpot = (spot: ParkingSpot) => {
    const carImage = require('../../assets/car_top.png');
    const isSelected = selectedSpot === spot.id;
    const spotSection = spot.id.charAt(0);
    const isHighlighted = highlightedSection === spotSection;
    const rotation = spot.rotation || '0deg';
    const w = spot.width || 20;
    const h = spot.height || 20;

    return (
      <TouchableOpacity
        key={spot.id}
        onPress={() => onSpotPress(spot)}
        style={[
          mapLayoutStyles.spotContainer,
          {
            left: spot.position.x,
            top: spot.position.y,
            width: w,
            height: h,
          },
        ]}
        activeOpacity={0.7}
      >
        {spot.isOccupied ? (
          <Image
            source={carImage}
            style={{
              width: w,
              height: h,
              transform: [{ rotate: rotation }],
            }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              mapLayoutStyles.spotContent,
              {
                width: w,
                height: h,
                transform: [{ rotate: rotation }],
              },
            ]}
          >
            <Text style={mapLayoutStyles.spotText}>{spot.id}</Text>
          </View>
        )}

        {(isSelected || isHighlighted) && (
          <View
            pointerEvents="none"
            style={[
              mapLayoutStyles.highlightRing,
              {
                width: w + 4,
                height: h + 4,
                borderColor:  COLORS.green,
                transform: [{ rotate: rotation }],
              },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderNavigationPath = () => {
    if (!showNavigation || navigationPath.length < 2) return null;

    return (
      <View style={mapLayoutStyles.navigationContainer}>
        {/* Path lines */}
        {navigationPath.map((point, index) => {
          if (index === navigationPath.length - 1) return null;

          const nextPoint = navigationPath[index + 1];
          const deltaX = nextPoint.x - point.x;
          const deltaY = nextPoint.y - point.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

          return (
            <View
              key={`line-${index}`}
              style={[
                mapLayoutStyles.navigationLine,
                {
                  left: point.x,
                  top: point.y,
                  width: distance,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: '0 50%',
                },
              ]}
            />
          );
        })}

        {/* Waypoint dots */}
        {navigationPath.map((point, index) => {
          if (index === 0 || index === navigationPath.length - 1) return null;

          return (
            <View
              key={`waypoint-${index}`}
              style={[
                mapLayoutStyles.waypointDot,
                {
                  left: point.x - 8,
                  top: point.y - 8,
                },
              ]}
            />
          );
        })}

        {/* Start point */}
        <View
          style={[
            mapLayoutStyles.startPoint,
            {
              left: navigationPath[0].x - 15,
              top: navigationPath[0].y - 15,
            },
          ]}
        />

        {/* End point with flag */}
        <View
          style={[
            mapLayoutStyles.endPoint,
            {
              left: navigationPath[navigationPath.length - 1].x - 20,
              top: navigationPath[navigationPath.length - 1].y - 20,
            },
          ]}
        >
          <Ionicons name="flag" size={20} color="white" />
        </View>
      </View>
    );
  };

  const renderGridLines = () => {
    return (
      <>
        {/* Section A */}
        {SPOT_DIVIDER.sectionA.map((line, index) => (
          <View key={`a-${index}`} style={createGridLineStyle(line)} />
        ))}

        {/* Section B */}
        {SPOT_DIVIDER.sectionBHorizontal.map((line, index) => (
          <View key={`b-h-${index}`} style={createGridLineStyle(line)} />
        ))}
        {SPOT_DIVIDER.sectionBVertical.map((line, index) => (
          <View key={`b-v-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section C */}
        {SPOT_DIVIDER.sectionC.map((line, index) => (
          <View key={`c-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section D */}
        {SPOT_DIVIDER.sectionDHorizontal.map((line, index) => (
          <View key={`d-h-${index}`} style={createGridLineStyle(line)} />
        ))}
        {SPOT_DIVIDER.sectionDVertical.map((line, index) => (
          <View key={`d-v-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section J */}
        {SPOT_DIVIDER.sectionJHorizontal.map((line, index) => (
          <View key={`j-h-${index}`} style={createGridLineStyle(line)} />
        ))}
        {SPOT_DIVIDER.sectionJVertical.map((line, index) => (
          <View key={`j-v-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section E */}
        {SPOT_DIVIDER.sectionE.map((line, index) => (
          <View key={`e-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section F */}
        {SPOT_DIVIDER.sectionFHorizontal.map((line, index) => (
          <View key={`f-h-${index}`} style={createGridLineStyle(line)} />
        ))}
        {SPOT_DIVIDER.sectionFVertical.map((line, index) => (
          <View key={`f-v-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section G */}
        {SPOT_DIVIDER.sectionGVertical.map((line, index) => (
          <View key={`g-v-${index}`} style={createGridLineStyle(line)} />
        ))}
        {SPOT_DIVIDER.sectionGHorizontal.map((line, index) => (
          <View key={`g-h-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section I */}
        {SPOT_DIVIDER.sectionIVertical.map((line, index) => (
          <View key={`i-v-${index}`} style={createGridLineStyle(line)} />
        ))}
        {SPOT_DIVIDER.sectionIHorizontal.map((line, index) => (
          <View key={`i-h-${index}`} style={createGridLineStyle(line)} />
        ))}
        {/* Section H */}
        {SPOT_DIVIDER.sectionHHorizontal.map((line, index) => (
          <View key={`h-h-${index}`} style={createGridLineStyle(line)} />
        ))}
        {SPOT_DIVIDER.sectionHVertical.map((line, index) => (
          <View key={`h-v-${index}`} style={createGridLineStyle(line)} />
        ))}
      </>
    );
  };
  return (
    <>
      {renderGridLines()}
      {parkingData.map(renderParkingSpot)}
      {renderNavigationPath()}
    </>
  );
};

export default MapLayout;