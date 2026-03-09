import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useNavigation, useFocusEffect, RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
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
import { NotificationManager } from '../services/NotifManager';
import { TokenManager } from '../config/api';


type RootStackParamList = {
  Home: undefined;
  ParkingMap: { floor: number };
};
type ParkingMapScreenNavigationProp = NavigationProp<RootStackParamList>;
type ParkingMapScreenRouteProp = RouteProp<RootStackParamList, 'ParkingMap'>;
interface ParkingSpot {
  id: string;
  spaceId?: number; // numeric DB id used for override API calls
  isOccupied: boolean;
  effectiveStatus?: 'available' | 'occupied' | 'blocked' | 'inactive';
  manualOverride?: boolean;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  section?: string;
  rotation?: string;
  hasSensor?: boolean;
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
  const [showParkingConfirmModal, setShowParkingConfirmModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [selectedSpotForNav, setSelectedSpotForNav] = useState<string | null>(null);
  const [navigatingToSpot, setNavigatingToSpot] = useState<string | null>(null); // Track which spot user is navigating to
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Success modal after parking confirmed
  const [showSpotTakenModal, setShowSpotTakenModal] = useState(false); // Modal when someone else took the spot
  const [suggestedSpots, setSuggestedSpots] = useState<string[]>([]); // Suggested spots when spot is taken
  const [highlightedSpots, setHighlightedSpots] = useState<string[]>([]); // Highlight specific spots
  const previousParkingDataRef = useRef<ParkingSpot[]>([]); // Track previous parking data to detect changes

  // Security spot actions modal
  const [showSpotActionsModal, setShowSpotActionsModal] = useState(false);
  const [spotActionsTarget, setSpotActionsTarget] = useState<ParkingSpot | null>(null);
  const [spotActionsTab, setSpotActionsTab] = useState<'override' | 'report'>('override');
  const [overrideStatus, setOverrideStatus] = useState<'available' | 'occupied' | 'blocked'>('available');
  const [overridePin, setOverridePin] = useState('');
  const [reportIssue, setReportIssue] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const isSecurityRole = TokenManager.getUser()?.role === 'security';
  const [spotActionsResult, setSpotActionsResult] = useState<{ type: 'success' | 'warning' | 'error'; title: string; message: string } | null>(null);


  const isMountedRef = useRef(true);
  const unsubscribeFunctionsRef = useRef<{
    parkingUpdates?: () => void;
    connectionStatus?: () => void;
  }>({});

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const bottomPanelY = useSharedValue(0);

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

  // Clear navigation when floor changes
  useEffect(() => {
    setShowNavigation(false);
    setNavigationPath([]);
    setSelectedSpot(null);
    setNavigatingToSpot(null);
    setHighlightedSpots([]);
  }, [floorNumber]);

  useEffect(() => { //runs when parking data changes
    if (!navigatingToSpot || !showNavigation) return;

    const targetSpot = parkingData.find(spot => spot.id === navigatingToSpot);
    const previousSpot = previousParkingDataRef.current.find(spot => spot.id === navigatingToSpot);

    // Check if the spot just became occupied (was not occupied before, now is occupied)
    if (targetSpot && previousSpot && !previousSpot.isOccupied && targetSpot.isOccupied) {
      // Show confirmation modal asking if user parked
      setShowParkingConfirmModal(true);
    }

    // Update previous data reference
    previousParkingDataRef.current = parkingData;
  }, [parkingData, navigatingToSpot, showNavigation]);

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
    const spotEffectiveStatusMap: { [key: string]: 'available' | 'occupied' | 'blocked' | 'inactive' } = {};
    const spotManualOverrideMap: { [key: string]: boolean } = {};
    const spotSpaceIdMap: { [key: string]: number } = {};

    if (stats.sensorData && Array.isArray(stats.sensorData)) {
      stats.sensorData.forEach((sensor: any) => {
        if (sensor.slot_name) {
          spotSpaceIdMap[sensor.slot_name] = sensor.id;
          spotHasSensorMap[sensor.slot_name] = sensor.sensor_id !== null && sensor.sensor_id !== undefined;
          if (sensor.effective_status) {
            spotEffectiveStatusMap[sensor.slot_name] = sensor.effective_status;
            spotOccupancyMap[sensor.slot_name] = sensor.effective_status !== 'available';
          } else {
            spotOccupancyMap[sensor.slot_name] = sensor.is_occupied === true || sensor.is_occupied === 1;
          }
          spotManualOverrideMap[sensor.slot_name] = sensor.manual_override === true;
        }
      });
    }

    setParkingData(prevSpots => {
      if (!isMountedRef.current) return prevSpots;

      return prevSpots.map(spot => ({
        ...spot,
        spaceId: spotSpaceIdMap.hasOwnProperty(spot.id) ? spotSpaceIdMap[spot.id] : spot.spaceId,
        hasSensor: spotHasSensorMap.hasOwnProperty(spot.id) ? spotHasSensorMap[spot.id] : spot.hasSensor,
        effectiveStatus: spotEffectiveStatusMap.hasOwnProperty(spot.id) ? spotEffectiveStatusMap[spot.id] : spot.effectiveStatus,
        manualOverride: spotManualOverrideMap.hasOwnProperty(spot.id) ? spotManualOverrideMap[spot.id] : spot.manualOverride,
        isOccupied: spotOccupancyMap.hasOwnProperty(spot.id) ? spotOccupancyMap[spot.id] : spot.isOccupied,
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
  
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startPanelY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      const { maxTranslateX, minTranslateX, maxTranslateY, minTranslateY } = gestureLimits;
      if (translateX.value > maxTranslateX) translateX.value = maxTranslateX;
      else if (translateX.value < minTranslateX) translateX.value = minTranslateX;
      if (translateY.value > maxTranslateY) translateY.value = maxTranslateY;
      else if (translateY.value < minTranslateY) translateY.value = minTranslateY;
    })
    .minPointers(1)
    .maxPointers(1);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const { minScale, maxScale } = gestureLimits;
      scale.value = Math.max(minScale, Math.min(maxScale, startScale.value * event.scale));
    })
    .onEnd(() => {
      const { clampMinScale, clampMaxScale } = gestureLimits;
      if (scale.value < clampMinScale) scale.value = clampMinScale;
      else if (scale.value > clampMaxScale) scale.value = clampMaxScale;
    });

  const mapGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const bottomPanelGesture = Gesture.Pan()
    .onStart(() => {
      startPanelY.value = bottomPanelY.value;
    })
    .onUpdate((event) => {
      const newY = startPanelY.value + event.translationY;
      bottomPanelY.value = Math.max(-50, Math.min(150, newY));
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentY = bottomPanelY.value;
      if (velocity > 500 || currentY > 75) {
        bottomPanelY.value = withSpring(120);
      } else if (velocity < -500 || currentY < 25) {
        bottomPanelY.value = withSpring(0);
      } else {
        bottomPanelY.value = withSpring(currentY > 50 ? 120 : 0);
      }
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
    setNavigatingToSpot(null);
    setHighlightedSpots([]);
  }, []);

  const handleParkingConfirm = useCallback(async () => {
    // TODO: remove setRfidEntryDetected(true) when RFID hardware is available for testing
    NotificationManager.setRfidEntryDetected(true);
    await NotificationManager.pauseSpotNotifications();
    setShowParkingConfirmModal(false);
    setNavigatingToSpot(null);
    clearNavigation();
    setShowSuccessModal(true);
  }, [clearNavigation]);

  const handleParkingCancel = useCallback(() => {
    setShowParkingConfirmModal(false);

    // If someone else took the spot, find nearby available spots
    if (navigatingToSpot) {
      const takenSpotSection = navigatingToSpot.charAt(1); // Extract section from '4A1' -> 'A'

      // Find available spots, prioritizing same section
      const availableSpots = parkingData
        .filter(spot => spot.hasSensor && !spot.isOccupied && spot.id !== navigatingToSpot)
        .sort((a, b) => {
          const aSection = a.id.charAt(1);
          const bSection = b.id.charAt(1);
          // Prioritize same section
          if (aSection === takenSpotSection && bSection !== takenSpotSection) return -1;
          if (bSection === takenSpotSection && aSection !== takenSpotSection) return 1;
          return a.id.localeCompare(b.id);
        });

      // Clear current navigation
      clearNavigation();

      // Get up to 3 nearby suggestions
      const suggestions = availableSpots.slice(0, 3).map(s => s.id);
      setSuggestedSpots(suggestions);
      setShowSpotTakenModal(true);

      // Highlight the specific suggested spots (not the whole section)
      setHighlightedSpots(suggestions);
    }
  }, [navigatingToSpot, parkingData, clearNavigation]);

  const showParkingConfirmation = useCallback(() => {
    setShowParkingConfirmModal(true);
  }, []);

  const handleSectionPress = useCallback((sectionId: string) => {
    setHighlightedSection(prev => prev === sectionId ? null : sectionId);
  }, []);

  const handleSpotPress = useCallback((spot: ParkingSpot) => {
    if (!spot.hasSensor) return;

    // Security can tap any sensor-assigned spot to get override/report modal
    if (isSecurityRole) {
      setSpotActionsTarget(spot);
      setOverrideStatus(spot.isOccupied ? 'occupied' : 'available');
      setOverridePin('');
      setReportIssue('');
      setSpotActionsTab('override');
      setShowSpotActionsModal(true);
      return;
    }

    if (spot.isOccupied) {
      Alert.alert('Spot Occupied', 'This parking spot is currently occupied.');
      return;
    }

    setSelectedSpot(spot.id);
    setSelectedSpotForNav(spot.id);
    setHighlightedSpots([]);
    setShowNavigationModal(true);
  }, [isSecurityRole]);

  const navigateHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  // Get available spots for current floor
  const currentFloorAvailableSpots = useMemo(() => {
    const floorData = parkingStats?.floors?.find(f => f.floor === floorNumber);
    return floorData?.available ?? 0;
  }, [parkingStats, floorNumber]);

  const renderParkingSpot = useCallback((spot: ParkingSpot) => {
    const isSelected = selectedSpot === spot.id;
    const spotSection = spot.id.charAt(1); // Extract section from '4A1' -> 'A'
    const isSectionHighlighted = highlightedSection === spotSection;
    const isSpotHighlighted = highlightedSpots.includes(spot.id); // Check if this specific spot is highlighted
    const rotation = spot.rotation || '0deg';
    const w = spot.width || 30;
    const h = spot.height || 30;
    let backgroundColor = '#CCCCCC';
    let borderWidth = 0;

    if (spot.hasSensor) {
      const status = spot.effectiveStatus;
      if (status === 'blocked') {
        backgroundColor = '#FF9800';
      } else if (status === 'inactive') {
        backgroundColor = '#9E9E9E';
      } else {
        backgroundColor = spot.isOccupied ? COLORS.primary : COLORS.green;
      }
    }

    // Security can interact with any sensor-assigned spot; others only available ones
    const isClickable = spot.hasSensor && (isSecurityRole || !spot.isOccupied);

    return (
      <TouchableOpacity
        key={spot.id}
        onPress={() => handleSpotPress(spot)}
        disabled={!isClickable}
        style={{
          position: 'absolute',
          left: spot.position.x,
          top: spot.position.y,
          width: w,
          height: h,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isClickable ? 1 : 0.8,
        }}
        activeOpacity={isClickable ? 0.7 : 1}
      >
        {spot.hasSensor && spot.isOccupied ? (
          <View
            style={{
              width: w,
              height: h,
              backgroundColor: COLORS.primary,
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
                color: spot.hasSensor ? '#FFF' : '#FFF',
                fontWeight: '700',
                fontSize: 18,
                fontFamily: FONTS.semiBold,
              }}
            >
              {spot.id}
            </Text>
          </View>
        )}
        {(isSelected || isSectionHighlighted || isSpotHighlighted) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: w + 4,
              height: h + 4,
              borderWidth: 4,
              borderColor: '#FFD700', // Yellow highlight
              transform: [{ rotate: rotation }],
            }}
          />
        )}
        {spot.manualOverride && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#FF9800',
              borderWidth: 1,
              borderColor: '#fff',
            }}
          />
        )}
      </TouchableOpacity>
    );
  }, [selectedSpot, highlightedSection, highlightedSpots, handleSpotPress, isSecurityRole]);

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

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 6, gap: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        {[
          { color: '#48D666', label: 'Available' },
          { color: '#B22020', label: 'Occupied' },
          { color: '#CCCCCC', label: 'No Sensor' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color }} />
            <Text style={{ fontSize: 11, color: '#444', fontFamily: FONTS.regular }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapFrame}>
          <GestureDetector gesture={mapGesture}>
            <Animated.View style={styles.mapWrapper}>
              <Animated.View style={[styles.parkingLayout, animatedStyle]}>
                <MapLayout styles={styles} />
                {parkingData.map(renderParkingSpot)}
                {renderNavigationPath()}
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      <GestureDetector gesture={bottomPanelGesture}>
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
      </GestureDetector>

      {showNavigation && (
        <View style={{ position: 'absolute', top: 150, right: 20, gap: 10, zIndex: 2000 }}>
          <TouchableOpacity style={[styles.clearRouteButton, { position: 'relative', top: 0, right: 0, backgroundColor: COLORS.primary }]} onPress={clearNavigation}>
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={styles.clearRouteText}>Clear Route</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floor Selection Modal */}
    <Modal
      visible={showFloorModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFloorModal(false)}
    >
      <View style={styles.floorModalOverlay}>
        <TouchableOpacity
          style={styles.floorModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowFloorModal(false)}
        />
        <View style={styles.floorModalContainer}>
          {/* Handle bar */}
          <View style={styles.floorModalHandle} />

          {/* Header */}
          <View style={styles.floorModalHeader}>
            <Text style={styles.floorModalHeaderText}>
              Select Floor
            </Text>
          </View>

          {/* Floor options - sorted by available spots (highest first) */}
          <View style={styles.floorOptionsContainer}>
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
                  style={[
                    styles.floorOption,
                    isCurrentFloor ? styles.floorOptionCurrent : styles.floorOptionInactive,
                    !hasData && styles.floorOptionDisabled, //
                    {
                      shadowColor: isCurrentFloor ? COLORS.primary : '#474747',
                      shadowOffset: { width: 0, height: isCurrentFloor ? 4 : 1 },
                      shadowOpacity: isCurrentFloor ? 0.3 : 0.05,
                      shadowRadius: isCurrentFloor ? 8 : 2,
                      elevation: isCurrentFloor ? 6 : 1,
                    }
                  ]}
                  onPress={() => {
                    if (!hasData) return; // Prevent action if no data
                    setShowFloorModal(false);
                    if (floor !== floorNumber) {
                      navigation.navigate('ParkingMap', { floor });
                    }
                  }}
                  activeOpacity={hasData ? 0.7 : 1} // No opacity change if disabled
                  disabled={!hasData} // Disable touch if no data
                >
                  {/* Floor icon */}
                  <View style={[
                    styles.floorIconContainer,
                    isCurrentFloor ? styles.floorIconCurrent : styles.floorIconInactive,
                    !hasData && styles.floorIconDisabled // Add disabled style
                  ]}>
                    <Text style={[
                      styles.floorIconText,
                      { color: isCurrentFloor ? 'white' : !hasData ? '#999' : COLORS.primary }
                    ]}>
                      {floor}
                    </Text>
                  </View>

                  {/* Floor info */}
                  <View style={styles.floorInfoContainer}>
                    <Text style={[
                      styles.floorLabel1,
                      { color: isCurrentFloor ? 'white' : !hasData ? '#999' : '#333' }
                    ]}>
                      {floor === 1 ? '1st' : floor === 2 ? '2nd' : floor === 3 ? '3rd' : '4th'} Floor
                    </Text>
                    <Text style={[
                      styles.floorAvailability,
                      { color: isCurrentFloor ? 'rgba(255,255,255,0.8)' : !hasData ? '#999' : '#888' }
                    ]}>
                      {hasData ? `${availableSpots} ${availableSpots === 1 ? 'spot' : 'spots'} available` : 'No sensors assigned'}
                    </Text>
                  </View>

                  {/* Status indicator */}
                  <View style={styles.floorStatusContainer}>
                    {isCurrentFloor ? (
                      <View style={styles.floorStatusBadgeCurrent}>
                        <Text style={styles.floorStatusTextCurrent}>Current</Text>
                      </View>
                    ) : hasData ? (
                      <View style={[
                        styles.floorStatusBadge,
                        { backgroundColor: availableSpots > 0 ? COLORS.green : COLORS.primary }
                      ]}>
                        <Text style={styles.floorStatusText}>
                          {availableSpots > 0 ? 'Available' : 'Full'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.floorStatusBadgeNoData}>
                        <Text style={styles.floorStatusTextNoData}>No Data</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.floorModalCancelButton}
            onPress={() => setShowFloorModal(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.floorModalCancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

      {/* Navigation Modal */}
      <Modal
        visible={showNavigationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNavigationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.navigationModalContainer}>
            <View style={styles.navigationModalHeader}>
              <View style={styles.navigationHeaderText}>
                <Text style={styles.navigationModalTitle}>Navigate to Spot</Text>
                <Text style={styles.navigationModalSubtitle}>
                  Find your way to the parking spot
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNavigationModal(false)}
                style={styles.navigationCloseButton}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.navigationModalContent}>
              <Text style={styles.navigationQuestion}>
                Would you like to navigate to parking spot {selectedSpotForNav}?
              </Text>
            </View>

            <View style={styles.navigationModalActions}>
              <TouchableOpacity
                style={styles.navigationCancelButton}
                onPress={() => setShowNavigationModal(false)}
              >
                <Text style={styles.navigationCancelText}>CANCEL</Text>
              </TouchableOpacity>
              {/* For Navigation */}
              <TouchableOpacity
                style={styles.navigationGuideButton}
                onPress={() => {
                  if (selectedSpotForNav) {
                    const path = generateNavigationPath(selectedSpotForNav);
                    setNavigationPath(path);
                    setShowNavigation(true); // activate the navigation overlay with path
                    setNavigatingToSpot(selectedSpotForNav); // stores the spot to navigate e.g. '4A1'
                    previousParkingDataRef.current = parkingData; // Store current state of spot to detect changes
                    setShowNavigationModal(false);
                  }
                }}
              >
                <Text style={styles.navigationGuideText}>GUIDE ME</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Parking Confirmation Modal */}
    <Modal
      visible={showParkingConfirmModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleParkingCancel}
    >
      <View style={styles.parkingConfirmOverlay}>
        <View style={styles.parkingConfirmContainer}>

          {/* Title */}
          <Text style={styles.parkingConfirmTitle}>
            {navigatingToSpot ? `Spot ${navigatingToSpot} is now occupied` : 'Have you parked?'}
          </Text>

          {/* Message */}
          <Text style={styles.parkingConfirmMessage}>
            {navigatingToSpot
              ? 'Did you park here? Confirming will clear your navigation and stop parking spot notifications.'
              : 'Confirming will clear your navigation route and stop sending parking spot notifications to your device.'}
          </Text>

          {/* Buttons */}
          <View style={styles.parkingConfirmButtonsContainer}>
            <TouchableOpacity
              style={styles.parkingConfirmYesButton}
              onPress={handleParkingConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.parkingConfirmYesButtonText}>
                Yes, I've Parked
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.parkingConfirmNoButton}
              onPress={handleParkingCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.parkingConfirmNoButtonText}>
                No, Someone Else Took It
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

      {/* Success Modal - Parked Successfully */}
    <Modal
      visible={showSuccessModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.parkingConfirmOverlay}>
        <View style={styles.parkingConfirmContainer}>

          {/* Title */}
          <Text style={styles.parkingConfirmTitle}>
            Parked Successfully!
          </Text>

          {/* Message */}
          <Text style={styles.parkingConfirmMessage}>
            Navigation cleared and notifications paused. Enjoy your visit!
          </Text>

          {/* OK Button */}
          <View style={styles.parkingConfirmYesButtonsContainer}>
            <TouchableOpacity
              style={[styles.parkingConfirmYesButton, { flex: 1 }]}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.parkingConfirmYesButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

      {/* Spot Taken Modal - Suggest Other Spots */}
    <Modal
      visible={showSpotTakenModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSpotTakenModal(false)}
    >
      <View style={styles.parkingConfirmOverlay}>
        <View style={styles.parkingConfirmContainer}>
          {/* Title */}
          <Text style={styles.parkingConfirmTitle}>
            Spot Taken
          </Text>

          {/* Message */}
          <Text style={styles.parkingConfirmMessage}>
            {suggestedSpots.length > 0
              ? "No worries! Here are nearby available spots:"
              : "Sorry, there are no available spots on this floor. Try checking another floor."}
          </Text>

          {/* Suggested Spots */}
          {suggestedSpots.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
              {suggestedSpots.map((spotId) => (
                <View key={spotId} style={{ backgroundColor: COLORS.green, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 }}>
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.semiBold }}>{spotId}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Hint */}
          {suggestedSpots.length > 0 && (
            <Text style={{ fontSize: 13, color: '#888', fontFamily: FONTS.regular, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>
              Tap on any available (green) spot to navigate
            </Text>
          )}

          {/* OK Button */}
          <View style={styles.parkingConfirmYesButtonsContainer}>
            <TouchableOpacity
              style={[styles.parkingConfirmYesButton, { backgroundColor: COLORS.primary, flex: 2 }]}
              onPress={() => setShowSpotTakenModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.parkingConfirmYesButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
      {/* Security: Spot Actions Modal */}
      <Modal
        visible={showSpotActionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpotActionsModal(false)}
      >
        <View style={styles.parkingConfirmOverlay}>
          <View style={styles.spotActionsModalContainer}>

            {/* Icon + Title */}
            <View style={styles.spotActionsIconContainer}>
              <Ionicons name="shield-checkmark" size={36} color="#fff" />
            </View>
            <Text style={styles.parkingConfirmTitle}>Spot Actions</Text>

            {/* Spot ID + Status badge */}
            <View style={styles.spotActionsSpotInfo}>
              <Text style={styles.spotActionsSpotId}>{spotActionsTarget?.id}</Text>
              <View style={[styles.spotActionsStatusBadge, { backgroundColor: spotActionsTarget?.isOccupied ? COLORS.primary : COLORS.green }]}>
                <Text style={styles.spotActionsStatusText}>
                  {spotActionsTarget?.isOccupied ? 'Occupied' : 'Available'}
                </Text>
              </View>
            </View>

            {/* Close button */}
            <TouchableOpacity style={styles.spotActionsCloseButton} onPress={() => setShowSpotActionsModal(false)}>
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>

            {/* Tabs */}
            <View style={styles.spotActionsTabs}>
              <TouchableOpacity
                style={[styles.spotActionsTab, spotActionsTab === 'override' ? styles.spotActionsTabActive : styles.spotActionsTabInactive]}
                onPress={() => setSpotActionsTab('override')}
              >
                <Text style={[styles.spotActionsTabText, spotActionsTab === 'override' ? styles.spotActionsTabTextActive : styles.spotActionsTabTextInactive]}>
                  Override Status
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.spotActionsTab, spotActionsTab === 'report' ? styles.spotActionsTabActive : styles.spotActionsTabInactive]}
                onPress={() => setSpotActionsTab('report')}
              >
                <Text style={[styles.spotActionsTabText, spotActionsTab === 'report' ? styles.spotActionsTabTextActive : styles.spotActionsTabTextInactive]}>
                  Report Issue
                </Text>
              </TouchableOpacity>
            </View>

            {spotActionsTab === 'override' ? (
              <View style={styles.spotActionsContent}>
                <Text style={styles.spotActionsLabel}>Set Status:</Text>
                <View style={styles.spotActionsStatusRow}>
                  {(['available', 'occupied', 'blocked'] as const).map((s) => {
                    const icons = { available: 'checkmark-circle', occupied: 'car', blocked: 'ban' } as const;
                    const colors = { available: COLORS.green, occupied: COLORS.primary, blocked: '#FF9800' };
                    const isSelected = overrideStatus === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setOverrideStatus(s)}
                        style={[
                          styles.spotActionsStatusOption,
                          { borderColor: isSelected ? colors[s] : '#e0e0e0', backgroundColor: isSelected ? colors[s] + '18' : '#fafafa' },
                        ]}
                      >
                        <Ionicons name={icons[s]} size={24} color={isSelected ? colors[s] : '#aaa'} />
                        <Text style={[styles.spotActionsStatusOptionText, { color: isSelected ? colors[s] : '#aaa' }]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.spotActionsHint}>
                  Override will automatically expire in 1 hour or when sensor detects a change.
                </Text>

                <View style={styles.spotActionsDivider} />

                <Text style={styles.spotActionsPinLabel}>Enter PIN to confirm:</Text>
                <TextInput
                  style={styles.spotActionsPinInput}
                  placeholder="* * * *"
                  placeholderTextColor="#bbb"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  value={overridePin}
                  onChangeText={setOverridePin}
                />

                <View style={styles.parkingConfirmButtonsContainer}>
                  <TouchableOpacity
                    style={styles.parkingConfirmYesButton}
                    disabled={isSubmittingOverride}
                    activeOpacity={0.8}
                    onPress={async () => {
                      if (overridePin.length < 4) {
                        setSpotActionsResult({ type: 'warning', title: 'PIN Required', message: 'Please enter a 4-digit PIN to confirm the override.' });
                        return;
                      }
                      const currentStatus = spotActionsTarget?.isOccupied ? 'occupied' : 'available';
                      if (overrideStatus === currentStatus) {
                        setSpotActionsResult({ type: 'warning', title: 'No Changes Made', message: `Spot ${spotActionsTarget?.id} is already set to ${overrideStatus}.` });
                        return;
                      }
                      setIsSubmittingOverride(true);
                      try {
                        const token = TokenManager.getToken();
                        const spaceId = spotActionsTarget?.spaceId;
                        console.log('[Override] spaceId:', spaceId, 'spot:', spotActionsTarget?.id, 'status:', overrideStatus, 'token:', token ? 'present' : 'missing');
                        if (!spaceId) {
                          setSpotActionsResult({ type: 'error', title: 'Error', message: `Spot ID not found for ${spotActionsTarget?.id}. Please wait for data to load and try again.` });
                          return;
                        }
                        const result = await RealTimeParkingService.overrideSpot(
                          spaceId,
                          overrideStatus,
                          overridePin,
                          token ?? ''
                        );
                        console.log('[Override] result:', result);
                        if (!result.success) {
                          setSpotActionsResult({ type: 'error', title: 'Override Failed', message: result.message });
                          return;
                        }
                        // Optimistic update — next poll will confirm from effective_status
                        setParkingData(prev => prev.map(s =>
                          s.id === spotActionsTarget?.id
                            ? { ...s, isOccupied: overrideStatus === 'occupied', effectiveStatus: overrideStatus, manualOverride: true }
                            : s
                        ));
                        setShowSpotActionsModal(false);
                        setSpotActionsResult({ type: 'success', title: 'Override Applied', message: result.message });
                      } catch {
                        setSpotActionsResult({ type: 'error', title: 'Error', message: 'Failed to apply override. Please try again.' });
                      } finally {
                        setIsSubmittingOverride(false);
                      }
                    }}
                  >
                    {isSubmittingOverride
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.parkingConfirmYesButtonText}>Apply Override</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.parkingConfirmNoButton}
                    onPress={() => setShowSpotActionsModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.parkingConfirmNoButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.spotActionsContent}>
                <Text style={styles.spotActionsLabel}>Describe the issue:</Text>

                {/* Quick issue chips */}
                <View style={styles.spotActionsChipsRow}>
                  {['Sensor malfunction', 'Spot blocked', 'Unauthorized vehicle', 'Damaged spot', 'Other'].map(issue => (
                    <TouchableOpacity
                      key={issue}
                      onPress={() => setReportIssue(issue)}
                      style={[
                        styles.spotActionsChip,
                        { backgroundColor: reportIssue === issue ? COLORS.primary : '#f0f0f0', borderColor: reportIssue === issue ? COLORS.primary : '#ddd' },
                      ]}
                    >
                      <Text style={[styles.spotActionsChipText, { color: reportIssue === issue ? '#fff' : '#555' }]}>
                        {issue}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.spotActionsTextArea}
                  placeholder="Tap a quick issue above or describe the problem..."
                  placeholderTextColor="#bbb"
                  multiline
                  value={reportIssue}
                  onChangeText={setReportIssue}
                />

                <View style={styles.parkingConfirmButtonsContainer}>
                  <TouchableOpacity
                    style={styles.parkingConfirmYesButton}
                    disabled={isSubmittingReport}
                    activeOpacity={0.8}
                    onPress={async () => {
                      if (!reportIssue.trim()) {
                        setSpotActionsResult({ type: 'warning', title: 'Issue Required', message: 'Please describe or select an issue before submitting.' });
                        return;
                      }
                      setIsSubmittingReport(true);
                      try {
                        await new Promise(r => setTimeout(r, 800));
                        setShowSpotActionsModal(false);
                        setSpotActionsResult({ type: 'success', title: 'Report Submitted', message: `Issue reported for spot ${spotActionsTarget?.id}.` });
                      } catch {
                        setSpotActionsResult({ type: 'error', title: 'Error', message: 'Failed to submit report. Please try again.' });
                      } finally {
                        setIsSubmittingReport(false);
                      }
                    }}
                  >
                    {isSubmittingReport
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.parkingConfirmYesButtonText}>Submit Report</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.parkingConfirmNoButton}
                    onPress={() => setShowSpotActionsModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.parkingConfirmNoButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Spot Actions Result Modal */}
      <Modal
        visible={spotActionsResult !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSpotActionsResult(null)}
      >
        <View style={styles.parkingConfirmOverlay}>
          <View style={styles.parkingConfirmContainer}>
            <Text style={styles.parkingConfirmTitle}>{spotActionsResult?.title}</Text>
            <Text style={styles.parkingConfirmMessage}>{spotActionsResult?.message}</Text>
            <View style={styles.parkingConfirmYesButtonsContainer}>
              <TouchableOpacity
                style={[styles.parkingConfirmYesButton, { flex: 1, backgroundColor:
                  spotActionsResult?.type === 'success' ? COLORS.green :
                  spotActionsResult?.type === 'warning' ? '#FF9800' : COLORS.primary,
                }]}
                onPress={() => setSpotActionsResult(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.parkingConfirmYesButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ParkingMapScreen;