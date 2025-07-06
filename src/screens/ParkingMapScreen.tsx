import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ParkingSpot {
  id: string;
  isOccupied: boolean;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  section?: string;
}

interface ParkingSection {
  id: string;
  label: string;
  totalSlots: number;
  availableSlots: number;
  isFull: boolean;
}

const ParkingMapScreen: React.FC = () => {
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [parkingData, setParkingData] = useState<ParkingSpot[]>([]);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [navigationPath, setNavigationPath] = useState<{x: number, y: number}[]>([]);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // ADD THESE TWO LINES:
  const bottomPanelY = useSharedValue(0);
  const bottomPanelPanRef = useRef<PanGestureHandler>(null);

const panRef = useRef<PanGestureHandler>(null);
const pinchRef = useRef<PinchGestureHandler>(null);
  // Mock parking sections data (top indicators)
  const parkingSections: ParkingSection[] = [
    { id: 'A', label: 'A', totalSlots: 2, availableSlots: 2, isFull: false },
    { id: 'B', label: 'B', totalSlots: 4, availableSlots: 4, isFull: false },
    { id: 'C', label: 'C', totalSlots: 2, availableSlots: 0, isFull: true },
    { id: 'D', label: 'D', totalSlots: 7, availableSlots: 7, isFull: false },
    { id: 'E', label: 'E', totalSlots: 3, availableSlots: 3, isFull: false },
    { id: 'F', label: 'F', totalSlots: 7, availableSlots: 7, isFull: false },
    { id: 'G', label: 'G', totalSlots: 5, availableSlots: 5, isFull: false },
    { id: 'H', label: 'H', totalSlots: 3, availableSlots: 3, isFull: false },
    { id: 'I', label: 'I', totalSlots: 5, availableSlots: 5, isFull: false },
    { id: 'J', label: 'J', totalSlots: 5, availableSlots: 5, isFull: false },
  ];

  // Initialize parking spots based on the exact layout from the image
  useEffect(() => {
    const spots: ParkingSpot[] = [
      // Top right section (B4, B3, B2, B1)
      { id: 'B4', isOccupied: false, position: { x: 500, y: 50 }, width: 35, height: 35 },
      { id: 'B3', isOccupied: false, position: { x: 540, y: 50 }, width: 35, height: 35 },
      { id: 'B2', isOccupied: false, position: { x: 580, y: 50 }, width: 35, height: 35 },
      { id: 'B1', isOccupied: false, position: { x: 620, y: 50 }, width: 35, height: 35 },

      // Right edge (A1, A2)
      { id: 'A1', isOccupied: false, position: { x: 680, y: 100 }, width: 35, height: 35 },
      { id: 'A2', isOccupied: false, position: { x: 680, y: 140 }, width: 35, height: 35 },

      // Right side vertical spots (C2, C1)
      { id: 'C2', isOccupied: true, position: { x: 450, y: 100 }, width: 35, height: 35 },
      { id: 'C1', isOccupied: false, position: { x: 450, y: 140 }, width: 35, height: 35 },

      // Upper middle section (D7, D6, D5, D4)
      { id: 'D7', isOccupied: false, position: { x: 120, y: 200 }, width: 35, height: 35 },
      { id: 'D6', isOccupied: false, position: { x: 160, y: 200 }, width: 35, height: 35 },
      { id: 'D5', isOccupied: false, position: { x: 200, y: 200 }, width: 35, height: 35 },
      { id: 'D4', isOccupied: false, position: { x: 240, y: 200 }, width: 35, height: 35 },

      // Upper middle section (D3, D2, D1)
      { id: 'D3', isOccupied: false, position: { x: 300, y: 200 }, width: 35, height: 35 },
      { id: 'D2', isOccupied: false, position: { x: 340, y: 200 }, width: 35, height: 35 },
      { id: 'D1', isOccupied: false, position: { x: 380, y: 200 }, width: 35, height: 35 },

      // Middle horizontal row (J5, J4, J3, J2, J1)
      { id: 'J5', isOccupied: false, position: { x: 300, y: 370 }, width: 35, height: 35 },
      { id: 'J4', isOccupied: false, position: { x: 340, y: 370 }, width: 35, height: 35 },
      { id: 'J3', isOccupied: false, position: { x: 380, y: 370 }, width: 35, height: 35 },
      { id: 'J2', isOccupied: false, position: { x: 420, y: 370 }, width: 35, height: 35 },
      { id: 'J1', isOccupied: false, position: { x: 460, y: 370 }, width: 35, height: 35 },

      // Left side vertical spots (E3, E2, E1)
      { id: 'E3', isOccupied: false, position: { x: 55, y: 315 }, width: 35, height: 60 },
      { id: 'E2', isOccupied: false, position: { x: 55, y: 380 }, width: 35, height: 60 },
      { id: 'E1', isOccupied: false, position: { x: 55, y: 445 }, width: 35, height: 60 },

      // Bottom left section (F1, F2)
      { id: 'F1', isOccupied: false, position: { x: 120, y: 520 }, width: 35, height: 35 },
      { id: 'F2', isOccupied: false, position: { x: 160, y: 520 }, width: 35, height: 35 },

      // Bottom middle section (F3, F4, F5)
      { id: 'F3', isOccupied: false, position: { x: 220, y: 520 }, width: 35, height: 35 },
      { id: 'F4', isOccupied: false, position: { x: 260, y: 520 }, width: 35, height: 35 },
      { id: 'F5', isOccupied: false, position: { x: 300, y: 520 }, width: 35, height: 35 },

      // Bottom section (F6, F7)
      { id: 'F6', isOccupied: false, position: { x: 360, y: 520 }, width: 35, height: 35 },
      { id: 'F7', isOccupied: false, position: { x: 400, y: 520 }, width: 35, height: 35 },

      // Right side bottom vertical (G2, G1)
      { id: 'G1', isOccupied: false, position: { x: 500, y: 590 }, width: 35, height: 35 },
      { id: 'G2', isOccupied: false, position: { x: 500, y: 630 }, width: 35, height: 35 },
      { id: 'G3', isOccupied: false, position: { x: 500, y: 670 }, width: 35, height: 35 }, 
      // Bottom right vertical section (G5, G4)
      { id: 'G4', isOccupied: false, position: { x: 500, y: 730 }, width: 35, height: 35 },
      { id: 'G5', isOccupied: false, position: { x: 500, y: 770 }, width: 35, height: 35 },

      // Bottom most section (H1, H2, H3)
      { id: 'H1', isOccupied: false, position: { x: 550, y: 830 }, width: 35, height: 35 },
      { id: 'H2', isOccupied: false, position: { x: 590, y: 830 }, width: 35, height: 35 },
      { id: 'H3', isOccupied: false, position: { x: 630, y: 830 }, width: 35, height: 35 },

      // Far right edge (I5, I4, I3, I2, I1)
      { id: 'I5', isOccupied: false, position: { x: 680, y: 590 }, width: 35, height: 35 },
      { id: 'I4', isOccupied: false, position: { x: 680, y: 630 }, width: 35, height: 35 },
      { id: 'I3', isOccupied: false, position: { x: 680, y: 670 }, width: 35, height: 35 },
      { id: 'I2', isOccupied: false, position: { x: 680, y: 730 }, width: 35, height: 35 },
      { id: 'I1', isOccupied: false, position: { x: 680, y: 770 }, width: 35, height: 35 },
    ];

    setParkingData(spots);
  }, []);

  const generatePathToSpot = (spotId: string) => {
    const spot = parkingData.find(s => s.id === spotId);
    if (!spot) return [];

    const start = { x: 660, y: 240 }; // "You are here" position
    const end = { x: spot.position.x + 17, y: spot.position.y + 17 };

    let waypoints = [];

    // For B spots (top section) - follow arrow1 (up) -> arrow2,3 (left) -> arrow4 (down)
    if (spot.id.startsWith('B')) {
      waypoints = [
        start,                                    // You are here (bottom)
        { x: 720, y: 100 },                      // Go straight up to B level
        { x: spot.position.x + 17, y: 100 },     // Turn left to spot column
        end                                       // Go down to final spot
      ];
    }
    // For A spots (right side) - direct path
    else if (spot.id.startsWith('A')) {
      waypoints = [
        start,
        end // Direct since A spots are close to entrance
      ];
    }
    // For C spots - follow arrow5 (down) then left
    else if (spot.id.startsWith('C')) {
      waypoints = [
        start,
        { x: 720, y: 260 },                      // arrow5 (down)
        { x: 450, y: 260 },                      // Move left
        { x: 450, y: spot.position.y + 17 },     // Move to spot row
        end
      ];
    }
    // For D spots - follow arrow6,7,8 (left) path
    else if (spot.id.startsWith('D')) {
      waypoints = [
        start,
        { x: 720, y: 285 },                      // Move to arrow level
        { x: 370, y: 285 },                      // arrow6,7,8 (left)
        { x: 370, y: 200 },                      // Move up to D level
        { x: spot.position.x + 17, y: 200 },     // Move to spot column
        end
      ];
    }
    // For J spots - follow arrow6,7,8 (left) then to J level
    else if (spot.id.startsWith('J')) {
      waypoints = [
        start,
        { x: 720, y: 285 },                      // Move to arrow level
        { x: 370, y: 285 },                      // arrow6,7,8 (left)
        { x: 370, y: 370 },                      // Move to J level
        { x: spot.position.x + 17, y: 370 },     // Move to spot column
        end
      ];
    }
    // For E spots - follow arrow9 (down) then arrow21 (left)
    else if (spot.id.startsWith('E')) {
      waypoints = [
        start,
        { x: 720, y: 390 },                      // arrow9 (down)
        { x: 420, y: 390 },                      // arrow21 (left)
        { x: 420, y: 380 },                      // Move up to E level
        { x: 55, y: 380 },                       // Move to E column
        { x: 55, y: spot.position.y + 30 },      // Move to specific E spot
        end
      ];
    }
    // For F spots - follow arrow9 (down) -> arrow21 (left) -> arrow11,12,13 (right)
    else if (spot.id.startsWith('F')) {
      waypoints = [
        start,
        { x: 720, y: 390 },                      // arrow9 (down)
        { x: 420, y: 390 },                      // arrow21 (left)
        { x: 420, y: 470 },                      // arrow20 (down)
        { x: spot.position.x + 17, y: 470 },     // arrow11,12,13 (right)
        { x: spot.position.x + 17, y: 520 },     // Move down to F level
        end
      ];
    }
    // For G spots - follow arrow9 (down) -> arrow14,15,16 (down) -> then to G
    else if (spot.id.startsWith('G')) {
      waypoints = [
        start,
        { x: 720, y: 390 },                      // arrow9 (down)
        { x: 580, y: 390 },                      // Move toward G area
        { x: 580, y: 510 },                      // arrow14 (down)
        { x: 580, y: 620 },                      // arrow15 (down)
        { x: 580, y: 730 },                      // arrow16 (down)
        { x: 500, y: 730 },                      // Move to G column
        { x: 500, y: spot.position.y + 17 },     // Move to specific G spot
        end
      ];
    }
    // For H spots - follow arrow17 (right) -> arrow18,19,20 (up)
    else if (spot.id.startsWith('H')) {
      waypoints = [
        start,
        { x: 720, y: 390 },                      // arrow9 (down)
        { x: 620, y: 780 },                      // arrow17 (right)
        { x: 580, y: 780 },                      // Move toward H
        { x: 580, y: 730 },                      // arrow18 (up)
        { x: 580, y: 620 },                      // arrow19 (up)
        { x: 580, y: 490 },                      // arrow20 (up)
        { x: spot.position.x + 17, y: 830 },     // Move to H level
        end
      ];
    }
    // For I spots - direct path from entrance area
    else if (spot.id.startsWith('I')) {
      waypoints = [
        start,
        { x: 720, y: 390 },                      // arrow9 (down)
        { x: 680, y: 390 },                      // Move to I column
        { x: 680, y: spot.position.y + 17 },     // Move to specific I spot
        end
      ];
    }
    // Default fallback
    else {
      waypoints = [start, end];
    }

    return waypoints;
  };
  // Pan gesture handler
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event: any, context: any) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: () => {
      // Add boundaries to prevent panning too far
      const maxTranslateX = 200;
      const minTranslateX = -400;
      const maxTranslateY = 100;
      const minTranslateY = -300;

      if (translateX.value > maxTranslateX) {
        translateX.value = withSpring(maxTranslateX);
      } else if (translateX.value < minTranslateX) {
        translateX.value = withSpring(minTranslateX);
      }

      if (translateY.value > maxTranslateY) {
        translateY.value = withSpring(maxTranslateY);
      } else if (translateY.value < minTranslateY) {
        translateY.value = withSpring(minTranslateY);
      }
    },
  });

  // Pinch gesture handler
  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startScale = scale.value;
    },
    onActive: (event: any, context: any) => {
      scale.value = Math.max(0.5, Math.min(3, context.startScale * event.scale));
    },
    onEnd: () => {
      if (scale.value < 0.7) {
        scale.value = withSpring(0.7);
      } else if (scale.value > 2.5) {
        scale.value = withSpring(2.5);
      }
    },
  });
    // ADD THIS ENTIRE FUNCTION:
  const bottomPanelGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startY = bottomPanelY.value;
    },
    onActive: (event: any, context: any) => {
      const newY = context.startY + event.translationY;
      bottomPanelY.value = Math.max(-50, Math.min(150, newY));
    },
    onEnd: (event: any) => {
      const velocity = event.velocityY;
      const currentY = bottomPanelY.value;
      
      if (velocity > 500 || currentY > 75) {
        bottomPanelY.value = withSpring(120);
      } else if (velocity < -500 || currentY < 25) {
        bottomPanelY.value = withSpring(0);
      } else {
        if (currentY > 50) {
          bottomPanelY.value = withSpring(120);
        } else {
          bottomPanelY.value = withSpring(0);
        }
      }
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });
  const clearNavigation = () => {
    setShowNavigation(false);
    setNavigationPath([]);
    setSelectedSpot(null);
  };
    // ADD THIS FUNCTION:
  const bottomPanelAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: bottomPanelY.value }],
    };
  });

  const handleSectionPress = (sectionId: string) => {
    if (highlightedSection === sectionId) {
      // If already highlighted, unhighlight
      setHighlightedSection(null);
    } else {
      // Highlight the selected section
      setHighlightedSection(sectionId);
    }
  };

  const handleSpotPress = (spot: ParkingSpot) => {
    if (spot.isOccupied) {
      Alert.alert('Spot Occupied', 'This parking spot is currently occupied.');
      return;
    }

    setSelectedSpot(spot.id);
    Alert.alert(
      'Navigate to Spot',
      `Would you like to navigate to parking spot ${spot.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Guide Me',
          onPress: () => {
            setShowNavigation(true);
            // ADD THIS LINE:
            setNavigationPath(generatePathToSpot(spot.id));
          },
        },
      ]
    );
  };

  const renderParkingSpot = (spot: ParkingSpot) => {
    const isSelected = selectedSpot === spot.id;
    const spotSection = spot.id.charAt(0); // Get first character (A, B, C, D, etc.)
    const isHighlighted = highlightedSection === spotSection;
    
    return (
      <TouchableOpacity
        key={spot.id}
        style={[
          styles.parkingSpot,
          {
            left: spot.position.x,
            top: spot.position.y,
            width: spot.width || 35,
            height: spot.height || 35,
            backgroundColor: spot.isOccupied ? '#ff4444' : '#4CAF50',
            borderColor: isSelected ? '#FFD700' : (isHighlighted ? '#FF6B35' : 'transparent'),
            borderWidth: isSelected || isHighlighted ? 3 : 0,
          },
        ]}
        onPress={() => handleSpotPress(spot)}
      >
        <Text style={[styles.spotText, { fontSize: spot.width && spot.width > 35 ? 10 : 8 }]}>
          {spot.id}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionIndicator = (section: ParkingSection) => (
    <TouchableOpacity
      key={section.id}
      style={[
        styles.sectionIndicator,
        { 
          backgroundColor: section.isFull ? '#666' : '#B22020',
          borderColor: highlightedSection === section.id ? '#FFD700' : 'transparent',
          borderWidth: highlightedSection === section.id ? 2 : 0,
        },
      ]}
      onPress={() => handleSectionPress(section.id)}
    >
      <Text style={styles.sectionLabel}>{section.label}</Text>
      <Text style={styles.sectionSlots}>
        {section.isFull ? 'FULL SLOT' : `${section.availableSlots} SLOTS`}
      </Text>
    </TouchableOpacity>
  );

  const renderNavigationPath = () => {
    if (!showNavigation || navigationPath.length < 2) return null;

    return (
      <>
        {/* Render red path lines */}
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
              style={{
                position: 'absolute',
                left: point.x,
                top: point.y,
                width: distance,
                height: 4,
                backgroundColor: '#FF0000',
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: '0 50%',
                zIndex: 100,
              }}
            />
          );
        })}
        
        {/* White directional arrows at turns */}
        {navigationPath.map((point, index) => {
          if (index === 0 || index === navigationPath.length - 1) return null;
          
          const nextPoint = navigationPath[index + 1];
          const deltaX = nextPoint.x - point.x;
          const deltaY = nextPoint.y - point.y;
          
          return (
            <View
              key={`arrow-${index}`}
              style={{
                position: 'absolute',
                left: point.x - 15,
                top: point.y - 15,
                width: 30,
                height: 30,
                backgroundColor: '#FF0000',
                borderRadius: 15,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 101,
              }}
            >
            </View>
          );
        })}
      </>
    );
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with gradient */}
      <LinearGradient
        colors={['#B22020', '#4C0E0E']}
        style={styles.header}
      >
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sectionIndicators}
          contentContainerStyle={styles.sectionIndicatorsContent}
        >
        {parkingSections.map(renderSectionIndicator)}
      </ScrollView>
      </LinearGradient>

      {/* Parking map area with pan and zoom - contained within its own frame */}
      <View style={styles.mapContainer}>
        <View style={styles.mapFrame}>
          <PinchGestureHandler
            ref={pinchRef}
            onGestureEvent={pinchGestureHandler}
            simultaneousHandlers={panRef}
          >
            <Animated.View style={styles.mapWrapper}>
              <PanGestureHandler
                ref={panRef}
                onGestureEvent={panGestureHandler}
                simultaneousHandlers={pinchRef}
                minPointers={1}
                maxPointers={1}
              >
                <Animated.View style={[styles.parkingLayout, animatedStyle]}>
                  {/* Render all parking spots */}
                  {parkingData.map(renderParkingSpot)}
                  {renderNavigationPath()}
                  {/* Structural elements */}
                  <View style={styles.elevator1}>
                    <Text style={styles.elevatorText}>Elevator</Text>
                  </View>
                  
                  <View style={styles.elevator2}>
                    <Text style={styles.elevatorText}>Elevator</Text>
                  </View>
                  <View style={styles.elevator3}>
                    <Text style={styles.elevatorText}>Elevator</Text>
                  </View>
                  <View style={styles.stairs}>
                    <Text style={styles.stairsText}>STAIRS</Text>
                  </View>
                  
                 
                  
                  <View style={styles.youAreHere}>
                    <Text style={styles.youAreHereText}>You are here</Text>
                  </View>
                  
                  <View style={styles.exitSign}>
                    <Text style={styles.exitText}>EXIT</Text>
                  </View>
                   {/* Direction arrows */}
                  <View style={styles.arrow1}>
                    <Ionicons name="arrow-up" size={28} color="white" />
                  </View>
                  <View style={styles.arrow2}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                  </View>
                  <View style={styles.arrow3}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                  </View>
                 <View style={styles.arrow4}>
                    <Ionicons name="arrow-down" size={28} color="white" />
                  </View>
                   <View style={styles.arrow5}>
                    <Ionicons name="arrow-down" size={28} color="white" />
                  </View>
                  <View style={styles.arrow6}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                  </View>
                  <View style={styles.arrow7}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                  </View>
                  <View style={styles.arrow8}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                  </View>
                  <View style={styles.arrow9}>
                    <Ionicons name="arrow-down" size={28} color="white" />
                  </View>
                  <View style={styles.arrow11}>
                    <Ionicons name="arrow-forward" size={28} color="white" />
                  </View>
                  <View style={styles.arrow12}>
                    <Ionicons name="arrow-forward" size={28} color="white" />
                  </View>
                  <View style={styles.arrow13}>
                    <Ionicons name="arrow-forward" size={28} color="white" />
                  </View>
                  <View style={styles.arrow14}>
                    <Ionicons name="arrow-down" size={28} color="white" />
                  </View>
                  <View style={styles.arrow15}>
                    <Ionicons name="arrow-down" size={28} color="white" />
                  </View>
                  <View style={styles.arrow16}>
                    <Ionicons name="arrow-down" size={28} color="white" />
                  </View>
                  <View style={styles.arrow17}>
                    <Ionicons name="arrow-forward" size={28} color="white" />
                  </View>
                   <View style={styles.arrow18}>
                    <Ionicons name="arrow-up" size={28} color="white" />
                  </View>
                  <View style={styles.arrow19}>
                    <Ionicons name="arrow-up" size={28} color="white" />
                  </View>
                  <View style={styles.arrow20}>
                    <Ionicons name="arrow-up" size={28} color="white" />
                  </View>
                  <View style={styles.arrow21}>
                    <Ionicons name="arrow-forward" size={28} color="white" />
                  </View>
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </View>
      </View>

        {/* Bottom info panel - REPLACE YOUR ENTIRE BOTTOM PANEL WITH THIS */}
  <PanGestureHandler ref={bottomPanelPanRef} onGestureEvent={bottomPanelGestureHandler}>
    <Animated.View style={[bottomPanelAnimatedStyle]}>
      <LinearGradient
        colors={['#B22020', '#4C0E0E']}
        style={styles.bottomPanel}
      >
        {/* ADD THIS DRAG HANDLE */}
        <View style={styles.dragHandle} />
        
        <View style={styles.floorInfo}>
          <Text style={styles.buildingName}>USJ-R Quadricentennial</Text>
          <View style={styles.floorDetails}>
            <View>
              <Text style={styles.floorLabel}>Floor</Text>
              <Text style={styles.floorNumber}>1</Text>
            </View>
            <View>
              <Text style={styles.availableLabel}>Available Spots</Text>
              <Text style={styles.availableNumber}>40</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View other levels</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.closeButton}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  </PanGestureHandler>
  {/* ADD THE CLEAR ROUTE BUTTON HERE - OUTSIDE THE DRAGGABLE CONTAINER */}
  {showNavigation && (
    <TouchableOpacity style={styles.clearRouteButton} onPress={clearNavigation}>
      <Ionicons name="close-circle" size={20} color="white" />
      <Text style={styles.clearRouteText}>Clear Route</Text>
    </TouchableOpacity>
  )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C2C2C',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 1000, 
  },
  sectionIndicators: {
    flex: 1,
  },
  sectionIndicatorsContent: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 2,
  },
  sectionIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  sectionLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionSlots: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
  },
  mapContainer: {
  flex: 1,
  backgroundColor: '#2C2C2C',
  paddingBottom: 100, // Remove any bottom padding
  marginTop: 100,
},
  mapFrame: {
    flex: 1,
    overflow: 'visible', // Change from 'hidden' to 'visible'
    paddingBottom: 0,   // This contains the pan/zoom within the frame
  },
  mapWrapper: {
    flex: 1,
  },
  arrow1: { position: 'absolute', right: 140, top: 160},
  arrow2: { position: 'absolute', right: 160, top: 100},
  arrow3: { position: 'absolute', right: 230, top: 100},
  arrow4: { position: 'absolute', right: 270, top: 160},
  arrow5: { position: 'absolute', right: 270, top: 260},
  arrow6: { position: 'absolute', right: 350, top: 285},
  arrow7: { position: 'absolute', right: 470, top: 285},
  arrow8: { position: 'absolute', right: 600, top: 285},
  arrow9: { position: 'absolute', right: 650, top: 390},
  arrow11: { position: 'absolute', right: 580, top: 470},
  arrow12: { position: 'absolute', right: 430, top: 470},
  arrow13: { position: 'absolute', right: 280, top: 470},
  arrow14: { position: 'absolute', right: 220, top: 510},
  arrow15: { position: 'absolute', right: 220, top: 620},
  arrow16: { position: 'absolute', right: 220, top: 730},
  arrow17: { position: 'absolute', right: 180, top: 780},
  arrow18: { position: 'absolute', right: 140, top: 730},
  arrow19: { position: 'absolute', right: 140, top: 620},
  arrow20: { position: 'absolute', right: 140, top: 490},
  arrow21: { position: 'absolute', right: 90, top: 410},
  parkingLayout: {
    width: 800,
    height: height + 200,
    backgroundColor: '#2C2C2C',
  },
  parkingSpot: {
    position: 'absolute',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  spotText: {
    color: 'white',
    fontWeight: 'bold',
  },
  elevator1: {
    position: 'absolute',
    left: 430,
    top: 200,
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 4,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elevator2: {
    position: 'absolute',
    left: 450,
    top: 520,
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 4,
    width: 85,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elevatorText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  elevator3:{
    position: 'absolute',
    left: 655,
    top: 500,
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 4,
    width: 85,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{rotate: '90deg'}]
  },
  stairs: {
    position: 'absolute',
    left: 30,
    top: 225,
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 4,
    width: 80,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-90deg'}]
  },
  stairsText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  entrance: {
    position: 'absolute',
    right: 150,
    top: 230,
    backgroundColor: '#666',
    borderRadius: 4,
    width: 50,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entranceText: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
  },
  youAreHere: {
    position: 'absolute',
    right: 100,
    top: 240,
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 4,
    width: 60,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youAreHereText: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
  },
  exitSign: {
    position: 'absolute',
    right: 120,
    top: 400,
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 4,
    width: 100,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  parkingBuilding: {
    position: 'absolute',
    left: 450,
    top: 50,
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 4,
    width: 20,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '90deg' }],
  },
  parkingBuildingText: {
    color: 'white',
    fontSize: 6,
    textAlign: 'center',
  },
  navigationArrow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
 
  bottomPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 13,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Already correct - Above map
  },
  buildingName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  floorInfo: {
    marginBottom: 20,
  },
  floorDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  floorLabel: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  floorNumber: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  availableLabel: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  availableNumber: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
    marginBottom: 10
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    maxWidth: 150,
  },
  secondaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    maxWidth: 120,
  },
  primaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  clearRouteButton: {
    position: 'absolute',
    top: 120, // Below the header
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 2000, // Higher than everything else
    elevation: 10,
  },
  clearRouteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
});

export default ParkingMapScreen;