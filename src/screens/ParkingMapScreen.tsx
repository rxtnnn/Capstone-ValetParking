import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
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
  
  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const panRef = useRef<PanGestureHandler>(null);
  const pinchRef = useRef<PinchGestureHandler>(null);

  // Mock parking sections data (top indicators)
  const parkingSections: ParkingSection[] = [
    { id: 'A', label: 'A', totalSlots: 2, availableSlots: 2, isFull: false },
    { id: 'B', label: 'B', totalSlots: 4, availableSlots: 4, isFull: false },
    { id: 'C', label: 'C', totalSlots: 2, availableSlots: 0, isFull: true },
    { id: 'D', label: 'D', totalSlots: 7, availableSlots: 7, isFull: false },
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
      { id: 'C2', isOccupied: true, position: { x: 500, y: 130 }, width: 35, height: 35 },
      { id: 'C1', isOccupied: false, position: { x: 500, y: 170 }, width: 35, height: 35 },

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
      { id: 'J5', isOccupied: false, position: { x: 190, y: 350 }, width: 35, height: 35 },
      { id: 'J4', isOccupied: false, position: { x: 230, y: 350 }, width: 35, height: 35 },
      { id: 'J3', isOccupied: false, position: { x: 270, y: 350 }, width: 35, height: 35 },
      { id: 'J2', isOccupied: false, position: { x: 310, y: 350 }, width: 35, height: 35 },
      { id: 'J1', isOccupied: false, position: { x: 350, y: 350 }, width: 35, height: 35 },

      // Left side vertical spots (E3, E2, E1)
      { id: 'E3', isOccupied: false, position: { x: 50, y: 400 }, width: 35, height: 60 },
      { id: 'E2', isOccupied: false, position: { x: 50, y: 470 }, width: 35, height: 60 },
      { id: 'E1', isOccupied: false, position: { x: 50, y: 540 }, width: 35, height: 60 },

      // Bottom left section (F1, F2)
      { id: 'F1', isOccupied: false, position: { x: 120, y: 500 }, width: 35, height: 35 },
      { id: 'F2', isOccupied: false, position: { x: 160, y: 500 }, width: 35, height: 35 },

      // Bottom middle section (F3, F4, F5)
      { id: 'F3', isOccupied: false, position: { x: 220, y: 500 }, width: 35, height: 35 },
      { id: 'F4', isOccupied: false, position: { x: 260, y: 500 }, width: 35, height: 35 },
      { id: 'F5', isOccupied: false, position: { x: 300, y: 500 }, width: 35, height: 35 },

      // Bottom section (F6, F7)
      { id: 'F6', isOccupied: false, position: { x: 360, y: 500 }, width: 35, height: 35 },
      { id: 'F7', isOccupied: false, position: { x: 400, y: 500 }, width: 35, height: 35 },

      // Right side bottom vertical (G2, G1)
      { id: 'G2', isOccupied: false, position: { x: 500, y: 550 }, width: 35, height: 35 },
      { id: 'G1', isOccupied: false, position: { x: 500, y: 590 }, width: 35, height: 35 },

      // Bottom right vertical section (G5, G4)
      { id: 'G5', isOccupied: false, position: { x: 500, y: 650 }, width: 35, height: 35 },
      { id: 'G4', isOccupied: false, position: { x: 500, y: 690 }, width: 35, height: 35 },

      // Bottom most section (H1, H2, H3)
      { id: 'H1', isOccupied: false, position: { x: 190, y: 750 }, width: 35, height: 35 },
      { id: 'H2', isOccupied: false, position: { x: 230, y: 750 }, width: 35, height: 35 },
      { id: 'H3', isOccupied: false, position: { x: 270, y: 750 }, width: 35, height: 35 },

      // Far right edge (I5, I4, I3, I2, I1)
      { id: 'I5', isOccupied: false, position: { x: 680, y: 600 }, width: 35, height: 35 },
      { id: 'I4', isOccupied: false, position: { x: 680, y: 640 }, width: 35, height: 35 },
      { id: 'I3', isOccupied: false, position: { x: 680, y: 680 }, width: 35, height: 35 },
      { id: 'I2', isOccupied: false, position: { x: 680, y: 720 }, width: 35, height: 35 },
      { id: 'I1', isOccupied: false, position: { x: 680, y: 760 }, width: 35, height: 35 },
    ];

    setParkingData(spots);
  }, []);

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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
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

  const renderNavigationArrows = () => {
    if (!showNavigation) return null;

    const arrows = [
      { x: 100, y: 300, direction: 'arrow-forward' },
      { x: 150, y: 300, direction: 'arrow-forward' },
      { x: 200, y: 300, direction: 'arrow-up' },
      { x: 250, y: 250, direction: 'arrow-forward' },
    ];

    return arrows.map((arrow, index) => (
      <View
        key={index}
        style={[
          styles.navigationArrow,
          { left: arrow.x, top: arrow.y },
        ]}
      >
        <Ionicons
          name={arrow.direction as any}
          size={20}
          color="#FFD700"
        />
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with gradient */}
      <LinearGradient
        colors={['#B22020', '#4C0E0E']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.sectionIndicators}>
          {parkingSections.map(renderSectionIndicator)}
        </View>
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
                  
                  {/* Render navigation arrows */}
                  {renderNavigationArrows()}
                  
                  {/* Structural elements */}
                  <View style={styles.elevator1}>
                    <Text style={styles.elevatorText}>Elevator</Text>
                  </View>
                  
                  <View style={styles.elevator2}>
                    <Text style={styles.elevatorText}>Elevator</Text>
                  </View>
                  
                  <View style={styles.stairs}>
                    <Text style={styles.stairsText}>STAIRS</Text>
                  </View>
                  
                  <View style={styles.entrance}>
                    <Text style={styles.entranceText}>Entrance</Text>
                  </View>
                  
                  <View style={styles.youAreHere}>
                    <Text style={styles.youAreHereText}>You are here</Text>
                  </View>
                  
                  <View style={styles.exitSign}>
                    <Text style={styles.exitText}>EXIT</Text>
                  </View>
                  
                  <View style={styles.parkingBuilding}>
                    <Text style={styles.parkingBuildingText}>NO MOTORCYCLE PARKING</Text>
                  </View>
                  
                  {/* Direction arrows */}
                  <View style={styles.arrow1}>
                    <Ionicons name="arrow-back" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow2}>
                    <Ionicons name="arrow-back" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow3}>
                    <Ionicons name="arrow-back" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow4}>
                    <Ionicons name="arrow-back" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow5}>
                    <Ionicons name="arrow-down" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow6}>
                    <Ionicons name="arrow-down" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow7}>
                    <Ionicons name="arrow-down" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow8}>
                    <Ionicons name="arrow-up" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow9}>
                    <Ionicons name="arrow-up" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow10}>
                    <Ionicons name="arrow-forward" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow11}>
                    <Ionicons name="arrow-forward" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow12}>
                    <Ionicons name="arrow-forward" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow13}>
                    <Ionicons name="arrow-forward" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow14}>
                    <Ionicons name="arrow-forward" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow15}>
                    <Ionicons name="arrow-up" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow16}>
                    <Ionicons name="arrow-up" size={16} color="#999" />
                  </View>
                  <View style={styles.arrow17}>
                    <Ionicons name="arrow-forward" size={16} color="#999" />
                  </View>
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </View>
      </View>

      {/* Bottom info panel */}
      <LinearGradient
        colors={['#B22020', '#4C0E0E']}
        style={styles.bottomPanel}
      >
        <View style={styles.floorInfo}>
          <Text style={styles.buildingName}>USJR Quadricentennial</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C2C2C',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  sectionIndicators: {
    flexDirection: 'row',
    gap: 10,
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
  },
  mapFrame: {
    flex: 1,
    overflow: 'hidden', // This contains the pan/zoom within the frame
  },
  mapWrapper: {
    flex: 1,
  },
  parkingLayout: {
    width: 800,
    height: 900,
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
    top: 280,
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
    left: 430,
    top: 550,
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 4,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elevatorText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  stairs: {
    position: 'absolute',
    left: 30,
    top: 350,
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 4,
    width: 80,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stairsText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  entrance: {
    position: 'absolute',
    right: 30,
    top: 200,
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 4,
    width: 20,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '90deg' }],
  },
  entranceText: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
  },
  youAreHere: {
    position: 'absolute',
    right: 30,
    top: 300,
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
    right: 30,
    top: 400,
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 4,
    width: 60,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitText: {
    color: 'white',
    fontSize: 16,
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
  // Direction arrows
  arrow1: { position: 'absolute', left: 160, top: 250 },
  arrow2: { position: 'absolute', left: 200, top: 250 },
  arrow3: { position: 'absolute', left: 240, top: 250 },
  arrow4: { position: 'absolute', left: 320, top: 250 },
  arrow5: { position: 'absolute', left: 410, top: 180 },
  arrow6: { position: 'absolute', left: 410, top: 330 },
  arrow7: { position: 'absolute', left: 520, top: 280 },
  arrow8: { position: 'absolute', left: 620, top: 150 },
  arrow9: { position: 'absolute', left: 620, top: 450 },
  arrow10: { position: 'absolute', left: 130, top: 450 },
  arrow11: { position: 'absolute', left: 170, top: 450 },
  arrow12: { position: 'absolute', left: 210, top: 450 },
  arrow13: { position: 'absolute', left: 250, top: 450 },
  arrow14: { position: 'absolute', left: 290, top: 450 },
  arrow15: { position: 'absolute', left: 620, top: 550 },
  arrow16: { position: 'absolute', left: 620, top: 650 },
  arrow17: { position: 'absolute', left: 320, top: 800 },
  bottomPanel: {
    padding: 20,
    position: 'relative',
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
});

export default ParkingMapScreen;