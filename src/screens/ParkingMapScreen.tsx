import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
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
import { COLORS } from '../constants/AppConst';
import ParkingMapLayout, { INITIAL_SPOTS } from '../components/MapLayout';

type RootStackParamList = { Home: undefined };
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
  7: 'A1', 4: 'B1', 3: 'B2', 2: 'B3', 1: 'B4',
  5: 'C1', 6: 'C2', 8: 'D1', 9: 'D2', 10: 'D3',
  11: 'D4', 12: 'D5', 13: 'D6', 14: 'D7', 15: 'E1',
  16: 'E2', 17: 'E3', 18: 'F1', 19: 'F2', 20: 'F3',
  21: 'F4', 22: 'F5', 23: 'F6', 24: 'F7', 25: 'G1',
  26: 'G2', 27: 'G3', 28: 'G4', 29: 'G5', 30: 'H1',
  31: 'H2', 32: 'H3', 33: 'I1', 34: 'I2', 35: 'I3',
  36: 'I4', 37: 'I5', 38: 'J1', 39: 'J2', 40: 'J3',
  41: 'J4', 42: 'J5'
};

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
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [parkingData, setParkingData] = useState<ParkingSpot[]>(INITIAL_SPOTS);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [navigationPath, setNavigationPath] = useState<{ x: number; y: number }[]>([]);
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

  const [parkingSections, setParkingSections] = useState<ParkingSection[]>(() => calculateSection());

  const NAVIGATION_WAYPOINTS = useMemo(() => ({
    entrance: { x: 670, y: 280 },
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
    const path: { x: number; y: number }[] = [entrance];

    switch (section) {
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
        path.push({ x: 520, y: 180 });
        path.push({ x: 470, y: 180 });
        break;
      case 'B':
        path.push(NAVIGATION_WAYPOINTS.intersectionB);
        break;
      case 'A':
        path.push(NAVIGATION_WAYPOINTS.intersectionA);
        path.push({ x: 710, y: 150 });
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

  const renderSectionIndicator = useCallback((section: ParkingSection) => (
    <TouchableOpacity
      key={section.id}
      style={[
        styles.sectionIndicator,
        {
          backgroundColor: section.isFull ? '#666' : COLORS.primary,
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

      <View style={[styles.header, { backgroundColor: '#4C0E0E' }]}>
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
                  <ParkingMapLayout
                    parkingData={parkingData}
                    selectedSpot={selectedSpot}
                    highlightedSection={highlightedSection}
                    onSpotPress={handleSpotPress}
                    navigationPath={navigationPath}
                    showNavigation={showNavigation}
                  />

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