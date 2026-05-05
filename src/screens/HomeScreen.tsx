import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {View, Text, TouchableOpacity, ScrollView, RefreshControl, StatusBar, Image, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RealTimeParkingService, ParkingStats } from '../services/RealtimeParkingService';
import { RfidSecurityService } from '../services/RfidSecurityService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles/HomeScreen.style';
import { NotificationManager } from '../services/NotifManager';
import NotificationOverlay from '../components/NotifOverlay';
import { useFeedback } from '../hooks/useFeedback';
import {COLORS} from '../constants/AppConst';
import { TokenManager } from '../config/api';
import { ParkingConfigService } from '../services/ParkingConfigService';
import { ParkingLocationConfig } from '../types/parkingConfig';


type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: { floor: number };
  Feedback: undefined;
  Settings: undefined;
  Profile: { userId?: number } | undefined;
  ApiTest: undefined;
  Login: undefined;
};
type HomeScreenNavigationProp = NavigationProp<RootStackParamList>;
interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}
const FEEDBACK_CHECK_INTERVAL = 5 * 60 * 1000; //5mins

type FloorDefault = {
  floor: number;
  total: number;
  available: number;
  malfunctioned: number;
  occupancyRate: number;
  status: 'available' | 'full' | 'limited' | 'no_data';
};

const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth,
  progress,
  color,
  backgroundColor = '#E5E5E5',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }]}>
        {children}
      </View>
    </View>
  );
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAuthenticated } = useAuth();
  const { checkForNewReplies } = useFeedback();
  const [parkingData, setParkingData] = useState<ParkingStats>({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    floors: [],
    lastUpdated: '',
    isLive: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [lastParkingData, setLastParkingData] = useState<ParkingStats | null>(null);
  const [defaultFloors, setDefaultFloors] = useState<FloorDefault[]>([1,2,3,4].map(floor => ({ floor, total: 0, available: 0, malfunctioned: 0, occupancyRate: 0, status: 'no_data' as const })));
  const isMountedRef = useRef(true);

  const unsubscribeFunctionsRef = useRef<{
    parkingUpdates?: () => void;
    connectionStatus?: () => void;
    notifications?: () => void;
    rfidScans?: () => void;
  }>({});

  const getFloorName = (floorNum: number) => {
    const checkLastTwo = floorNum % 100;
    const lastDigit = floorNum % 10;
    let suffix = 'th';

    if(checkLastTwo >= 11 && checkLastTwo <= 13){ //special numbers
      return `${floorNum}th Floor`;
    }

    if(lastDigit === 1){ suffix = 'st'; }
    else if(lastDigit === 2){ suffix = 'nd'; }
    else if(lastDigit === 3){ suffix = 'rd'; };

    return `${floorNum}${suffix} Floor`;
  }

  const getFloorStatus = useCallback((available: number, total: number) => {
    if (total === 0) {
      return { text: 'NO DATA', color: '#999'};
    }
    const percent = (available / total) * 100;
    switch (true) {
      case percent === 0:
        return { text: 'FULL', color: COLORS.primary };
      case percent < 25:
        return { text: 'LIMITED', color: COLORS.limited };
      default:
        return { text: 'AVAILABLE', color: COLORS.green };
    }
  }, []);


  useEffect(() => {
    ParkingConfigService.getDefaultFloors().then(floors => {
      if (isMountedRef.current) setDefaultFloors(floors);
    }).catch(() => {});
    return ParkingConfigService.subscribe((config: ParkingLocationConfig) => {
      if (isMountedRef.current) {
        setDefaultFloors(config.floors.map((f: { floor_number: number }) => ({
          floor: f.floor_number,
          total: 0,
          available: 0,
          malfunctioned: 0,
          occupancyRate: 0,
          status: 'no_data' as const,
        })));
      }
    });
  }, []); 

  //display floor cards
  const displayFloors = useMemo(() => {
    const fixedFloors = [...defaultFloors];

    fixedFloors.forEach(fixedFloor => {
      const realFloor = parkingData.floors.find(rf => rf.floor === fixedFloor.floor);
      if (realFloor) {
        Object.assign(fixedFloor, realFloor);
      }
    });
    //sort descending order
    return fixedFloors.sort((a, b) => b.available - a.available);
  }, [parkingData.floors, defaultFloors]);

  //check for parking spot changes to trigger notifs
  const checkParkingChanges = useCallback((newData: ParkingStats) => {
    if (!lastParkingData || !isMountedRef.current || !currentUserId) {
      setLastParkingData(newData);
      return;
    }

    try {
      if (newData.availableSpots > lastParkingData.availableSpots) {
        const increase = newData.availableSpots - lastParkingData.availableSpots;
        const bestFloor = newData.floors.reduce((prev, current) =>
          prev.available > current.available ? prev : current
        );

        const userRole = TokenManager.getUser()?.role;
        if (userRole === 'user' && !NotificationManager.isSpotNotificationsPaused()) {
          NotificationManager.addSpotAvailableNotification(increase, bestFloor.floor);
        }
      }
      setLastParkingData(newData);
    } catch (error) {
      console.error('Error checking parking changes:', error);
    }
  }, [lastParkingData, currentUserId]);

  const initializeUser = useCallback(async () => {
    if (!isMountedRef.current || !isAuthenticated) return;

    try {
      const userData = await AsyncStorage.getItem('valet_user_data');
      if (userData && isMountedRef.current) {
        const user = JSON.parse(userData);
        const userId = user.id;
        setCurrentUserId(userId);

        await NotificationManager.setCurrentUserId(userId);
        await checkForNewReplies();
        await NotificationManager.checkForFeedbackReplies(userId);

        const unsubscribeNotifications = NotificationManager.subscribe((notifications) => {
          if (!isMountedRef.current) return;
          setUnreadNotificationCount(NotificationManager.getUnreadCount());
        });

        unsubscribeFunctionsRef.current.notifications = unsubscribeNotifications;
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  }, [checkForNewReplies, isAuthenticated]);

  //parking data subscription
  const subscribeToParkingData = useCallback(() => {
    if (!isAuthenticated || unsubscribeFunctionsRef.current.parkingUpdates) return;

    const unsubscribeParkingUpdates = RealTimeParkingService.onParkingUpdate((data: ParkingStats) => {
      if (!isMountedRef.current) return;
      console.log('Received parking update:', data.lastUpdated);
      checkParkingChanges(data);
      setParkingData(data);
      setLoading(false);
    });

    const unsubscribeConnectionStatus = RealTimeParkingService.onConnectionStatus((status) => {
      if (!isMountedRef.current) return;
      console.log('Connection status:', status);
      setConnectionStatus(status);
    });

    unsubscribeFunctionsRef.current.parkingUpdates = unsubscribeParkingUpdates;
    unsubscribeFunctionsRef.current.connectionStatus = unsubscribeConnectionStatus;

    if (!unsubscribeFunctionsRef.current.rfidScans) {
      const unsubscribeRfid = RfidSecurityService.onScanUpdate(() => {
      });
      unsubscribeFunctionsRef.current.rfidScans = unsubscribeRfid;
    }

    setTimeout(() => {
      if (isMountedRef.current && loading) {
        console.log('Removing loading state after timeout');
        setLoading(false);
      }
    }, 5000);
  }, [isAuthenticated, checkParkingChanges, loading]);

  const onRefresh = useCallback(async () => {
    if (!isAuthenticated || !isMountedRef.current) return;

    setRefreshing(true);
    try {
      await RealTimeParkingService.forceUpdate();

      if (currentUserId) {
        await checkForNewReplies();
        await NotificationManager.checkForFeedbackReplies(currentUserId);
      }
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [isAuthenticated, currentUserId, checkForNewReplies]);

  const handleFloorPress = useCallback((floor: any) => {
  // Navigate to the parking map with floor parameter
  navigation.navigate('ParkingMap', { floor: floor.floor });
}, [navigation]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    initializeUser();
    subscribeToParkingData();

    return () => {
      Object.values(unsubscribeFunctionsRef.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribeFunctionsRef.current = {};
    };
  }, [isAuthenticated, navigation, initializeUser, subscribeToParkingData]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated) return;

      if (!unsubscribeFunctionsRef.current.parkingUpdates) {
        subscribeToParkingData();
      }

      setUnreadNotificationCount(NotificationManager.getUnreadCount());
    }, [isAuthenticated, subscribeToParkingData])
  );

  useEffect(() => {
    if (!currentUserId || !isAuthenticated) return;

    const checkFeedbackInterval = setInterval(async () => {
      try {
        await checkForNewReplies();
      } catch (error) {
        console.error('Error in periodic feedback check:', error);
      }
    }, FEEDBACK_CHECK_INTERVAL);

    return () => {
      clearInterval(checkFeedbackInterval);
    };
  }, [currentUserId, isAuthenticated, checkForNewReplies]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={styles.loadingContent}>
          <Ionicons name="car" size={48} color={COLORS.primary}/>
          <Text style={styles.loadingText}>Loading VALET...</Text>
          <Text style={styles.loadingSubtext}>
            Welcome {user?.name || user?.email}! Fetching real-time parking data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor= {COLORS.primary} />

      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/logo.png')} style={styles.logo}/>
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.valetText}>VALET</Text>
              <Text style={styles.subtitle}>
                Welcome, {user?.name || user?.email?.split('@')[0] || 'User'}!
              </Text>
            </View>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowNotifications(true)}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="white" />
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.campusCard}>
          <Text style={styles.campusTitle}>USJ-R Quadricentennial Campus</Text>

          <View style={styles.circularProgressRow}>
            <View style={styles.progressItem}>
              <CircularProgress
                size={80}
                strokeWidth={6}
                progress={(parkingData.totalSpots > 0) ? (parkingData.availableSpots / parkingData.totalSpots) * 100 : 0}
                color={COLORS.green}
              >
                <Text style={[styles.progressNumber, { color: COLORS.green }]}>
                  {parkingData.availableSpots}
                </Text>
              </CircularProgress>
              <Text style={styles.progressLabel}>Available</Text>
            </View>

            <View style={styles.progressItem}>
              <CircularProgress
                size={80}
                strokeWidth={6}
                progress={(parkingData.totalSpots > 0) ? (parkingData.occupiedSpots / parkingData.totalSpots) * 100 : 0}
                color = {COLORS.primary}
              >
                <Text style={[styles.progressNumber, { color: COLORS.primary }]}>
                  {parkingData.occupiedSpots}
                </Text>
              </CircularProgress>
              <Text style={styles.progressLabel}>Occupied</Text>
            </View>

            <View style={styles.progressItem}>
              <CircularProgress
                size={80}
                strokeWidth={6}
                progress={100}
                color={COLORS.blue}
              >
                <Text style={[styles.progressNumber, { color: COLORS.blue }]}>
                  {parkingData.totalSpots}
                </Text>
              </CircularProgress>
              <Text style={styles.progressLabel}>Total Spots</Text>
            </View>
          </View>

          <View style={styles.occupancyRow}>
            <Text style={styles.occupancyText}>Overall Occupancy</Text>
            <Text style={[styles.occupancyText, { color: connectionStatus === 'connected' ? COLORS.green : connectionStatus === 'error' ? COLORS.primary : '#999', fontWeight: 'bold' }]}>
              {connectionStatus === 'connected' ? '● Live' : connectionStatus === 'error' ? '● Error' : '● Offline'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.floorSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Floor</Text>
          </View>

          // Floor Cards
          {displayFloors.map((floor) => {
            const malfunctionedCount = floor.malfunctioned ?? 0;
            const occupiedCount = Math.max(0, floor.total - floor.available - malfunctionedCount);
            const status = getFloorStatus(floor.available, floor.total);
            const progressPercentage = floor.total > 0 ? (occupiedCount / floor.total) * 100 : 0;
            const noData = status.text === 'NO DATA' || floor.total === 0;
            const isFull = floor.total > 0 && floor.available === 0;

            const userRole = TokenManager.getUser()?.role;
            const canSeeMalfunction = userRole === 'admin' || userRole === 'ssd' || userRole === 'security';
            const isDisabled = userRole === 'user' ? (noData || isFull) : noData;

            return (
              <TouchableOpacity
                key={`floor-${floor.floor}`}
                style={[
                  styles.floorCard,
                  (noData && (userRole === 'user' || floor.total === 0)) && styles.noDataFloorCard,
                  (isFull && userRole === 'user') && styles.fullFloorCard,
                  isDisabled && userRole === 'user' && { opacity: 0.6 }
                ]}
                onPress={() => handleFloorPress(floor)}
                activeOpacity={isDisabled ? 1 : 0.8}
                disabled={isDisabled}
              >
                <View style={styles.floorHeader}>
                  <Text style={[
                    styles.floorTitle,
                    isDisabled && userRole === 'user' && styles.fullFloorText
                  ]}>
                    {getFloorName(floor.floor)}
                  </Text>
                  <View style={styles.floorHeaderRight}>
                    {canSeeMalfunction && malfunctionedCount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6F00', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 6, gap: 3 }}>
                        <Ionicons name="warning" size={12} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{malfunctionedCount}</Text>
                      </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                      <Text style={styles.statusText}>{status.text}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={isDisabled ? "#666" : "#999"}
                    />
                  </View>
                </View>

                <View style={styles.floorStats}>
                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber,
                      { color: COLORS.green },
                      isDisabled && userRole === 'user' && styles.fullFloorText
                    ]}>
                      {floor.available}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      isDisabled && userRole === 'user' && styles.fullFloorText
                    ]}>Available</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber,
                      { color: COLORS.primary },
                      isDisabled && userRole === 'user' && styles.fullFloorText
                    ]}>
                      {occupiedCount}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      isDisabled && userRole === 'user' && styles.fullFloorText
                    ]}>Occupied</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber,
                      { color: COLORS.blue },
                      isDisabled && userRole === 'user' && styles.fullFloorText
                    ]}>
                      {floor.total}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      isDisabled && userRole === 'user' && styles.fullFloorText
                    ]}>Total Spots</Text>
                  </View>
                </View>

                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: status.color
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.progressBarText,
                    isDisabled && userRole === 'user' && styles.fullFloorText
                  ]}>
                    {noData ? 'No sensors' : `${Math.round(progressPercentage)}% Occupied`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <NotificationOverlay
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={currentUserId || undefined}
      />

      {showFullAlert && (
        <Modal visible={showFullAlert} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>No Available Slots</Text>
              <Text style={styles.modalText}>
                This floor is currently full. Please choose another floor or wait for someone to leave.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setShowFullAlert(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default HomeScreen;
