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
import { COLORS, FONTS, useAppFonts} from '../constants/AppConst';
// Import the car PNG image
const carImage = require('../../assets/car_top.png');

type RootStackParamList = {
  Home: undefined;
};

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

const SENSOR_TO_SPOT_MAPPING: { [key: number]: string } = {
  7: 'A1',   4: 'B1',   3: 'B2',   2: 'B3',   1: 'B4',
  5: 'C1',   6: 'C2',   8: 'D1',   9: 'D2',   10: 'D3',
  11: 'D4',  12: 'D5',  13: 'D6',  14: 'D7',  15: 'E1',
  16: 'E2',  17: 'E3',  18: 'F1',  19: 'F2',  20: 'F3',
  21: 'F4',  22: 'F5',  23: 'F6',  24: 'F7',  25: 'G1',
  26: 'G2',  27: 'G3',  28: 'G4',  29: 'G5',  30: 'H1',
  31: 'H2',  32: 'H3',  33: 'I1',  34: 'I2',  35: 'I3',
  36: 'I4',  37: 'I5',  38: 'J1',  39: 'J2',  40: 'J3',
  41: 'J4',  42: 'J5'
};

const INITIAL_SPOTS: ParkingSpot[] = [
  { id: 'A1', isOccupied: false, position: { x: 690, y: 90 }, width: 40, height: 100, rotation: '90deg' },
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

const ParkingMapScreen: React.FC = () => {
  const navigation = useNavigation<ParkingMapScreenNavigationProp>();
  const fontsLoaded = useAppFonts();
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [parkingData, setParkingData] = useState<ParkingSpot[]>(INITIAL_SPOTS);
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

  const computeInitialSections = useCallback((): ParkingSection[] => {
    const sectionMap: { [key: string]: number } = {};

    Object.values(SENSOR_TO_SPOT_MAPPING).forEach(spotId => {
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

  const [parkingSections, setParkingSections] = useState<ParkingSection[]>(() => computeInitialSections());

  // Define navigation waypoints for routing
  const NAVIGATION_WAYPOINTS = useMemo(() => ({
    entrance: { x:670, y: 280 }, // Bottom entrance point
    
    // Main intersection points
    intersectionAB: { x: 670, y: 130 },
    intersectionBC: { x: 520, y: 130 },
    intersectionA: { x: 670, y: 150 },
    intersectionH: { x: 600, y: 900 },
    intersectionG: { x: 550, y: 830 },
    intersectionF: { x: 450, y: 550 },
    intersectionE: { x: 100, y: 450 },
    intersectionD: { x: 200, y: 230 },
    intersectionC: { x: 467, y: 150 },
    intersectionB: { x: 660, y: 60 },
    intersectionJ: { x: 400, y: 400 },
  }), []);

  const generateNavigationPath = useCallback((spotId: string) => {
    const spot = parkingData.find(s => s.id === spotId);
    if (!spot) return [];

    const section = spotId.charAt(0);
    const entrance = NAVIGATION_WAYPOINTS.entrance;
    const path: {x: number, y: number}[] = [entrance];

    // Route based on section
    switch(section) {
      case 'H':
        path.push(NAVIGATION_WAYPOINTS.intersectionH);
        path.push({ x: spot.position.x + 20, y: spot.position.y + 30 });
        break;
      
      case 'I':
        path.push(NAVIGATION_WAYPOINTS.intersectionH);
        path.push(NAVIGATION_WAYPOINTS.intersectionG);
        path.push({ x: 700, y: spot.position.y + 30 });
        path.push({ x: spot.position.x + 20, y: spot.position.y + 30 });
        break;
      
      case 'G':
        path.push(NAVIGATION_WAYPOINTS.intersectionH);
        path.push(NAVIGATION_WAYPOINTS.intersectionG);
        path.push({ x: spot.position.x + 20, y: spot.position.y + 30 });
        break;
      
      case 'F':
        path.push(NAVIGATION_WAYPOINTS.intersectionH);
        path.push(NAVIGATION_WAYPOINTS.intersectionG);
        path.push(NAVIGATION_WAYPOINTS.intersectionF);
        path.push({ x: spot.position.x + 20, y: spot.position.y + 30 });
        break;
      
      case 'E':
        path.push(NAVIGATION_WAYPOINTS.intersectionH);
        path.push(NAVIGATION_WAYPOINTS.intersectionG);
        path.push(NAVIGATION_WAYPOINTS.intersectionF);
        path.push(NAVIGATION_WAYPOINTS.intersectionE);
        path.push({ x: spot.position.x + 30, y: spot.position.y + 30 });
        break;
      
      case 'J':
        path.push(NAVIGATION_WAYPOINTS.intersectionH);
        path.push(NAVIGATION_WAYPOINTS.intersectionG);
        path.push(NAVIGATION_WAYPOINTS.intersectionF);
        path.push(NAVIGATION_WAYPOINTS.intersectionJ);
        path.push({ x: spot.position.x + 20, y: spot.position.y + 30 });
        break;
      
      case 'D':
        path.push(NAVIGATION_WAYPOINTS.intersectionH);
        path.push(NAVIGATION_WAYPOINTS.intersectionG);
        path.push(NAVIGATION_WAYPOINTS.intersectionF);
        path.push(NAVIGATION_WAYPOINTS.intersectionJ);
        path.push(NAVIGATION_WAYPOINTS.intersectionD);
        path.push({ x: spot.position.x + 20, y: spot.position.y + 30 });
        break;
      
      case 'C':
        path.push(NAVIGATION_WAYPOINTS.intersectionAB);
        path.push(NAVIGATION_WAYPOINTS.intersectionBC);
        path.push({ x:520, y:180 });
        path.push({ x: 470, y: 180 });
        break;
      
      case 'B':
        path.push(NAVIGATION_WAYPOINTS.intersectionB);
        break;
      
      case 'A':
        path.push(NAVIGATION_WAYPOINTS.intersectionA);
        path.push({ x: 710, y: 150});
        break;
    }

    return path;
  }, [parkingData, NAVIGATION_WAYPOINTS]);

  const updateParkingSpotsFromService = useCallback((stats: ParkingStats) => {
    if (!isMountedRef.current) return;
  
    setParkingStats(stats);
    
    const spotOccupancyMap: { [key: string]: boolean } = {};
    
    if (stats.sensorData && Array.isArray(stats.sensorData)) {
      stats.sensorData.forEach((sensor: any) => {
        const spotId = SENSOR_TO_SPOT_MAPPING[sensor.sensor_id];
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
        const sectionSpots = Object.values(SENSOR_TO_SPOT_MAPPING)
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

  // Re-subscribe when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!unsubscribeFunctionsRef.current.parkingUpdates) {
        subscribeToParkingData();
      }
    }, [subscribeToParkingData])
  );

  // Component mount/unmount lifecycle
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
      const { minScale, maxScale } = GESTURE_LIMITS;
      scale.value = Math.max(minScale, Math.min(maxScale, context.startScale * event.scale));
    },
    onEnd: () => {
      const { clampMinScale, clampMaxScale } = GESTURE_LIMITS;
      if (scale.value < clampMinScale) {
        scale.value = withSpring(clampMinScale);
      } else if (scale.value > clampMaxScale) {
        scale.value = withSpring(clampMaxScale);
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

  const clearNavigation = useCallback(() => {
    setShowNavigation(false);
    setNavigationPath([]);
    setSelectedSpot(null);
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
            const path = generateNavigationPath(spot.id);
            setNavigationPath(path);
            setShowNavigation(true);
          },
        },
      ]
    );
  }, [generateNavigationPath]);

  const navigateHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const totalAvailableSpots = useMemo(() => 
    parkingStats?.availableSpots || 
    parkingSections.reduce((sum, section) => sum + section.availableSlots, 0),
    [parkingStats, parkingSections]
  );

  const renderParkingSpot = useCallback((spot: ParkingSpot) => {
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
        activeOpacity={2}
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
                fontSize: 18,
                fontFamily: FONTS.semiBold,
              }}
            >
              {spot.id}
            </Text>
          </View>
        )}

        {/* highlight ring when selected/section-highlighted */}
        {(isSelected || isHighlighted) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: w + 6,
              height: h + 6,
              borderWidth: 4,
              borderColor: isSelected ? '#00e73aff' : '#FF6B35',
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

  const renderNavigationPath = useCallback(() => {
    if (!showNavigation || navigationPath.length < 2) return null;

    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Draw the path lines */}
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
                height: 6,
                backgroundColor: '#00E676',
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: '0 50%',
                zIndex: 100,
                borderRadius: 3,
              }}
            />
          );
        })}
        
        {/* Draw directional arrow at each waypoint */}
        {navigationPath.map((point, index) => {
          if (index === 0 || index === navigationPath.length - 1) return null;
          
          return (
            <View
              key={`arrow-${index}`}
              style={{
                position: 'absolute',
                left: point.x - 8,
                top: point.y - 8,
                width: 16,
                height: 16,
                backgroundColor: '#00E676',
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 101,
              }}
            />
          );
        })}

        {/* Starting point indicator */}
        <View
          style={{
            position: 'absolute',
            left: navigationPath[0].x - 15,
            top: navigationPath[0].y - 15,
            width: 30,
            height: 30,
            backgroundColor: '#00E676',
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 102,
            borderWidth: 3,
            borderColor: 'white',
          }}
        >
        </View>

        {/* Destination point indicator */}
        <View
          style={{
            position: 'absolute',
            left: navigationPath[navigationPath.length - 1].x - 20,
            top: navigationPath[navigationPath.length - 1].y - 20,
            width: 40,
            height: 40,
            backgroundColor: '#00E676',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 102,
            borderWidth: 3,
            borderColor: 'white',
          }}
        >
          <Ionicons name="flag" size={20} color="white" />
        </View>
      </View>
    );
  }, [showNavigation, navigationPath]);

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
                  {/* Section A - Box */}
                  <View style={{ position: 'absolute', left: 690, top: 110, width: 44, height: 2,  backgroundColor: '#fff',}} />
                  <View style={{ position: 'absolute', left: 690, top: 170, width: 44, height: 2,  backgroundColor: '#fff',}} />
                  {/* Section B - Horizontal dividers */}
                  <View style={{ position: 'absolute', left: 498, top: 30, width: 180, height: 2, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 498, top: 90, width: 180, height: 2, backgroundColor: '#fff' }} />
                  
                  {/* Section B - Vertical dividers */}
                  <View style={{ position: 'absolute', left: 540, top: 30, width: 2, height: 59, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 585, top: 30, width: 2, height: 59, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 630, top: 30, width: 2, height: 59, backgroundColor: '#fff' }} />
                  
                  {/* Section C - Vertical dividers */}
                  <View style={{ position: 'absolute', left: 437, top: 100, width: 2, height: 100, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 497, top: 98, width: 2, height: 100, backgroundColor: '#fff' }} />
                    {/* Section C - Horizontal dividers */}
                  <View style={{ position: 'absolute', left: 440, top: 150, width: 58, height: 2, backgroundColor: '#fff',}} />
                
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
                  
                  {/* Section J - Horizontal dividers */}
                  <View style={{ position: 'absolute', left: 270, top: 368, width: 250, height: 2, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 270, top: 427, width: 250, height: 2, backgroundColor: '#fff' }} />
                  
                  {/* Section J - Vertical dividers */}
                  <View style={{ position: 'absolute', left: 310, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 370, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 430, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />
                  <View style={{ position: 'absolute', left: 485, top: 368, width: 2, height: 59, backgroundColor: '#fff' }} />
                  
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

                  {/* Render parking spots */}
                  {parkingData.map(renderParkingSpot)}
                  {renderNavigationPath()}
                  
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
                  
                  <View style={styles.entrance}>
                    <Text style={styles.entranceText}>Entrance</Text>
                  </View>
                  
                  <View style={styles.exitSign}>
                    <Text style={styles.exitText}>EXIT</Text>
                  </View>
                  
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

      <PanGestureHandler ref={bottomPanelPanRef} onGestureEvent={bottomPanelGestureHandler}>
        <Animated.View style={[bottomPanelAnimatedStyle]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bottomPanel}>
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