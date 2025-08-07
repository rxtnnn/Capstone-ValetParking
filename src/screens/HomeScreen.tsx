import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {View, Text, TouchableOpacity, ScrollView, RefreshControl, StatusBar, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RealTimeParkingService, ParkingStats } from '../services/RealtimeParkingService';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles/HomeScreen.style';
import { NotificationManager } from '../services/NotifManager';
import NotificationOverlay from '../components/NotifOverlay';
import { useFeedback } from '../hooks/useFeedback';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: undefined;
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

const FONTS = { Poppins_400Regular, Poppins_600SemiBold };
const FLOOR_SUFFIXES = ['th', 'st', 'nd', 'rd'];
const FLOOR_PATTERN = /(\d+)(?:st|nd|rd|th)?\s*floor/i;
const FEEDBACK_CHECK_INTERVAL = 5 * 60 * 1000;
const DEFAULT_FLOORS = Array.from({ length: 4 }, (_, i) => ({
  floor: i + 1,
  total: 0,
  available: 0,
  occupancyRate: 0,
  status: 'available' as const
}));

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
  const [fontsLoaded] = useFonts(FONTS);

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

  const isMountedRef = useRef(true);
  const unsubscribeFunctionsRef = useRef<{
    parkingUpdates?: () => void;
    connectionStatus?: () => void;
    notifications?: () => void;
  }>({});

  const extractFloorFromLocation = useCallback((floor_level: string): number => {
    if (!floor_level) return 1;
    const match = floor_level.match(FLOOR_PATTERN);
    if (match) {
      const floorNumber = parseInt(match[1]);
      if (floorNumber >= 1 && floorNumber <= 4) return floorNumber;
    }
    return 1;
  }, []);

  const getFloorName = useCallback((floorNumber: number): string => {
    const remainder = floorNumber % 100;
    const suffix = (remainder >= 11 && remainder <= 13) 
      ? 'th' 
      : FLOOR_SUFFIXES[floorNumber % 10] || 'th';
    return `${floorNumber}${suffix} Floor`;
  }, []);

  const getFloorStatus = useCallback((available: number, total: number) => {
    if (total === 0) return { text: 'NO DATA', color: '#999' };
    const percentage = (available / total) * 100;
    if (percentage === 0) return { text: 'FULL', color: '#B22020' };
    if (percentage < 25) return { text: 'LIMITED', color: '#FF9801' };
    return { text: 'AVAILABLE', color: '#48D666' };
  }, []);

  const getProgressPercentage = useCallback((available: number, total: number) => {
    return total === 0 ? 0 : ((total - available) / total) * 100;
  }, []);

  const floorsToDisplay = useMemo(() => {
    const fixedFloors = [...DEFAULT_FLOORS];
    
    fixedFloors.forEach(fixedFloor => {
      const realFloor = parkingData.floors.find(rf => rf.floor === fixedFloor.floor);
      if (realFloor) {
        Object.assign(fixedFloor, realFloor);
      }
    });
    
    return fixedFloors;
  }, [parkingData.floors]);

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
        
        NotificationManager.addSpotAvailableNotification(increase, bestFloor.floor);
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

  const subscribeToParkingData = useCallback(() => {
    if (!isAuthenticated || unsubscribeFunctionsRef.current.parkingUpdates) return;

    console.log('Setting up parking data subscription');

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
    const status = getFloorStatus(floor.available, floor.total);
    
    if (status.text === 'FULL') {
      setShowFullAlert(true);
    } else {
      navigation.navigate('ParkingMap');
    }
  }, [getFloorStatus, navigation]);

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
          <Ionicons name="car" size={48} color="#B22020" />
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
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      <LinearGradient colors={['#B22020', '#4C0E0E']} style={styles.header}>
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
                color="#48D666"
              >
                <Text style={[styles.progressNumber, { color: '#48D666' }]}>
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
                color="#B22020"
              >
                <Text style={[styles.progressNumber, { color: '#B22020' }]}>
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
                color="#2196F3"
              >
                <Text style={[styles.progressNumber, { color: '#2196F3' }]}>
                  {parkingData.totalSpots}
                </Text>
              </CircularProgress>
              <Text style={styles.progressLabel}>Total Spots</Text>
            </View>
          </View>

          <View style={styles.occupancyRow}>
            <Text style={styles.occupancyText}>Overall Occupancy</Text>
            <Text style={styles.occupancyText}>
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

          {floorsToDisplay.map((floor) => {
            const status = getFloorStatus(floor.available, floor.total);
            const progressPercentage = getProgressPercentage(floor.available, floor.total);
            const isFull = status.text === 'FULL';
            const hasNoData = status.text === 'NO DATA' || floor.total === 0;
            const isDisabled = hasNoData;
            
            return (
              <TouchableOpacity
                key={`floor-${floor.floor}`}
                style={[
                  styles.floorCard,
                  isFull && styles.fullFloorCard,
                  hasNoData && styles.noDataFloorCard,
                  isDisabled && styles.disabledFloorCard
                ]}
                onPress={() => isDisabled ? null : handleFloorPress(floor)}
                activeOpacity={isDisabled ? 1 : 0.8}
                disabled={isDisabled}
              >
                <View style={styles.floorHeader}>
                  <Text style={[
                    styles.floorTitle,
                    (isFull || hasNoData) && styles.fullFloorText,
                    isDisabled && styles.disabledText
                  ]}>
                    {getFloorName(floor.floor)}
                  </Text>
                  <View style={styles.floorHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                      <Text style={styles.statusText}>{status.text}</Text>
                    </View>
                    <Ionicons 
                      name="chevron-forward" 
                      size={24} 
                      color={isDisabled ? "#ccc" : (isFull || hasNoData) ? "#666" : "#999"} 
                    />
                  </View>
                </View>

                <View style={styles.floorStats}>
                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber, 
                      { color: '#48D666' },
                      (isFull || hasNoData) && styles.fullFloorText,
                      isDisabled && styles.disabledText
                    ]}>
                      {floor.available}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      (isFull || hasNoData) && styles.fullFloorText,
                      isDisabled && styles.disabledText
                    ]}>Available</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber, 
                      { color: '#B22020' },
                      (isFull || hasNoData) && styles.fullFloorText,
                      isDisabled && styles.disabledText
                    ]}>
                      {floor.total - floor.available}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      (isFull || hasNoData) && styles.fullFloorText,
                      isDisabled && styles.disabledText
                    ]}>Occupied</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber, 
                      { color: '#2196F3' },
                      (isFull || hasNoData) && styles.fullFloorText,
                      isDisabled && styles.disabledText
                    ]}>
                      {floor.total}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      (isFull || hasNoData) && styles.fullFloorText,
                      isDisabled && styles.disabledText
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
                          backgroundColor: isDisabled ? '#ccc' : status.color
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.progressBarText,
                    (isFull || hasNoData) && styles.fullFloorText,
                    isDisabled && styles.disabledText
                  ]}>
                    {hasNoData ? 'No sensors' : `${Math.round(progressPercentage)}% Full`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, styles.activeTab]} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ParkingMap')}>
          <Ionicons name="map" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Feedback')}>
          <Ionicons name="chatbubble-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => navigation.navigate('Profile', currentUserId ? { userId: currentUserId } : undefined)}
        >
          <Ionicons name="person-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

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