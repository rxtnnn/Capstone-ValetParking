import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
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
import { useFonts, Poppins_400Regular, Poppins_600SemiBold  } from '@expo-google-fonts/poppins';
import { styles } from './styles/ParkingMapScreen.style';
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

interface ApiParkingData {
  id: number;
  sensor_id: number;
  is_occupied: number;
  distance_cm: number;
  created_at: string;
  updated_at: string;
  floor_level: string;
}

const ParkingMapScreen: React.FC = () => {
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [parkingData, setParkingData] = useState<ParkingSpot[]>([]);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [navigationPath, setNavigationPath] = useState<{x: number, y: number}[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const bottomPanelY = useSharedValue(0);
  const bottomPanelPanRef = useRef<PanGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const pinchRef = useRef<PinchGestureHandler>(null);

  const [fontsLoaded] = useFonts({
      Poppins_400Regular,
      Poppins_600SemiBold,
    });

  const API_URL = 'https://valet.up.railway.app/api/parking';
  const UPDATE_INTERVAL = 5000;

  const sensorToSpotMapping: { [key: number]: string } = {
    7: 'A1',   1: 'B1',   2: 'B2',   3: 'B3',   4: 'B4',
    5: 'C1',   6: 'C2',   8: 'D1',   9: 'D2',   10: 'D3',
    11: 'D4',  12: 'D5',  13: 'D6',  14: 'D7',  15: 'E1',
    16: 'E2',  17: 'E3',  18: 'F1',  19: 'F2',  20: 'F3',
    21: 'F4',  22: 'F5',  23: 'F6',  24: 'F7',  25: 'G1',
    26: 'G2',  27: 'G3',  28: 'G4',  29: 'G5',  30: 'H1',
    31: 'H2',  32: 'H3',  33: 'I1',  34: 'I2',  35: 'I3',
    36: 'I4',  37: 'I5',  38: 'J1',  39: 'J2',  40: 'J3',
    41: 'J4',  42: 'J5'
  };
 
  const computeInitialSections = (): ParkingSection[] => {
    const sectionMap: { [key: string]: number } = {};

    // Count how many slots exist per section (e.g., A1, B1...)
    Object.values(sensorToSpotMapping).forEach(spotId => {
      const section = spotId.charAt(0); // A, B, C, etc.
      sectionMap[section] = (sectionMap[section] || 0) + 1;
    });

    // Build ParkingSection objects
    return Object.entries(sectionMap).map(([section, total]) => ({
      id: section,
      label: section,
      totalSlots: total,
      availableSlots: total, // Assume all available initially
      isFull: false,
    })).sort((a, b) => a.id.localeCompare(b.id)); // Sort alphabetically
  };

 const [parkingSections, setParkingSections] = useState<ParkingSection[]>(computeInitialSections());

  const fetchParkingData = async () => {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const apiData: ApiParkingData[] = await response.json();
      
      updateParkingSpots(apiData);
      setIsConnected(true);
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (error) {
      setIsConnected(false);
      Alert.alert(
        'Connection Error', 
        'Unable to fetch real-time parking data. Showing last known status.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const updateParkingSpots = (apiData: ApiParkingData[]) => {
    setParkingData(prevSpots => {
      return prevSpots.map(spot => {
        // Find the sensor_id that maps to this spot.id
        const matchingSensorEntry = Object.entries(sensorToSpotMapping).find(
          ([sensorId, mappedSpotId]) => mappedSpotId === spot.id
        );

        if (matchingSensorEntry) {
          const sensorId = parseInt(matchingSensorEntry[0]);
          const sensorData = apiData.find(s => s.sensor_id === sensorId);

          if (sensorData) {
            return {
              ...spot,
              isOccupied: sensorData.is_occupied === 1
            };
          }
        }

        return spot; // no match found, return original spot
      });
    });

    updateSectionIndicators(apiData);
  };


  const updateSectionIndicators = (apiData: ApiParkingData[]) => {
    setParkingSections(prevSections => {
      return prevSections.map(section => {
        const sectionSpots = Object.entries(sensorToSpotMapping)
          .filter(([_, spotId]) => spotId.startsWith(section.id))
          .map(([sensorId, _]) => parseInt(sensorId));

        const totalSlots = sectionSpots.length;
        let availableSlots = 0;

        sectionSpots.forEach(sensorId => {
          const sensorData = apiData.find(data => data.sensor_id === sensorId);
          if (sensorData && sensorData.is_occupied === 0) {
            availableSlots++;
          } else if (!sensorData) {
            availableSlots++;
          }
        });

        return {
          ...section,
          totalSlots,
          availableSlots,
          isFull: availableSlots === 0
        };
      });
    });
  };

  useEffect(() => {
    const spots: ParkingSpot[] = [
      { id: 'A1', isOccupied: false, position: { x: 680, y: 110 }, width: 35, height: 35 },
      { id: 'B4', isOccupied: false, position: { x: 500, y: 50 }, width: 35, height: 35 },
      { id: 'B3', isOccupied: false, position: { x: 540, y: 50 }, width: 35, height: 35 },
      { id: 'B2', isOccupied: false, position: { x: 580, y: 50 }, width: 35, height: 35 },
      { id: 'B1', isOccupied: false, position: { x: 620, y: 50 }, width: 35, height: 35 },
      { id: 'C2', isOccupied: false, position: { x: 450, y: 100 }, width: 35, height: 35 },
      { id: 'C1', isOccupied: false, position: { x: 450, y: 140 }, width: 35, height: 35 },
      { id: 'D7', isOccupied: false, position: { x: 120, y: 200 }, width: 35, height: 35 },
      { id: 'D6', isOccupied: false, position: { x: 160, y: 200 }, width: 35, height: 35 },
      { id: 'D5', isOccupied: false, position: { x: 200, y: 200 }, width: 35, height: 35 },
      { id: 'D4', isOccupied: false, position: { x: 240, y: 200 }, width: 35, height: 35 },
      { id: 'D3', isOccupied: false, position: { x: 300, y: 200 }, width: 35, height: 35 },
      { id: 'D2', isOccupied: false, position: { x: 340, y: 200 }, width: 35, height: 35 },
      { id: 'D1', isOccupied: false, position: { x: 380, y: 200 }, width: 35, height: 35 },
      { id: 'J5', isOccupied: false, position: { x: 300, y: 370 }, width: 35, height: 35 },
      { id: 'J4', isOccupied: false, position: { x: 340, y: 370 }, width: 35, height: 35 },
      { id: 'J3', isOccupied: false, position: { x: 380, y: 370 }, width: 35, height: 35 },
      { id: 'J2', isOccupied: false, position: { x: 420, y: 370 }, width: 35, height: 35 },
      { id: 'J1', isOccupied: false, position: { x: 460, y: 370 }, width: 35, height: 35 },
      { id: 'E3', isOccupied: false, position: { x: 55, y: 315 }, width: 35, height: 60 },
      { id: 'E2', isOccupied: false, position: { x: 55, y: 380 }, width: 35, height: 60 },
      { id: 'E1', isOccupied: false, position: { x: 55, y: 445 }, width: 35, height: 60 },
      { id: 'F1', isOccupied: false, position: { x: 120, y: 520 }, width: 35, height: 35 },
      { id: 'F2', isOccupied: false, position: { x: 160, y: 520 }, width: 35, height: 35 },
      { id: 'F3', isOccupied: false, position: { x: 220, y: 520 }, width: 35, height: 35 },
      { id: 'F4', isOccupied: false, position: { x: 260, y: 520 }, width: 35, height: 35 },
      { id: 'F5', isOccupied: false, position: { x: 300, y: 520 }, width: 35, height: 35 },
      { id: 'F6', isOccupied: false, position: { x: 360, y: 520 }, width: 35, height: 35 },
      { id: 'F7', isOccupied: false, position: { x: 400, y: 520 }, width: 35, height: 35 },
      { id: 'G1', isOccupied: false, position: { x: 500, y: 590 }, width: 35, height: 35 },
      { id: 'G2', isOccupied: false, position: { x: 500, y: 630 }, width: 35, height: 35 },
      { id: 'G3', isOccupied: false, position: { x: 500, y: 670 }, width: 35, height: 35 }, 
      { id: 'G4', isOccupied: false, position: { x: 500, y: 730 }, width: 35, height: 35 },
      { id: 'G5', isOccupied: false, position: { x: 500, y: 770 }, width: 35, height: 35 },
      { id: 'H1', isOccupied: false, position: { x: 550, y: 830 }, width: 35, height: 35 },
      { id: 'H2', isOccupied: false, position: { x: 590, y: 830 }, width: 35, height: 35 },
      { id: 'H3', isOccupied: false, position: { x: 630, y: 830 }, width: 35, height: 35 },
      { id: 'I5', isOccupied: false, position: { x: 680, y: 590 }, width: 35, height: 35 },
      { id: 'I4', isOccupied: false, position: { x: 680, y: 630 }, width: 35, height: 35 },
      { id: 'I3', isOccupied: false, position: { x: 680, y: 670 }, width: 35, height: 35 },
      { id: 'I2', isOccupied: false, position: { x: 680, y: 730 }, width: 35, height: 35 },
      { id: 'I1', isOccupied: false, position: { x: 680, y: 770 }, width: 35, height: 35 },
    ];

    setParkingData(spots);
    fetchParkingData();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchParkingData, UPDATE_INTERVAL);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

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
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    fetchParkingData();
  };

  const renderParkingSpot = (spot: ParkingSpot) => {
    const isSelected = selectedSpot === spot.id;
    const spotSection = spot.id.charAt(0); 
    const isHighlighted = highlightedSection === spotSection;
    
    return (
      <TouchableOpacity
      //turn red if occupied spot
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
        {section.isFull ? 'FULL' : `${section.availableSlots} SLOTS`}
      </Text>
    </TouchableOpacity>
  );

  const renderNavigationPath = () => {
    if (!showNavigation || navigationPath.length < 2) return null;

    return (
      <>
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
        
        {navigationPath.map((point, index) => {
          if (index === 0 || index === navigationPath.length - 1) return null;
          
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

  const totalAvailableSpots = parkingSections.reduce((sum, section) => sum + section.availableSlots, 0);

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
        
        {/* Connection Status Indicator */}
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionDot, 
            { backgroundColor: isConnected ? '#4CAF50' : '#ff4444' }
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </LinearGradient>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Ionicons name="refresh" size={20} color="white" />
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>

      {/* Parking map area with pan and zoom */}
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

      {/* Bottom info panel */}
      <PanGestureHandler ref={bottomPanelPanRef} onGestureEvent={bottomPanelGestureHandler}>
        <Animated.View style={[bottomPanelAnimatedStyle]}>
          <LinearGradient
            colors={['#B22020', '#4C0E0E']}
            style={styles.bottomPanel}
          >
            <View style={styles.dragHandle} />
            
            <View style={styles.floorInfo}>
              <Text style={styles.buildingName}>USJ-R Quadricentennial</Text>
              <View style={styles.floorDetails}>
                <View>
                  <Text style={styles.floorLabel}>Floor</Text>
                  <Text style={styles.floorNumber}>4</Text>
                </View>
                <View>
                  <Text style={styles.availableLabel}>Available Spots</Text>
                  <Text style={styles.availableNumber}>{totalAvailableSpots}</Text>
                </View>
              </View>
              
              {/* Last Updated Info */}
              <View style={styles.lastUpdated}>
                <Text style={styles.lastUpdatedText}>
                  Last updated: {lastUpdated || 'Loading...'}
                </Text>
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
      
      {/* clear route btn */}
      {showNavigation && (
        <TouchableOpacity style={styles.clearRouteButton} onPress={clearNavigation}>
          <Ionicons name="close-circle" size={20} color="white" />
          <Text style={styles.clearRouteText}>Clear Route</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ParkingMapScreen;