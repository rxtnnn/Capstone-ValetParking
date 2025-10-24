import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { styles } from './styles/ParkingMapScreen.style';
import { RealTimeParkingService, ParkingStats } from '../services/RealtimeParkingService';
import { COLORS, FONTS } from '../constants/AppConst';
import { Floor2Layout } from './Floor2Layout';

type RootStackParamList = { Home: undefined; };
type ParkingMapScreenNavigationProp = NavigationProp<RootStackParamList>;

interface ParkingSpot {
  id: string;
  isOccupied: boolean;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  section?: string;
  rotation?: string;
}

interface ParkingSection {
  id: string;
  label: string;
  totalSlots: number;
  availableSlots: number;
  isFull: boolean;
}

// Sensor mapping for Floor 2 (33 spots)
const SENSOR_TO_SPOT_MAPPING_FLOOR2: { [key: number]: string } = {
  // Section A (4 spots)
  43: 'A1', 44: 'A2', 45: 'A3', 46: 'A4',
  // Section B (5 spots)
  47: 'B1', 48: 'B2', 49: 'B3', 50: 'B4', 51: 'B5',
  // Section C (3 spots)
  52: 'C1', 53: 'C2', 54: 'C3',
  // Section D (5 spots)
  55: 'D1', 56: 'D2', 57: 'D3', 58: 'D4', 59: 'D5',
  // Section E (4 spots)
  60: 'E1', 61: 'E2', 62: 'E3', 63: 'E4',
  // Section F (5 spots)
  64: 'F1', 65: 'F2', 66: 'F3', 67: 'F4', 68: 'F5',
  // Section G (4 spots)
  69: 'G1', 70: 'G2', 71: 'G3', 72: 'G4',
  // Section H (3 spots)
  73: 'H1', 74: 'H2', 75: 'H3'
};

// Initial parking spots for Floor 2 based on the blueprint
const INITIAL_SPOTS_FLOOR2: ParkingSpot[] = [
  // Section A - Top left (4 spots horizontal)
  { id: 'A1', isOccupied: false, position: { x: 90, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'A2', isOccupied: false, position: { x: 138, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'A3', isOccupied: false, position: { x: 186, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'A4', isOccupied: false, position: { x: 234, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  
  // Section B - Top center-left (5 spots horizontal)
  { id: 'B1', isOccupied: false, position: { x: 270, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'B2', isOccupied: false, position: { x: 318, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'B3', isOccupied: false, position: { x: 366, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'B4', isOccupied: false, position: { x: 414, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  { id: 'B5', isOccupied: false, position: { x: 462, y: 30 }, width: 40, height: 55, rotation: '0deg' },
  
  // Section C - Top center-right (3 spots vertical)
  { id: 'C1', isOccupied: false, position: { x: 530, y: 165 }, width: 55, height: 40, rotation: '90deg' },
  { id: 'C2', isOccupied: false, position: { x: 530, y: 213 }, width: 55, height: 40, rotation: '90deg' },
  { id: 'C3', isOccupied: false, position: { x: 530, y: 261 }, width: 55, height: 40, rotation: '90deg' },
  
  // Section D - Right side (5 spots vertical)
  { id: 'D1', isOccupied: false, position: { x: 640, y: 165 }, width: 55, height: 40, rotation: '90deg' },
  { id: 'D2', isOccupied: false, position: { x: 640, y: 213 }, width: 55, height: 40, rotation: '90deg' },
  { id: 'D3', isOccupied: false, position: { x: 640, y: 261 }, width: 55, height: 40, rotation: '90deg' },
  { id: 'D4', isOccupied: false, position: { x: 640, y: 309 }, width: 55, height: 40, rotation: '90deg' },
  { id: 'D5', isOccupied: false, position: { x: 640, y: 357 }, width: 55, height: 40, rotation: '90deg' },
  
  // Section E - Bottom right (4 spots horizontal)
  { id: 'E1', isOccupied: false, position: { x: 520, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'E2', isOccupied: false, position: { x: 568, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'E3', isOccupied: false, position: { x: 616, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'E4', isOccupied: false, position: { x: 664, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  
  // Section F - Bottom center (5 spots horizontal)
  { id: 'F1', isOccupied: false, position: { x: 280, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'F2', isOccupied: false, position: { x: 328, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'F3', isOccupied: false, position: { x: 376, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'F4', isOccupied: false, position: { x: 424, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  { id: 'F5', isOccupied: false, position: { x: 472, y: 640 }, width: 40, height: 55, rotation: '180deg' },
  
  // Section G - Left side (4 spots vertical)
  { id: 'G1', isOccupied: false, position: { x: 90, y: 400 }, width: 55, height: 40, rotation: '270deg' },
  { id: 'G2', isOccupied: false, position: { x: 90, y: 448 }, width: 55, height: 40, rotation: '270deg' },
  { id: 'G3', isOccupied: false, position: { x: 90, y: 496 }, width: 55, height: 40, rotation: '270deg' },
  { id: 'G4', isOccupied: false, position: { x: 90, y: 544 }, width: 55, height: 40, rotation: '270deg' },
  
  // Section H - Bottom left corner (3 spots vertical)
  { id: 'H1', isOccupied: false, position: { x: 160, y: 440 }, width: 55, height: 40, rotation: '270deg' },
  { id: 'H2', isOccupied: false, position: { x: 160, y: 488 }, width: 55, height: 40, rotation: '270deg' },
  { id: 'H3', isOccupied: false, position: { x: 160, y: 536 }, width: 55, height: 40, rotation: '270deg' },
];

const GESTURE_LIMITS = {
  maxTranslateX: 300,
  minTranslateX: -300,
  maxTranslateY: 200,
  minTranslateY: -600,
  minScale: 0.7,
  maxScale: 3,
  clampMinScale: 0.8,
  clampMaxScale: 2.5
};

const ParkingMapFloor2Screen: React.FC = () => {
  const navigation = useNavigation<ParkingMapScreenNavigationProp>();
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [parkingData, setParkingData] = useState<ParkingSpot[]>(INITIAL_SPOTS_FLOOR2);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [navigationPath, setNavigationPath] = useState<{x: number, y: number}[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [parkingStats, setParkingStats] = useState<ParkingStats | null>(null);
  const isMountedRef = useRef(true);
  const unsubscribeFunctionsRef = useRef<{
    parkingUpdates?: () => void;
    connectionStatus?: () => void;
  }>({});

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const bottomPanelY = useSharedValue(0);
  const bottomPanelPanRef = useRef<PanGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const pinchRef = useRef<PinchGestureHandler>(null);

  const calculateSection = useCallback((): ParkingSection[] => {
    const sectionMap: { [key: string]: number } = {};
    Object.values(SENSOR_TO_SPOT_MAPPING_FLOOR2).forEach(spotId => {
      const section = spotId.charAt(0);
      sectionMap[section] = (sectionMap[section] || 0) + 1;
    });

    return Object.entries(sectionMap).map(([section, total]) => ({
      id: section,
      label: section,
      totalSlots: total,
      availableSlots: total,
      isFull: false,
    })).sort((a, b) => a.id.localeCompare(b.id));
  }, []);

  const [parkingSections, setParkingSections] = useState<ParkingSection[]>(() => calculateSection());

  const updateParkingSpotsFromService = useCallback((stats: ParkingStats) => {
    if (!isMountedRef.current) return;
  
    setParkingStats(stats);
    
    const spotOccupancyMap: { [key: string]: boolean } = {};
    
    if (stats.sensorData && Array.isArray(stats.sensorData)) {
      stats.sensorData.forEach((sensor: any) => {
        const spotId = SENSOR_TO_SPOT_MAPPING_FLOOR2[sensor.sensor_id];
        if (spotId) {
          spotOccupancyMap[spotId] = sensor.is_occupied === 1;
        }
      });
    }

    setParkingData(prevSpots => {
      if (!isMountedRef.current) return prevSpots;
      
      return prevSpots.map(spot => ({
        ...spot,
        isOccupied: spotOccupancyMap.hasOwnProperty(spot.id) 
          ? spotOccupancyMap[spot.id] 
          : spot.isOccupied
      }));
    });

    setParkingSections(prevSections => {
      if (!isMountedRef.current) return prevSections;
      
      return prevSections.map(section => {
        const sectionSpots = Object.values(SENSOR_TO_SPOT_MAPPING_FLOOR2)
          .filter(spotId => spotId.startsWith(section.id));

        const totalSlots = sectionSpots.length;
        const availableSlots = sectionSpots.filter(spotId => 
          !spotOccupancyMap[spotId]
        ).length;

        return {
          ...section,
          totalSlots,
          availableSlots,
          isFull: availableSlots === 0
        };
      });
    });
  }, []);

  const subscribeToParkingData = useCallback(() => {
    if (unsubscribeFunctionsRef.current.parkingUpdates) return;

    const unsubscribeParkingUpdates = RealTimeParkingService.onParkingUpdate((data: ParkingStats) => {
      if (!isMountedRef.current) return;
      updateParkingSpotsFromService(data);
    });

    const unsubscribeConnectionStatus = RealTimeParkingService.onConnectionStatus((status) => {
      if (!isMountedRef.current) return;
      setConnectionStatus(status);
    });

    unsubscribeFunctionsRef.current.parkingUpdates = unsubscribeParkingUpdates;
    unsubscribeFunctionsRef.current.connectionStatus = unsubscribeConnectionStatus;
  }, [updateParkingSpotsFromService]);

  useEffect(() => {
    translateX.value = -300; 
    translateY.value = 100; 
    subscribeToParkingData();
    return () => {
      Object.values(unsubscribeFunctionsRef.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribeFunctionsRef.current = {};
    };
  }, [subscribeToParkingData]);

  useFocusEffect(
    React.useCallback(() => {
      if (!unsubscribeFunctionsRef.current.parkingUpdates) {
        subscribeToParkingData();
      }
    }, [subscribeToParkingData])
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
      const { maxTranslateX, minTranslateX, maxTranslateY, minTranslateY } = GESTURE_LIMITS;

      if (translateX.value > maxTranslateX) {
        translateX.value = maxTranslateX;
      } else if (translateX.value < minTranslateX) {
        translateX.value = minTranslateX;
      }

      if (translateY.value > maxTranslateY) {
        translateY.value = maxTranslateY;
      } else if (translateY.value < minTranslateY) {
        translateY.value = minTranslateY;
      }
    },
  });

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startScale = scale.value;
    },
    onActive: (event: any, context: any) => {
      const { minScale, maxScale } = GESTURE_LIMITS;
      scale.value = Math.max(minScale, Math.min(maxScale, context.startScale * event.scale));
    },
    onEnd: () => {
      const { clampMinScale, clampMaxScale } = GESTURE_LIMITS;
      if (scale.value < clampMinScale) {
        scale.value = clampMinScale;
      } else if (scale.value > clampMaxScale) {
        scale.value = clampMaxScale;
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
        bottomPanelY.value = withSpring(currentY > 50 ? 120 : 0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const bottomPanelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bottomPanelY.value }],
  }));

  const handleRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      await RealTimeParkingService.forceUpdate();
    } catch (error) {
      console.error('Manual refresh failed:', error);
      if (isMountedRef.current) {
        Alert.alert('Refresh Failed', 'Unable to refresh parking data. Please try again.');
      }
    }
  }, []);

  const handleSectionPress = useCallback((sectionId: string) => {
    setHighlightedSection(prev => prev === sectionId ? null : sectionId);
  }, []);

  const handleSpotPress = useCallback((spot: ParkingSpot) => {
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
            Alert.alert('Navigation', 'Navigation feature coming soon for Floor 2!');
          },
        },
      ]
    );
  }, []);

  const navigateHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const totalAvailableSpots = useMemo(() => 
    parkingStats?.availableSpots || 
    parkingSections.reduce((sum, section) => sum + section.availableSlots, 0),
    [parkingStats, parkingSections]
  );

  const renderParkingSpot = useCallback((spot: ParkingSpot) => {
    const carImage = require('../../assets/car_top.png');
    const isSelected = selectedSpot === spot.id;
    const spotSection = spot.id.charAt(0);
    const isHighlighted = highlightedSection === spotSection;
    const rotation = spot.rotation || '0deg';
    const w = spot.width || 30;
    const h = spot.height || 30;

    return (
      <TouchableOpacity
        key={spot.id}
        onPress={() => handleSpotPress(spot)}
        style={{
          position: 'absolute',
          left: spot.position.x,
          top: spot.position.y,
          width: w,
          height: h,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        {spot.isOccupied ? (
          <Image 
            source={carImage}
            style={{
              width: w,
              height: h,
              transform: [{rotate: rotation }],
            }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={{
              width: w,
              height: h,
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: rotation }],
            }}
          >
            <Text
              style={{
                color: '#FFF',
                fontWeight: '700',
                fontSize: 16,
                fontFamily: FONTS.semiBold,
              }}
            >
              {spot.id}
            </Text>
          </View>
        )}
        {(isSelected || isHighlighted) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: w + 4,
              height: h + 4,
              borderWidth: 4,
              borderColor: COLORS.green,
              transform: [{ rotate: rotation }],
            }}
          />
        )}
      </TouchableOpacity>
    );
  }, [selectedSpot, highlightedSection, handleSpotPress]);

  const renderSectionIndicator = useCallback((section: ParkingSection) => (
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
  ), [highlightedSection, handleSectionPress]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, {backgroundColor: '#4C0E0E'}]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sectionIndicators}
          contentContainerStyle={styles.sectionIndicatorsContent}
        >
          {parkingSections.map(renderSectionIndicator)}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Ionicons name="refresh" size={20} color="white" />
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>

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
                  <Floor2Layout styles={styles} />
                  {parkingData.map(renderParkingSpot)}
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </View>
      </View>

      <PanGestureHandler ref={bottomPanelPanRef} onGestureEvent={bottomPanelGestureHandler}>
        <Animated.View style={[bottomPanelAnimatedStyle]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bottomPanel}>
            <View style={styles.dragHandle} />
            
            <View style={styles.floorInfo}>
              <Text style={styles.buildingName}>USJ-R Quadricentennial</Text>
              <View style={styles.floorDetails}>
                <View>
                  <Text style={styles.floorLabel}>Floor</Text>
                  <Text style={styles.floorNumber}>2</Text>
                </View>
                <View>
                  <Text style={styles.availableLabel}>Available Spots</Text>
                  <Text style={styles.availableNumber}>{totalAvailableSpots}</Text>
                </View>
              </View>
              
              <View style={styles.lastUpdated}>
                <Text style={styles.lastUpdatedText}>
                  Last updated: {parkingStats?.lastUpdated || 'Loading...'}
                </Text>
                <Text style={styles.lastUpdatedText}>
                  Status: {connectionStatus === 'connected' ? 'Live' : 
                           connectionStatus === 'error' ? 'Error' : 'Offline'}
                </Text>
              </View>
            </View>
            
            <View style={styles.bottomButtons}>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText} onPress={navigateHome}>View other levels</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Navigate</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.closeButton} onPress={navigateHome}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default ParkingMapFloor2Screen;