import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useNavigation, useFocusEffect, RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Animated as RNAnimated } from 'react-native';
import { styles } from './styles/ParkingMapScreen.style';
import { RealTimeParkingService, ParkingStats } from '../services/RealtimeParkingService';
import { COLORS, FONTS} from '../constants/AppConst';
import { MapLayout, DESTINATION_OFFSETS } from '../components/MapLayout';
import { ParkingConfigService } from '../services/ParkingConfigService';
import { FloorConfig, Position } from '../types/parkingConfig';
import { NotificationManager } from '../services/NotifManager';
import { TokenManager } from '../config/api';
import apiClient from '../config/api';
import { API_ENDPOINTS } from '../constants/AppConst';
import { IncidentService } from '../services/IncidentService';
import { IncidentCategory, INCIDENT_CATEGORY_LABELS, FLOOR_LEVELS } from '../types/incident';


type RootStackParamList = {
  Home: undefined;
  ParkingMap: { floor: number };
};
type ParkingMapScreenNavigationProp = NavigationProp<RootStackParamList>;
type ParkingMapScreenRouteProp = RouteProp<RootStackParamList, 'ParkingMap'>;
interface ParkingSpot {
  id: string;
  spaceId?: number;
  isOccupied: boolean;
  malfunctioned?: boolean;
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
const ParkingMapScreen: React.FC = () => {
  const navigation = useNavigation<ParkingMapScreenNavigationProp>();
  const route = useRoute<ParkingMapScreenRouteProp>();
  const floorNumber = route.params?.floor ?? 4;
  const [floorConfig, setFloorConfig] = useState<FloorConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
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
  const [navigationFromPicker, setNavigationFromPicker] = useState(false);
  const [selectedSpotForNav, setSelectedSpotForNav] = useState<string | null>(null);
  const [navigatingToSpot, setNavigatingToSpot] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSpotTakenModal, setShowSpotTakenModal] = useState(false); 
  const [suggestedSpots, setSuggestedSpots] = useState<string[]>([]); 
  const [highlightedSpots, setHighlightedSpots] = useState<string[]>([]); 
  const previousParkingDataRef = useRef<ParkingSpot[]>([]); 
  const optimisticMalfunctionRef = useRef<{ [spotId: string]: boolean }>({});
  const [showSpotPickerModal, setShowSpotPickerModal] = useState(false);
  const [spotPickerTarget, setSpotPickerTarget] = useState<ParkingSpot | null>(null);
  const [showSpotActionsModal, setShowSpotActionsModal] = useState(false);
  const [spotActionsFromPicker, setSpotActionsFromPicker] = useState(false);
  const [spotActionsTarget, setSpotActionsTarget] = useState<ParkingSpot | null>(null);
  const [reportIssue, setReportIssue] = useState('');
  const [reportCustomReason, setReportCustomReason] = useState('');
  const [issueDropdownOpen, setIssueDropdownOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isClearingMalfunction, setIsClearingMalfunction] = useState(false);
  const userRole = TokenManager.getUser()?.role;
  const isSecurityRole = userRole === 'security';
  const isAdminRole = userRole === 'admin' || userRole === 'ssd';
  const canAccessSpotActions = isSecurityRole || isAdminRole;
  const [spotActionsResult, setSpotActionsResult] = useState<{ type: 'success' | 'warning' | 'error'; title: string; message: string } | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentTarget, setIncidentTarget] = useState<ParkingSpot | null>(null);
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory | ''>('');
  const [incidentCategoryOpen, setIncidentCategoryOpen] = useState(false);
  const [incidentAt, setIncidentAt] = useState('');
  const [incidentInvolvedParty, setIncidentInvolvedParty] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [incidentActionTaken, setIncidentActionTaken] = useState('');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  const isMountedRef = useRef(true);
  const unsubscribeFunctionsRef = useRef<{
    parkingUpdates?: () => void;
    connectionStatus?: () => void;
  }>({});

  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const translateXAnim = useRef(new RNAnimated.Value(0)).current;
  const translateYAnim = useRef(new RNAnimated.Value(0)).current;
  const bottomPanelYAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  const bottomPanelYRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const loadConfiguration = async () => {
      try {
        setIsLoadingConfig(true);
        setConfigError(null);
        const config = await ParkingConfigService.getFloorConfig('usjr_quadricentennial', floorNumber);

        if (!isMounted) return;

        if (!config) {
          throw new Error('Floor configuration not found');
        }

        setFloorConfig(config);
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

        if (config.initial_view) {
          translateXRef.current = config.initial_view.translateX;
          translateYRef.current = config.initial_view.translateY;
          scaleRef.current = config.initial_view.scale;
          translateXAnim.setValue(config.initial_view.translateX);
          translateYAnim.setValue(config.initial_view.translateY);
          scaleAnim.setValue(config.initial_view.scale);
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

  // clear navigation when floor changes
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

    // check if the spot just became occupied (was not occupied before, now is occupied)
    if (targetSpot && previousSpot && !previousSpot.isOccupied && targetSpot.isOccupied && NotificationManager.isRfidEntryDetected()) {
      setShowParkingConfirmModal(true);
    }

    previousParkingDataRef.current = parkingData; //update old data to current
  }, [parkingData, navigatingToSpot, showNavigation]);

  const gestureLimits = useMemo(() => {
    if (!floorConfig?.gesture_limits) {
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

    const section = spotId.charAt(1);
    const index = parseInt(spotId.slice(2));
    const waypointsMap = ParkingConfigService.getWaypointsMap(floorConfig);

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

    for (const waypointId of route.waypoints) {
      if (waypointId === 'destination') {
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

    const spotOccupancyMap: { [key: string]: boolean } = {};
    const spotHasSensorMap: { [key: string]: boolean } = {};
    const spotMalfunctionedMap: { [key: string]: boolean } = {};
    const spotSpaceIdMap: { [key: string]: number } = {};

    if (stats.sensorData && Array.isArray(stats.sensorData)) {
      stats.sensorData.forEach((sensor: any) => {
        if (sensor.slot_name) {
          spotSpaceIdMap[sensor.slot_name] = sensor.id;
          spotHasSensorMap[sensor.slot_name] = sensor.sensor_id !== null && sensor.sensor_id !== undefined;
          spotOccupancyMap[sensor.slot_name] = sensor.is_occupied === true || sensor.is_occupied === 1;
          const apiMalfunctioned = sensor.malfunctioned === true;
          spotMalfunctionedMap[sensor.slot_name] = apiMalfunctioned;
          // Once API confirms the malfunction, release the optimistic lock
          if (apiMalfunctioned && optimisticMalfunctionRef.current[sensor.slot_name] === true) {
            delete optimisticMalfunctionRef.current[sensor.slot_name];
          }
        }
      });
    }

    setParkingData(prevSpots => {
      if (!isMountedRef.current) return prevSpots;

      return prevSpots.map(spot => ({
        ...spot,
        spaceId: spotSpaceIdMap.hasOwnProperty(spot.id) ? spotSpaceIdMap[spot.id] : spot.spaceId,
        hasSensor: spotHasSensorMap.hasOwnProperty(spot.id) ? spotHasSensorMap[spot.id] : spot.hasSensor,
        isOccupied: spotOccupancyMap.hasOwnProperty(spot.id) ? spotOccupancyMap[spot.id] : spot.isOccupied,
        malfunctioned: optimisticMalfunctionRef.current.hasOwnProperty(spot.id)
          ? optimisticMalfunctionRef.current[spot.id]
          : (spotMalfunctionedMap.hasOwnProperty(spot.id) ? spotMalfunctionedMap[spot.id] : spot.malfunctioned),
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
    translateXRef.current = 90;
    translateYRef.current = 70;
    translateXAnim.setValue(90);
    translateYAnim.setValue(70);
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
      if (NotificationManager.isRfidEntryDetected()) {
        NotificationManager.resumeSpotNotifications();
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
  
  const { maxTranslateX, minTranslateX, maxTranslateY, minTranslateY,
          minScale, maxScale, clampMinScale, clampMaxScale } = gestureLimits;

  const panGesture = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      // snapshot current values at gesture start
    })
    .onUpdate((event) => {
      const newX = Math.max(minTranslateX, Math.min(maxTranslateX, translateXRef.current + event.translationX));
      const newY = Math.max(minTranslateY, Math.min(maxTranslateY, translateYRef.current + event.translationY));
      translateXAnim.setValue(newX);
      translateYAnim.setValue(newY);
    })
    .onEnd((event) => {
      translateXRef.current = Math.max(minTranslateX, Math.min(maxTranslateX, translateXRef.current + event.translationX));
      translateYRef.current = Math.max(minTranslateY, Math.min(maxTranslateY, translateYRef.current + event.translationY));
    })
    .minPointers(1)
    .maxPointers(1),
  [minTranslateX, maxTranslateX, minTranslateY, maxTranslateY]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .runOnJS(true)
    .onUpdate((event) => {
      const newScale = Math.max(minScale, Math.min(maxScale, scaleRef.current * event.scale));
      scaleAnim.setValue(newScale);
    })
    .onEnd((event) => {
      const raw = scaleRef.current * event.scale;
      scaleRef.current = Math.max(clampMinScale, Math.min(clampMaxScale, raw));
      scaleAnim.setValue(scaleRef.current);
    }),
  [minScale, maxScale, clampMinScale, clampMaxScale]);

  const mapGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture]
  );

  const bottomPanelGesture = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .onUpdate((event) => {
      const newY = Math.max(-50, Math.min(200, bottomPanelYRef.current + event.translationY));
      bottomPanelYAnim.setValue(newY);
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentY = bottomPanelYRef.current + event.translationY;
      let targetY: number;
      if (velocity > 500 || currentY > 100) {
        targetY = 200;
      } else if (velocity < -500 || currentY < 50) {
        targetY = 0;
      } else {
        targetY = currentY > 100 ? 200 : 0;
      }
      bottomPanelYRef.current = targetY;
      RNAnimated.spring(bottomPanelYAnim, {
        toValue: targetY,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();
    }),
  []);

  const animatedStyle = {
    transform: [
      { translateX: translateXAnim },
      { translateY: translateYAnim },
      { scale: scaleAnim },
    ],
  };

  const bottomPanelAnimatedStyle = {
    transform: [{ translateY: bottomPanelYAnim }],
  };

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

  const handleParkingConfirm = useCallback(async () => { //I've parked button
    await NotificationManager.pauseSpotNotifications();
    try {
      const tagsRes = await apiClient.get(API_ENDPOINTS.publicRfidTags); //fetch rfid
      const tags: any[] = tagsRes.data?.tags ?? [];
      const currentUser = TokenManager.getUser();
      const userTag = tags.find(t =>
        t.user_name?.toLowerCase() === currentUser?.name?.toLowerCase() && t.status === 'active'
      ); //find tag of currently logged in user
      if (userTag?.uid) {
        await apiClient.post(API_ENDPOINTS.publicRfidParked, { uid: userTag.uid });
      }
    } catch {
    }
    setShowParkingConfirmModal(false);
    setNavigatingToSpot(null);
    clearNavigation();
    setShowSuccessModal(true);
  }, [clearNavigation]);

  //parking recommendation 
  const handleParkingCancel = useCallback(() => {
    setShowParkingConfirmModal(false);
    // find nearby available spots
    if (navigatingToSpot) {
      const takenSpotSection = navigatingToSpot.charAt(1);
      // find available spots in same section 
      const availableSpots = parkingData
        .filter(spot => spot.hasSensor && !spot.isOccupied && !spot.malfunctioned && spot.id !== navigatingToSpot)
        .sort((a, b) => {
          const aSection = a.id.charAt(1);
          const bSection = b.id.charAt(1);
          // Prioritize same section
          if (aSection === takenSpotSection && bSection !== takenSpotSection) return -1;
          if (bSection === takenSpotSection && aSection !== takenSpotSection) return 1;
          return a.id.localeCompare(b.id);
        });

      clearNavigation();

      const suggestions = availableSpots.slice(0, 3).map(s => s.id);
      setSuggestedSpots(suggestions);
      setShowSpotTakenModal(true);
      setHighlightedSpots(suggestions);
    }
  }, [navigatingToSpot, parkingData, clearNavigation]);

  const handleSectionPress = useCallback((sectionId: string) => {
    setHighlightedSection(prev => prev === sectionId ? null : sectionId);
  }, []);

  const handleSpotPress = useCallback((spot: ParkingSpot) => {
    if (!spot.hasSensor) return;

    if (canAccessSpotActions) {
      if (!spot.malfunctioned) {
        setSpotPickerTarget(spot);
        setShowSpotPickerModal(true);
      } else {
        setSpotActionsTarget(spot);
        setSpotActionsFromPicker(false);
        setReportIssue('');
        setReportCustomReason('');
        setIssueDropdownOpen(false);
        setShowSpotActionsModal(true);
      }
      return;
    }

    if (spot.malfunctioned) {
      Alert.alert('Spot Unavailable', 'This spot has been flagged as malfunctioned.');
      return;
    }

    if (spot.isOccupied) {
      Alert.alert('Spot Occupied', 'This parking spot is currently occupied.');
      return;
    }

    setSelectedSpot(spot.id);
    setSelectedSpotForNav(spot.id);
    setHighlightedSpots([]);
    setNavigationFromPicker(false);
    setShowNavigationModal(true);
  }, [canAccessSpotActions]);

  const navigateHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);


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
      if (spot.malfunctioned) {
        backgroundColor = '#FFDE42';
      } else {
        backgroundColor = spot.isOccupied ? COLORS.primary : COLORS.green;
      }
    }

    // Security and admin can interact with any sensor-assigned spot; others only available ones
    const isClickable = spot.hasSensor && (canAccessSpotActions || (!spot.isOccupied && !spot.malfunctioned));

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
        {spot.hasSensor && !spot.malfunctioned && spot.isOccupied ? (
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
      </TouchableOpacity>
    );
  }, [selectedSpot, highlightedSection, highlightedSpots, handleSpotPress, isSecurityRole]);

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

      <View style={{ position: 'absolute', top: 130, left: 12, right: 12, zIndex: 2000, flexDirection: 'row', justifyContent: 'center', gap: 10, backgroundColor: 'rgb(71, 69, 69)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, elevation: 10 }}>
        {[
          { color: COLORS.green, label: 'Available' },
          { color: COLORS.primary, label: 'Occupied' },
          { color: '#FFDE42', label: 'Malfunction' },
          { color: '#CCCCCC', label: 'No Sensor' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
            <Text style={{ fontSize: 11, color: 'white', fontFamily: FONTS.regular }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapFrame}>
          <GestureDetector gesture={mapGesture}>
            <RNAnimated.View style={styles.mapWrapper}>
              <RNAnimated.View style={[styles.parkingLayout, animatedStyle]}>
                <MapLayout styles={styles} />
                {parkingData.map(renderParkingSpot)}
                {renderNavigationPath()}
              </RNAnimated.View>
            </RNAnimated.View>
          </GestureDetector>
        </View>
      </View>

      <GestureDetector gesture={bottomPanelGesture}>
        <RNAnimated.View style={[bottomPanelAnimatedStyle]}>
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
        </RNAnimated.View>
      </GestureDetector>

      {showNavigation && (
        <View style={{ position: 'absolute', top: 180, right: 20, gap: 10, zIndex: 2000 }}>
          {!canAccessSpotActions && (
            <TouchableOpacity
              style={[styles.clearRouteButton, { position: 'relative', top: 0, right: 0, backgroundColor: NotificationManager.isRfidEntryDetected() ? COLORS.green : '#A0A0A0' }]}
              onPress={() => {
                if (!NotificationManager.isRfidEntryDetected()) {
                  Alert.alert('Not Inside Parking', 'Your RFID must be detected at the entrance before you can mark as parked.');
                  return;
                }
                setShowParkingConfirmModal(true);
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.clearRouteText}>I've Parked</Text>
            </TouchableOpacity>
          )}
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
              {navigationFromPicker && (
                <TouchableOpacity
                  onPress={() => {
                    setShowNavigationModal(false);
                    setShowSpotPickerModal(true);
                  }}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}
                >
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </TouchableOpacity>
              )}
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

      {/* Spot Picker Modal — Show Route, Log Incident or Report Malfunction */}
      <Modal
        visible={showSpotPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpotPickerModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSpotPickerModal(false)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 340, overflow: 'hidden' }}>
                {/* Header */}
                <View style={{ backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 }}>Spot {spotPickerTarget?.id}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: FONTS.regular, fontSize: 12 }}>
                      {spotPickerTarget?.isOccupied ? 'Occupied' : 'Available'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowSpotPickerModal(false)}
                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Status badge */}
                <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                  <Text style={{ fontSize: 12, color: '#888', fontFamily: FONTS.regular }}>
                    Floor: <Text style={{ fontFamily: FONTS.semiBold, color: '#333' }}>
                      {floorNumber === 1 ? '1st' : floorNumber === 2 ? '2nd' : floorNumber === 3 ? '3rd' : `${floorNumber}th`} Floor
                    </Text>
                    {'  |  '}Status: <Text style={{ fontFamily: FONTS.semiBold, color: spotPickerTarget?.isOccupied ? COLORS.primary : COLORS.green }}>
                      {spotPickerTarget?.isOccupied ? 'Occupied' : 'Available'}
                    </Text>
                  </Text>
                </View>

                {/* Options */}
                <View style={{ padding: 16, gap: 10 }}>
                  {/* Show Route — only for available spots */}
                  {!spotPickerTarget?.isOccupied && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.green, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14 }}
                      onPress={() => {
                        setShowSpotPickerModal(false);
                        const spot = spotPickerTarget;
                        if (!spot) return;
                        setSelectedSpot(spot.id);
                        setSelectedSpotForNav(spot.id);
                        setHighlightedSpots([]);
                        setNavigationFromPicker(true);
                        setShowNavigationModal(true);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 }}>Show Route to Spot</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.regular, fontSize: 12 }}>Display navigation on map</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                  )}

                  {/* Log Incident */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FF9801', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14 }}
                    onPress={() => {
                      if (!spotPickerTarget) return;
                      setIncidentTarget(spotPickerTarget);
                      setIncidentCategory('');
                      setIncidentCategoryOpen(false);
                      setIncidentAt('');
                      setIncidentInvolvedParty('');
                      setIncidentNotes('');
                      setIncidentActionTaken('');
                      setShowSpotPickerModal(false);
                      setShowIncidentModal(true);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 }}>Log Incident</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.regular, fontSize: 12 }}>Report an incident at this spot</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>

                  {/* Report Malfunction */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14 }}
                    onPress={() => {
                      if (!spotPickerTarget) return;
                      setSpotActionsTarget(spotPickerTarget);
                      setSpotActionsFromPicker(true);
                      setReportIssue('');
                      setReportCustomReason('');
                      setIssueDropdownOpen(false);
                      setShowSpotPickerModal(false);
                      setShowSpotActionsModal(true);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 }}>Report Malfunction</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.regular, fontSize: 12 }}>Flag this spot as malfunctioned</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>

                  {/* Cancel */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6c757d', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14 }}
                    onPress={() => setShowSpotPickerModal(false)}
                  >
                    <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Spot Actions Modal — Flag as Malfunctioned */}
      <Modal
        visible={showSpotActionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpotActionsModal(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setShowSpotActionsModal(false)}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, pointerEvents: 'box-none' }}
          >
              <View style={styles.spotActionsModalContainer}>

            {/* Red header */}
            <View style={styles.spotActionsModalHeader}>
              {spotActionsFromPicker && (
                <TouchableOpacity
                  onPress={() => {
                    setShowSpotActionsModal(false);
                    setShowSpotPickerModal(true);
                  }}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 6 }}
                >
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              <View style={styles.spotActionsHeaderText}>
                <Text style={styles.spotActionsModalTitle} numberOfLines={1}>Flag as Malfunctioned</Text>
                <Text style={styles.spotActionsModalSubtitle}>Spot {spotActionsTarget?.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSpotActionsModal(false)}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Status badge */}
            <View style={styles.spotActionsSpotInfo}>
              <View style={[styles.spotActionsStatusBadge, {
                backgroundColor: spotActionsTarget?.malfunctioned
                  ? '#FFDE42'
                  : spotActionsTarget?.isOccupied ? COLORS.primary : COLORS.green,
              }]}>
                <Text style={styles.spotActionsStatusText}>
                  {spotActionsTarget?.malfunctioned ? 'Malfunctioned'
                    : spotActionsTarget?.isOccupied ? 'Occupied' : 'Available'}
                </Text>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.spotActionsContent}
            >
              {spotActionsTarget?.malfunctioned ? (
                /* ── Already malfunctioned: show info + clear button ── */
                <>
                  <View style={{ backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffc107', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, color: '#856404', fontFamily: FONTS.semiBold }}>
                      Already flagged as malfunctioned.
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 4, fontFamily: FONTS.regular }}>
                      Tap "Clear Malfunction" to restore normal status.
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={isClearingMalfunction}
                    activeOpacity={0.8}
                    style={{ backgroundColor: COLORS.green, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 10 }}
                    onPress={async () => {
                      const spaceId = spotActionsTarget?.spaceId;
                      if (!spaceId) return;
                      setIsClearingMalfunction(true);
                      try {
                        const result = await RealTimeParkingService.clearMalfunction(spaceId, TokenManager.getToken() ?? '');
                        if (result.success) {
                          delete optimisticMalfunctionRef.current[spotActionsTarget?.id ?? ''];
                          setParkingData(prev => prev.map(s =>
                            s.id === spotActionsTarget?.id ? { ...s, malfunctioned: false } : s
                          ));
                          setShowSpotActionsModal(false);
                          setSpotActionsResult({ type: 'success', title: 'Cleared', message: `Malfunction cleared for spot ${spotActionsTarget?.id}.` });
                        } else {
                          setSpotActionsResult({ type: 'error', title: 'Error', message: result.message });
                        }
                      } catch {
                        setSpotActionsResult({ type: 'error', title: 'Error', message: 'Failed to clear malfunction.' });
                      } finally {
                        setIsClearingMalfunction(false);
                      }
                    }}
                  >
                    {isClearingMalfunction
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 }}>Clear Malfunction</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.parkingConfirmNoButton} onPress={() => setShowSpotActionsModal(false)} activeOpacity={0.8}>
                    <Text style={styles.parkingConfirmNoButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ── Report form ── */
                <>
                  <Text style={styles.spotActionsLabel}>
                    Issue type <Text style={{ color: COLORS.primary }}>*</Text>
                  </Text>

                  {/* Dropdown selector */}
                  {(() => {
                    const ISSUE_OPTIONS = [
                      'Sensor not detecting vehicles',
                      'Sensor hardware malfunction',
                      'Sensor offline / no data',
                      'Spot under maintenance or repair',
                      'Other',
                    ];
                    return (
                      <View style={{ marginBottom: 12 }}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setIssueDropdownOpen(o => !o)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            borderWidth: 1.5, borderColor: reportIssue ? COLORS.primary : '#ddd',
                            borderRadius: issueDropdownOpen ? 8 : 8,
                            borderBottomLeftRadius: issueDropdownOpen ? 0 : 8,
                            borderBottomRightRadius: issueDropdownOpen ? 0 : 8,
                            paddingHorizontal: 14, paddingVertical: 12,
                            backgroundColor: '#fafafa',
                          }}
                        >
                          <Text style={{ fontSize: 14, color: reportIssue ? '#1a1a1a' : '#aaa', fontFamily: FONTS.regular, flex: 1 }} numberOfLines={1}>
                            {reportIssue || 'Select an issue type...'}
                          </Text>
                          <Ionicons name={issueDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
                        </TouchableOpacity>

                        {issueDropdownOpen && (
                          <View style={{
                            borderWidth: 1.5, borderColor: COLORS.primary, borderTopWidth: 0,
                            borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                            backgroundColor: '#fff', overflow: 'hidden',
                          }}>
                            {ISSUE_OPTIONS.map((opt, idx) => (
                              <TouchableOpacity
                                key={opt}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setReportIssue(opt);
                                  if (opt !== 'Other') setReportCustomReason('');
                                  setIssueDropdownOpen(false);
                                }}
                                style={{
                                  paddingHorizontal: 14, paddingVertical: 12,
                                  backgroundColor: reportIssue === opt ? '#fdecea' : '#fff',
                                  borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#f0f0f0',
                                  flexDirection: 'row', alignItems: 'center',
                                }}
                              >
                                <Text style={{ flex: 1, fontSize: 14, color: reportIssue === opt ? COLORS.primary : '#333', fontFamily: FONTS.regular }}>
                                  {opt}
                                </Text>
                                {reportIssue === opt && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {reportIssue === 'Other' && (
                    <TextInput
                      style={[styles.spotActionsTextArea, { marginBottom: 12, minHeight: 56 }]}
                      placeholder="Please describe the issue..."
                      placeholderTextColor="#bbb"
                      multiline
                      value={reportCustomReason}
                      onChangeText={setReportCustomReason}
                    />
                  )}

                  {/* Flag Spot (primary) then Cancel */}
                  <TouchableOpacity
                    style={[styles.parkingConfirmYesButton, { backgroundColor: COLORS.primary, marginBottom: 10 }]}
                    disabled={isSubmittingReport}
                    activeOpacity={0.8}
                    onPress={async () => {
                      const finalReason = reportIssue === 'Other' ? reportCustomReason.trim() : reportIssue;
                      if (!finalReason) {
                        setSpotActionsResult({ type: 'warning', title: 'Issue Required', message: 'Please select or describe the sensor issue.' });
                        return;
                      }
                      setIsSubmittingReport(true);
                      try {
                        const targetId = spotActionsTarget?.id;
                        // Resolve spaceId from live parkingData in case spotActionsTarget is stale
                        const spaceId = spotActionsTarget?.spaceId
                          ?? parkingData.find(s => s.id === targetId)?.spaceId;
                        if (!spaceId) {
                          setSpotActionsResult({ type: 'error', title: 'Error', message: `Spot ID not found for ${targetId}. Try again.` });
                          return;
                        }
                        // turn yellow immediately before API call
                        optimisticMalfunctionRef.current[targetId!] = true;
                        setParkingData(prev => prev.map(s =>
                          s.id === targetId ? { ...s, malfunctioned: true } : s
                        ));
                        const result = await RealTimeParkingService.reportMalfunction(spaceId, finalReason, TokenManager.getToken() ?? '', targetId ?? undefined);
                        if (!result.success) {
                          // Revert optimistic update on failure
                          delete optimisticMalfunctionRef.current[targetId!];
                          setParkingData(prev => prev.map(s =>
                            s.id === targetId ? { ...s, malfunctioned: false } : s
                          ));
                          setSpotActionsResult({ type: 'error', title: 'Report Failed', message: result.message });
                          return;
                        }
                        setShowSpotActionsModal(false);
                        setSpotActionsResult({ type: 'success', title: 'Reported', message: `Spot ${spotActionsTarget?.id} flagged as malfunctioned.` });
                      } catch {
                        setSpotActionsResult({ type: 'error', title: 'Error', message: 'Failed to submit report. Please try again.' });
                      } finally {
                        setIsSubmittingReport(false);
                      }
                    }}
                  >
                    {isSubmittingReport
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.parkingConfirmYesButtonText}>Flag Spot</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.parkingConfirmNoButton}
                    onPress={() => setShowSpotActionsModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.parkingConfirmNoButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
              </View>
          </KeyboardAvoidingView>
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
                  spotActionsResult?.type === 'warning' ? '#FFDE42' : COLORS.primary,
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

      {/* Log Incident Modal */}
      <Modal
        visible={showIncidentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIncidentModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxWidth: 380 }}
          >
            <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
              {/* Orange header */}
              <View style={{ backgroundColor: '#FF9801', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowIncidentModal(false);
                    setShowSpotPickerModal(true);
                  }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 }}>Log Incident — {incidentTarget?.id}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowIncidentModal(false)}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 16, gap: 12 }}
              >
                {/* Floor / Status row */}
                <Text style={{ fontSize: 12, color: '#888', fontFamily: FONTS.regular, marginBottom: 4 }}>
                  Floor: <Text style={{ fontFamily: FONTS.semiBold, color: '#333' }}>
                    {floorNumber === 1 ? '1st' : floorNumber === 2 ? '2nd' : floorNumber === 3 ? '3rd' : `${floorNumber}th`} Floor
                  </Text>
                  {'  |  '}Status: <Text style={{ fontFamily: FONTS.semiBold, color: incidentTarget?.isOccupied ? COLORS.primary : COLORS.green }}>
                    {incidentTarget?.isOccupied ? 'Occupied' : 'Available'}
                  </Text>
                </Text>

                {/* Category */}
                <View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#1a1a1a', marginBottom: 6 }}>
                    Category <Text style={{ color: '#FF9801' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIncidentCategoryOpen(o => !o)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      borderWidth: 1.5, borderColor: incidentCategory ? '#FF9801' : '#ddd',
                      borderRadius: incidentCategoryOpen ? 8 : 8,
                      borderBottomLeftRadius: incidentCategoryOpen ? 0 : 8,
                      borderBottomRightRadius: incidentCategoryOpen ? 0 : 8,
                      paddingHorizontal: 14, paddingVertical: 12,
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <Text style={{ fontSize: 14, color: incidentCategory ? '#1a1a1a' : '#aaa', fontFamily: FONTS.regular, flex: 1 }} numberOfLines={1}>
                      {incidentCategory ? INCIDENT_CATEGORY_LABELS[incidentCategory as IncidentCategory] : '— Select category —'}
                    </Text>
                    <Ionicons name={incidentCategoryOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
                  </TouchableOpacity>
                  {incidentCategoryOpen && (
                    <View style={{
                      borderWidth: 1.5, borderColor: '#FF9801', borderTopWidth: 0,
                      borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                      backgroundColor: '#fff', overflow: 'hidden',
                    }}>
                      {(Object.keys(INCIDENT_CATEGORY_LABELS) as IncidentCategory[]).map((cat, idx) => (
                        <TouchableOpacity
                          key={cat}
                          activeOpacity={0.7}
                          onPress={() => { setIncidentCategory(cat); setIncidentCategoryOpen(false); }}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 12,
                            backgroundColor: incidentCategory === cat ? '#fff3e0' : '#fff',
                            borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#f0f0f0',
                            flexDirection: 'row', alignItems: 'center',
                          }}
                        >
                          <Text style={{ flex: 1, fontSize: 14, color: incidentCategory === cat ? '#FF9801' : '#333', fontFamily: FONTS.regular }}>
                            {INCIDENT_CATEGORY_LABELS[cat]}
                          </Text>
                          {incidentCategory === cat && <Ionicons name="checkmark" size={16} color="#FF9801" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* When did it happen */}
                <View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#1a1a1a', marginBottom: 6 }}>When did it happen?</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONTS.regular, backgroundColor: '#fafafa', color: '#1a1a1a' }}
                    placeholder="e.g. 2026-04-10 14:30"
                    placeholderTextColor="#aaa"
                    value={incidentAt}
                    onChangeText={setIncidentAt}
                  />
                </View>

                {/* Involved party */}
                <View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#1a1a1a', marginBottom: 6 }}>
                    Involved party <Text style={{ fontFamily: FONTS.regular, color: '#888', fontSize: 12 }}>(plate no., person, etc.)</Text>
                  </Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONTS.regular, backgroundColor: '#fafafa', color: '#1a1a1a' }}
                    placeholder="e.g. ABC 1234, unknown pedestrian"
                    placeholderTextColor="#aaa"
                    value={incidentInvolvedParty}
                    onChangeText={setIncidentInvolvedParty}
                  />
                </View>

                {/* Description / Notes */}
                <View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#1a1a1a', marginBottom: 6 }}>Description / Notes</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONTS.regular, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 80, textAlignVertical: 'top' }}
                    placeholder="What happened?"
                    placeholderTextColor="#aaa"
                    multiline
                    value={incidentNotes}
                    onChangeText={setIncidentNotes}
                  />
                </View>

                {/* Action taken */}
                <View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#1a1a1a', marginBottom: 6 }}>Action taken</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONTS.regular, backgroundColor: '#fafafa', color: '#1a1a1a' }}
                    placeholder="e.g. Cordoned area, notified admin"
                    placeholderTextColor="#aaa"
                    value={incidentActionTaken}
                    onChangeText={setIncidentActionTaken}
                  />
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ flex: 1, backgroundColor: '#6c757d', borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                    onPress={() => setShowIncidentModal(false)}
                  >
                    <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isSubmittingIncident}
                    style={{ flex: 1.4, backgroundColor: '#FF9801', borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                    onPress={async () => {
                      if (!incidentCategory) {
                        setSpotActionsResult({ type: 'warning', title: 'Category Required', message: 'Please select an incident category.' });
                        return;
                      }
                      setIsSubmittingIncident(true);
                      try {
                        const floorLabel = `${floorNumber === 1 ? '1st' : floorNumber === 2 ? '2nd' : floorNumber === 3 ? '3rd' : `${floorNumber}th`} Floor`;
                        const result = await IncidentService.create({
                          floor_level: floorLabel,
                          category: incidentCategory,
                          space_code: incidentTarget?.id,
                          incident_at: incidentAt || undefined,
                          involved_party: incidentInvolvedParty || undefined,
                          notes: incidentNotes || undefined,
                          action_taken: incidentActionTaken || undefined,
                        });
                        setShowIncidentModal(false);
                        if (result.success) {
                          setSpotActionsResult({ type: 'success', title: 'Incident Logged', message: `Incident at spot ${incidentTarget?.id} has been recorded.` });
                        } else {
                          setSpotActionsResult({ type: 'error', title: 'Failed', message: result.message ?? 'Could not log incident. Try again.' });
                        }
                      } catch {
                        setShowIncidentModal(false);
                        setSpotActionsResult({ type: 'error', title: 'Error', message: 'Failed to submit incident report.' });
                      } finally {
                        setIsSubmittingIncident(false);
                      }
                    }}
                  >
                    {isSubmittingIncident
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 }}>Submit Log</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

export default ParkingMapScreen;