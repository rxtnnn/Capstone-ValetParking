import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useNavigation, useFocusEffect, RouteProp, useRoute } from '@react-navigation/native';
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
import { COLORS, FONTS} from '../constants/AppConst';
import { MapLayout, DESTINATION_OFFSETS } from '../components/MapLayout';
import { ParkingConfigService } from '../services/ParkingConfigService';
import { FloorConfig, Position } from '../types/parkingConfig';


type RootStackParamList = {
  Home: undefined;
  ParkingMap: { floor: number };
};
type ParkingMapScreenNavigationProp = NavigationProp<RootStackParamList>;
type ParkingMapScreenRouteProp = RouteProp<RootStackParamList, 'ParkingMap'>;
interface ParkingSpot {
  id: string;
  isOccupied: boolean;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  section?: string;
  rotation?: string;
  hasSensor?: boolean; // Track if spot has a sensor configured
}
interface ParkingSection {
  id: string;
  label: string;
  totalSlots: number;
  availableSlots: number;
  isFull: boolean;
}

// These constants are now deprecated - kept for backwards compatibility
// Configuration is now loaded dynamically from ParkingConfigService

const ParkingMapScreen: React.FC = () => {
  const navigation = useNavigation<ParkingMapScreenNavigationProp>();
  const route = useRoute<ParkingMapScreenRouteProp>();
  const floorNumber = route.params?.floor ?? 4;

  // Dynamic configuration state
  const [floorConfig, setFloorConfig] = useState<FloorConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Existing state
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [parkingData, setParkingData] = useState<ParkingSpot[]>([]);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [navigationPath, setNavigationPath] = useState<{x: number, y: number}[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [parkingStats, setParkingStats] = useState<ParkingStats | null>(null);
  const [parkingSections, setParkingSections] = useState<ParkingSection[]>([]);
  const [showFloorModal, setShowFloorModal] = useState(false);

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

  // Load parking configuration on mount
  useEffect(() => {
    let isMounted = true;

    const loadConfiguration = async () => {
      try {
        setIsLoadingConfig(true);
        setConfigError(null);

        // Load floor configuration based on route parameter
        const config = await ParkingConfigService.getFloorConfig('usjr_quadricentennial', floorNumber);

        if (!isMounted) return;

        if (!config) {
          throw new Error('Floor configuration not found');
        }

        setFloorConfig(config);

        // Initialize parking spots from config
        const initialSpots: ParkingSpot[] = config.parking_spots.map(spot => ({
          id: spot.spot_id,
          isOccupied: false,
          position: spot.position,
          width: spot.dimensions.width,
          height: spot.dimensions.height,
          section: spot.section,
          rotation: spot.rotation,
          hasSensor: spot.sensor_id !== null && spot.sensor_id !== undefined, // Check if spot has a sensor
        }));

        setParkingData(initialSpots);

        // Set initial view position if configured
        if (config.initial_view) {
          translateX.value = config.initial_view.translateX;
          translateY.value = config.initial_view.translateY;
          scale.value = config.initial_view.scale;
        }

        console.log('Parking configuration loaded successfully');
      } catch (error) {
        console.error('Failed to load parking configuration:', error);
        if (isMounted) {
          setConfigError(error instanceof Error ? error.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingConfig(false);
        }
      }
    };

    loadConfiguration();

    return () => {
      isMounted = false;
    };
  }, [floorNumber]);

  // Derived values from floor config
  const sensorToSpotMapping = useMemo(() => {
    if (!floorConfig) return {};
    return ParkingConfigService.getSensorToSpotMapping(floorConfig);
  }, [floorConfig]);

  const navigationWaypointsMap = useMemo(() => {
    if (!floorConfig) return {};
    return ParkingConfigService.getWaypointsMap(floorConfig);
  }, [floorConfig]);

  const gestureLimits = useMemo(() => {
    if (!floorConfig?.gesture_limits) {
      // Default gesture limits
      return {
        maxTranslateX: 300,
        minTranslateX: -300,
        maxTranslateY: 200,
        minTranslateY: -600,
        minScale: 0.7,
        maxScale: 3,
        clampMinScale: 0.8,
        clampMaxScale: 2.5,
      };
    }
    return floorConfig.gesture_limits;
  }, [floorConfig]);

  // Calculate sections from dynamic config
  const calculateSection = useCallback((): ParkingSection[] => {
    if (!floorConfig) return [];

    const sectionMap: { [key: string]: number } = {};
    const mapping = ParkingConfigService.getSensorToSpotMapping(floorConfig);

    Object.values(mapping).forEach(spotId => {
      const section = spotId.charAt(1); // Extract section from '4A1' -> 'A'
      sectionMap[section] = (sectionMap[section] || 0) + 1;
    });

    return Object.entries(sectionMap).map(([section, total]) => ({
      id: section,
      label: section,
      totalSlots: total,
      availableSlots: total,
      isFull: false,
    })).sort((a, b) => a.id.localeCompare(b.id));
  }, [floorConfig]);

  // Update sections when floor config changes
  useEffect(() => {
    if (floorConfig) {
      setParkingSections(calculateSection());
    }
  }, [floorConfig, calculateSection]);

  const generateNavigationPath = useCallback((spotId: string) => {
    if (!floorConfig) return [];

    const spot = parkingData.find(s => s.id === spotId);
    if (!spot) return [];

    const section = spotId.charAt(1); // Extract section from '4A1' -> 'A'
    const index = parseInt(spotId.slice(2)); // Extract index from '4A1' -> 1
    const waypointsMap = ParkingConfigService.getWaypointsMap(floorConfig);

    // Find the navigation route for this specific slot (section + index)
    // Falls back to section-only route if no index-specific route exists
    let route = floorConfig.navigation_routes.find(
      (r: any) => r.section === section && r.index === index
    );
    if (!route) {
      route = floorConfig.navigation_routes.find(
        (r: any) => r.section === section && !r.index
      );
    }
    if (!route) return [];

    const path: Position[] = [];

    // Build path from waypoint IDs
    for (const waypointId of route.waypoints) {
      if (waypointId === 'destination') {
        // Get custom offset for this spot, or use default
        const spotKey = `${section}${index}`;
        const offset = DESTINATION_OFFSETS[spotKey] || { offsetX: 20, offsetY: 30 };
        path.push({
          x: spot.position.x + offset.offsetX,
          y: spot.position.y + offset.offsetY
        });
      } else {
        const waypoint = waypointsMap[waypointId];
        if (waypoint) {
          path.push(waypoint);
        }
      }
    }

    return path;
  }, [parkingData, floorConfig]);

  const updateParkingSpotsFromService = useCallback((stats: ParkingStats) => {
    if (!isMountedRef.current || !floorConfig) return;

    setParkingStats(stats);

    // Build maps from API data using slot_name directly
    const spotOccupancyMap: { [key: string]: boolean } = {};
    const spotHasSensorMap: { [key: string]: boolean } = {};

    if (stats.sensorData && Array.isArray(stats.sensorData)) {
      stats.sensorData.forEach((sensor: any) => {
        if (sensor.slot_name) {
          // Mark spot as having sensor if it has sensor_id assigned (from sensor_assignments)
          // This syncs with backend sensor management
          spotHasSensorMap[sensor.slot_name] = sensor.sensor_id !== null && sensor.sensor_id !== undefined;
          // Get occupancy status directly from API
          // is_occupied = true means car detected (occupied/red)
          // is_occupied = false means no car detected (available/green)
          spotOccupancyMap[sensor.slot_name] = sensor.is_occupied === true || sensor.is_occupied === 1;
        }
      });
    }

    setParkingData(prevSpots => {
      if (!isMountedRef.current) return prevSpots;

      return prevSpots.map(spot => ({
        ...spot,
        hasSensor: spotHasSensorMap.hasOwnProperty(spot.id)
          ? spotHasSensorMap[spot.id]
          : spot.hasSensor,
        isOccupied: spotOccupancyMap.hasOwnProperty(spot.id)
          ? spotOccupancyMap[spot.id]
          : spot.isOccupied,
      }));
    });

    setParkingSections(prevSections => {
      if (!isMountedRef.current) return prevSections;

      return prevSections.map(section => {
        // Get all slot names for this section from the occupancy map
        const sectionSpots = Object.keys(spotOccupancyMap)
          .filter(slotName => slotName.charAt(1) === section.id);

        const totalSlots = sectionSpots.length;
        const availableSlots = sectionSpots.filter(slotName =>
          !spotOccupancyMap[slotName]
        ).length;

        return {
          ...section,
          totalSlots,
          availableSlots,
          isFull: availableSlots === 0
        };
      });
    });
  }, [floorConfig]);

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
      const { maxTranslateX, minTranslateX, maxTranslateY, minTranslateY } = gestureLimits;

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
      const { minScale, maxScale } = gestureLimits;
      scale.value = Math.max(minScale, Math.min(maxScale, context.startScale * event.scale));
    },
    onEnd: () => {
      const { clampMinScale, clampMaxScale } = gestureLimits;
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

  // Get available spots for current floor
  const currentFloorAvailableSpots = useMemo(() => {
    const floorData = parkingStats?.floors?.find(f => f.floor === floorNumber);
    return floorData?.available ?? 0;
  }, [parkingStats, floorNumber]);

  const renderParkingSpot = useCallback((spot: ParkingSpot) => {
    const carImage = require('../../assets/car_top.png');
    const isSelected = selectedSpot === spot.id;
    const spotSection = spot.id.charAt(1); // Extract section from '4A1' -> 'A'
    const isHighlighted = highlightedSection === spotSection;
    const rotation = spot.rotation || '0deg';
    const w = spot.width || 30;
    const h = spot.height || 30;

    // Determine background color based on sensor status
    // Gray for no sensor, Green for available (with sensor), Red for occupied (with sensor)
    let backgroundColor = '#CCCCCC'; // Gray for spots without sensors
    let borderWidth = 0;

    if (spot.hasSensor) {
      backgroundColor = spot.isOccupied ? COLORS.primary : COLORS.green; // Red if occupied, Green if available
    }

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
        {spot.hasSensor && spot.isOccupied ? (
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
              backgroundColor: backgroundColor,
              borderRadius: 4,
              borderWidth: borderWidth,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: rotation }],
            }}
          >
            <Text
              style={{
                color: spot.hasSensor ? '#FFF' : '#666',
                fontWeight: '700',
                fontSize: 18,
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
              borderColor: '#FFD700', // Yellow highlight for section selection
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

        {/* Arrow pointing to destination */}
        {navigationPath.length >= 2 && (() => {
          const lastPoint = navigationPath[navigationPath.length - 1];
          const prevPoint = navigationPath[navigationPath.length - 2];
          const deltaX = lastPoint.x - prevPoint.x;
          const deltaY = lastPoint.y - prevPoint.y;
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

          return (
            <View
              style={{
                position: 'absolute',
                left: lastPoint.x - 12,
                top: lastPoint.y - 12,
                width: 24,
                height: 24,
                backgroundColor: '#00E676',
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 103,
                borderWidth: 2,
                borderColor: 'white',
              }}
            >
              <Ionicons
                name="arrow-forward"
                size={14}
                color="white"
                style={{ transform: [{ rotate: `${angle}deg` }] }}
              />
            </View>
          );
        })()}

      </View>
    );
  }, [showNavigation, navigationPath]);

  // Show loading screen while configuration is being loaded
  if (isLoadingConfig) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.primary, marginTop: 16, fontFamily: FONTS.semiBold }}>
          Loading parking configuration...
        </Text>
      </View>
    );
  }

  // Show error screen if configuration failed to load
  if (configError || !floorConfig) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle" size={64} color={COLORS.primary} />
        <Text style={{ color: COLORS.primary, marginTop: 16, fontFamily: FONTS.semiBold, fontSize: 18, textAlign: 'center' }}>
          Failed to load parking configuration
        </Text>
        <Text style={{ color: '#666', marginTop: 8, fontFamily: FONTS.regular, fontSize: 14, textAlign: 'center' }}>
          {configError || 'Configuration not available'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={{ color: 'white', fontFamily: FONTS.semiBold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Parking Map</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionIndicators}
          contentContainerStyle={styles.sectionIndicatorsContent}
        >
          {parkingSections.map(renderSectionIndicator)}
        </ScrollView>
      </LinearGradient>

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
                  <MapLayout styles={styles} />
                  {parkingData.map(renderParkingSpot)}
                  {renderNavigationPath()}
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
              <Text style={styles.buildingName}>{floorConfig.building_name}</Text>
              <View style={styles.floorDetails}>
                <View>
                  <Text style={styles.floorLabel}>Floor</Text>
                  <Text style={styles.floorNumber}>{floorConfig.floor_number}</Text>
                </View>
                <View>
                  <Text style={styles.availableLabel}>Available Spots</Text>
                  <Text style={styles.availableNumber}>{currentFloorAvailableSpots}</Text>
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
                <Text style={styles.secondaryButtonText} onPress={navigateHome}>Back Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowFloorModal(true)}>
                <Text style={styles.primaryButtonText}>Choose Floor</Text>
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

      {/* Floor Selection Modal */}
      <Modal
        visible={showFloorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFloorModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowFloorModal(false)}
          />
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 30,
              paddingHorizontal: 20,
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: '#DDD',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#333',
                  fontFamily: FONTS.semiBold,
                }}
              >
                Select Floor
              </Text>
            </View>

            {/* Floor options - sorted by available spots (highest first) */}
            <View style={{ gap: 12 }}>
              {[1, 2, 3, 4]
                .map((floor) => {
                  const floorData = parkingStats?.floors?.find(f => f.floor === floor);
                  return {
                    floor,
                    available: floorData?.available ?? 0,
                    total: floorData?.total ?? 0,
                  };
                })
                .sort((a, b) => b.available - a.available)
                .map(({ floor, available, total }) => {
                const isCurrentFloor = floorNumber === floor;
                const availableSpots = available;
                const totalSpots = total;
                const hasData = totalSpots > 0;

                return (
                  <TouchableOpacity
                    key={floor}
                    style={{
                      backgroundColor: isCurrentFloor ? COLORS.primary : '#F8F9FA',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: isCurrentFloor ? 0 : 1,
                      borderColor: '#E8E8E8',
                      shadowColor: isCurrentFloor ? COLORS.primary : '#000',
                      shadowOffset: { width: 0, height: isCurrentFloor ? 4 : 1 },
                      shadowOpacity: isCurrentFloor ? 0.3 : 0.05,
                      shadowRadius: isCurrentFloor ? 8 : 2,
                      elevation: isCurrentFloor ? 6 : 1,
                    }}
                    onPress={() => {
                      setShowFloorModal(false);
                      if (floor !== floorNumber) {
                        navigation.navigate('ParkingMap', { floor });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Floor icon */}
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: isCurrentFloor ? 'rgba(255,255,255,0.2)' : '#FFF',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 14,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: 'bold',
                          color: isCurrentFloor ? 'white' : COLORS.primary,
                          fontFamily: FONTS.semiBold,
                        }}
                      >
                        {floor}
                      </Text>
                    </View>

                    {/* Floor info */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: isCurrentFloor ? 'white' : '#333',
                          fontFamily: FONTS.semiBold,
                          marginBottom: 2,
                        }}
                      >
                        {floor === 1 ? '1st' : floor === 2 ? '2nd' : floor === 3 ? '3rd' : '4th'} Floor
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: isCurrentFloor ? 'rgba(255,255,255,0.8)' : '#888',
                          fontFamily: FONTS.regular,
                        }}
                      >
                        {hasData ? `${availableSpots} of ${totalSpots} spots available` : 'No sensors assigned'}
                      </Text>
                    </View>

                    {/* Status indicator */}
                    <View style={{ alignItems: 'flex-end' }}>
                      {isCurrentFloor ? (
                        <View
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.25)',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Current</Text>
                        </View>
                      ) : hasData ? (
                        <View
                          style={{
                            backgroundColor: availableSpots > 0 ? COLORS.green : COLORS.primary,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                            {availableSpots > 0 ? 'Available' : 'Full'}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            backgroundColor: '#E0E0E0',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ color: '#888', fontSize: 12, fontWeight: '600' }}>No Data</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cancel button */}
            <TouchableOpacity
              style={{
                marginTop: 20,
                paddingVertical: 12,
                alignItems: 'center',
                backgroundColor: COLORS.primary,
                borderRadius: 12,
              }}
              onPress={() => setShowFloorModal(false)}
              activeOpacity={0.7}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16, fontFamily: FONTS.semiBold}}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ParkingMapScreen;