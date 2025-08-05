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
const FEEDBACK_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
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
  const servicesInitializedRef = useRef(false);
  const userIdFetchedRef = useRef(false);
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

  const getCurrentUserId = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const userData = await AsyncStorage.getItem('valet_user_data');
      if (userData && isMountedRef.current) {
        const user = JSON.parse(userData);
        const userId = user.id;
        setCurrentUserId(userId);
        
        await NotificationManager.setCurrentUserId(userId);
        await checkForNewReplies();
        await NotificationManager.checkForFeedbackReplies(userId);
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
  }, [checkForNewReplies]);

  const transformParkingData = useCallback((rawData: any[]): ParkingStats => {
    const totalSpots = rawData.length;
    const availableSpots = rawData.filter((space: any) => !space.is_occupied).length;
    const occupiedSpots = totalSpots - availableSpots;

    const floorGroups: { [key: number]: any[] } = {};
  
    rawData.forEach((space: any) => {
      const floor = extractFloorFromLocation(space.floor_level || '');
      if (!floorGroups[floor]) floorGroups[floor] = [];
      floorGroups[floor].push(space);
    });

    const floors = Object.entries(floorGroups).map(([floorNum, spaces]) => {
      const total = spaces.length;
      const available = spaces.filter((s: any) => !s.is_occupied).length;
      const occupancyRate = total > 0 ? ((total - available) / total) * 100 : 0;
      
      let status: 'available' | 'limited' | 'full';
      if (available === 0) status = 'full';
      else if (available / total < 0.2) status = 'limited';
      else status = 'available';

      return {
        floor: parseInt(floorNum),
        total,
        available,
        occupancyRate,
        status,
      };
    }).sort((a, b) => a.floor - b.floor);

    return {
      totalSpots,
      availableSpots,
      occupiedSpots,
      floors,
      lastUpdated: new Date().toLocaleTimeString(),
      isLive: true,
      sensorData: rawData,
    };
  }, [extractFloorFromLocation]);

  const fetchParkingDataDirect = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await fetch('https://valet.up.railway.app/api/parking', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      
      if (isMountedRef.current) {
        const transformedData = transformParkingData(rawData);
        setParkingData(transformedData);
        setConnectionStatus('connected');
      }
    } catch (error) {
      if (isMountedRef.current) {
        setConnectionStatus('error');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [transformParkingData]);

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
      if (isAuthenticated && isMountedRef.current) {
        await fetchParkingDataDirect();
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [isAuthenticated, currentUserId, checkForNewReplies, fetchParkingDataDirect]);

  const handleFloorPress = useCallback((floor: any) => {
    const status = getFloorStatus(floor.available, floor.total);
    
    if (status.text === 'FULL') {
      setShowFullAlert(true);
    } else {
      navigation.navigate('ParkingMap');
    }
  }, [getFloorStatus, navigation]);

   const setupPersistentServices = useCallback(async () => {
    if (!isAuthenticated || servicesInitializedRef.current) return;
    servicesInitializedRef.current = true;

    try {
      const unsubscribeParkingUpdates = RealTimeParkingService.onParkingUpdate((data: ParkingStats) => {
        if (!isMountedRef.current) return;
        
        setParkingData(prevData => {
          if (JSON.stringify(prevData.floors) !== JSON.stringify(data.floors)) {
            checkParkingChanges(data);
            return data;
          }
          return { ...prevData, lastUpdated: data.lastUpdated, isLive: data.isLive };
        });
        setLoading(false);
      });

      const unsubscribeConnectionStatus = RealTimeParkingService.onConnectionStatus((status: 'connected' | 'disconnected' | 'error') => {
        if (!isMountedRef.current) return;
        setConnectionStatus(status);
      });

      // Store unsubscribe functions
      unsubscribeFunctionsRef.current = {
        parkingUpdates: unsubscribeParkingUpdates,
        connectionStatus: unsubscribeConnectionStatus,
      };
      RealTimeParkingService.start();
      
      setTimeout(() => {
        if (isMountedRef.current && loading && connectionStatus !== 'connected') {
          fetchParkingDataDirect();
        }
      }, 3000);

    } catch (error) {
      console.error('Error setting up persistent services:', error);
      if (isMountedRef.current && isAuthenticated) {
        fetchParkingDataDirect();
      }
    }
  }, [isAuthenticated, checkParkingChanges, fetchParkingDataDirect, loading, connectionStatus]);

  const setupNotifications = useCallback(() => {
    if (!currentUserId || unsubscribeFunctionsRef.current.notifications) return;

    const unsubscribeNotifications = NotificationManager.subscribe((notifications) => {
      if (!isMountedRef.current) return;
      setUnreadNotificationCount(NotificationManager.getUnreadCount());
    });

    unsubscribeFunctionsRef.current.notifications = unsubscribeNotifications;
  }, [currentUserId]);

  useFocusEffect(
    React.useCallback(() => {
      
      if (!isAuthenticated) {
        navigation.navigate('Login');
        return;
      }
      if (!userIdFetchedRef.current) {
        getCurrentUserId().then(() => {
          userIdFetchedRef.current = true;
        });
      }
      setupPersistentServices();
      setupNotifications();
    }, [isAuthenticated, getCurrentUserId, setupPersistentServices, setupNotifications, navigation])
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      Object.values(unsubscribeFunctionsRef.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribeFunctionsRef.current = {};
      servicesInitializedRef.current = false;
      userIdFetchedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (servicesInitializedRef.current) return;

    let unsubscribeParkingUpdates: (() => void) | undefined;
    let unsubscribeConnectionStatus: (() => void) | undefined;
    let fallbackTimer: NodeJS.Timeout | undefined;

    const setupParkingService = async () => {
      servicesInitializedRef.current = true;

      try {
        let updateTimeout: NodeJS.Timeout;
        unsubscribeParkingUpdates = RealTimeParkingService.onParkingUpdate((data: ParkingStats) => {
          if (!isMountedRef.current) return;
          
          if (updateTimeout) clearTimeout(updateTimeout);
          
          updateTimeout = setTimeout(() => {
            if (isMountedRef.current) {
              setParkingData(prevData => {
                if (JSON.stringify(prevData.floors) !== JSON.stringify(data.floors)) {
                  checkParkingChanges(data);
                  return data;
                }
                return { ...prevData, lastUpdated: data.lastUpdated, isLive: data.isLive };
              });
              setLoading(false);
            }
          }, 300);
        });

        unsubscribeConnectionStatus = RealTimeParkingService.onConnectionStatus((status: 'connected' | 'disconnected' | 'error') => {
          if (!isMountedRef.current) return;
          setConnectionStatus(status);
        });

        if (isMountedRef.current && isAuthenticated) {
          RealTimeParkingService.start();
          
          fallbackTimer = setTimeout(() => {
            if (isMountedRef.current && loading && isAuthenticated) {
              fetchParkingDataDirect();
            }
          }, 3000);
        }
      } catch (error) {
        console.error('Error setting up services:', error);
        if (isMountedRef.current && isAuthenticated) {
          fetchParkingDataDirect();
        }
      }
    };

    setupParkingService();

    return () => {
      servicesInitializedRef.current = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (unsubscribeParkingUpdates) unsubscribeParkingUpdates();
      if (unsubscribeConnectionStatus) unsubscribeConnectionStatus();

      try {
        RealTimeParkingService.stop();
      } catch (error) {
        console.error('Error stopping RealTimeParkingService:', error);
      }
    };
  }, [isAuthenticated, checkParkingChanges, fetchParkingDataDirect, loading]);

  

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