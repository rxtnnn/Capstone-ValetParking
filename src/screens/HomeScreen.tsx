import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RealTimeParkingService, ParkingStats } from '../services/RealtimeParkingService';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold  } from '@expo-google-fonts/poppins';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔥 NEW IMPORTS
import { NotificationManager } from '../services/NotifManager';
import NotificationOverlay from '../components/NotifOverlay';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: undefined;
  Feedback: undefined;
  Settings: undefined;
  Profile: { userId?: number } | undefined;
  ApiTest: undefined;
  Register: undefined;
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
  const strokeDasharray = circumference;
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
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
        {children}
      </View>
    </View>
  );
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, logout, isAuthenticated } = useAuth();
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

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

  // 🔥 NEW NOTIFICATION STATE
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [lastParkingData, setLastParkingData] = useState<ParkingStats | null>(null);

  // Check authentication when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated) {
        navigation.navigate('Register');
      } else {
        getCurrentUserId();
        // Check for new feedback replies when user returns to home
        if (currentUserId) {
          NotificationManager.checkForFeedbackReplies(currentUserId);
        }
      }
    }, [isAuthenticated, navigation, currentUserId])
  );

  // Function to get current user ID from storage
  const getCurrentUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('valet_user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        console.log('📋 Current user ID set:', user.id);
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
  };

  const getFloorName = (floorNumber: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const remainder = floorNumber % 100;
    const suffix = (remainder >= 11 && remainder <= 13) 
      ? 'th' 
      : suffixes[floorNumber % 10] || 'th';
    
    return `${floorNumber}${suffix} Floor`;
  };

  const handleFloorPress = (floor: any) => {
    const status = getFloorStatus(floor.available, floor.total);
    
    if (status.text === 'FULL') {
     setShowFullAlert(true);
    } else {
      navigation.navigate('ParkingMap');
    }
  };

  const extractFloorFromLocation = (floor_level: string): number => {
    if (!floor_level) {
      return 1;
    }

    const pattern = /(\d+)(?:st|nd|rd|th)?\s*floor/i;
    const match = floor_level.match(pattern); //match[0] "4th floor", [1] "4"

    if (match) {
      const floorNumber = parseInt(match[1]);
      if (floorNumber >= 1 && floorNumber <= 4) {
        return floorNumber;
      }
    }
    return 1;
  };

  const fetchParkingDataDirect = async () => {
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
      const transformedData = transformParkingData(rawData);
      setParkingData(transformedData);
      setConnectionStatus('connected');
      
    } catch (error) {
      setConnectionStatus('error'); 
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NEW: Enhanced parking data transformation with notification integration
  const transformParkingData = (rawData: any[]): ParkingStats => {
    const totalSpots = rawData.length;
    const availableSpots = rawData.filter((space: any) => !space.is_occupied).length;
    const occupiedSpots = totalSpots - availableSpots;

    const floorGroups: { [key: number]: any[] } = {};
  
    rawData.forEach((space: any) => {
      const floor = extractFloorFromLocation(space.floor_level || '');
      
      if (!floorGroups[floor]) {
        floorGroups[floor] = [];
      }
      floorGroups[floor].push(space);
    });

    const floors = Object.entries(floorGroups).map(([floorNum, spaces]) => {
      const total = spaces.length;
      const available = spaces.filter((s: any) => !s.is_occupied).length;
      const occupancyRate = total > 0 ? ((total - available) / total) * 100 : 0;
      
      let status: 'available' | 'limited' | 'full';
      if (available === 0) {
        status = 'full';
      } else if (available / total < 0.2) {
        status = 'limited';
      } else {
        status = 'available';
      }

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
      sensorData: rawData, // Include sensor data for notifications
    };
  };

  // 🔥 NEW: Function to check for parking changes and trigger notifications
  const checkParkingChanges = (newData: ParkingStats) => {
    if (!lastParkingData) {
      setLastParkingData(newData);
      return;
    }

    // Check for new available spots
    if (newData.availableSpots > lastParkingData.availableSpots) {
      const increase = newData.availableSpots - lastParkingData.availableSpots;
      console.log(`🟢 ${increase} new spot(s) available!`);
      
      // Find floor with most new spots
      const bestFloor = newData.floors.reduce((prev, current) => 
        prev.available > current.available ? prev : current
      );
      
      NotificationManager.addSpotAvailableNotification(
        increase,
        bestFloor.floor
      );
    }

    // Check for floor status changes
    newData.floors.forEach(newFloor => {
      const oldFloor = lastParkingData.floors.find(f => f.floor === newFloor.floor);
      
      if (oldFloor && oldFloor.available !== newFloor.available) {
        NotificationManager.addFloorUpdateNotification(
          newFloor.floor,
          newFloor.available,
          newFloor.total,
          oldFloor.available
        );
      }
    });

    setLastParkingData(newData);
  };

  // 🔥 ENHANCED: Updated useEffect with notification integration
  useEffect(() => {
    let unsubscribeParkingUpdates: (() => void) | undefined;
    let unsubscribeConnectionStatus: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;
    
    // Only fetch parking data if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      // Subscribe to parking updates
      unsubscribeParkingUpdates = RealTimeParkingService.onParkingUpdate((data: ParkingStats) => {
        setParkingData(data); 
        checkParkingChanges(data); // Check for changes to trigger notifications
        setLoading(false);
      });

      // Subscribe to connection status changes
      unsubscribeConnectionStatus = RealTimeParkingService.onConnectionStatus((status: 'connected' | 'disconnected' | 'error') => {
        setConnectionStatus(status);
        
        // Connection status changes do not create notifications
        // Only parking updates and feedback replies create notifications
      });

      // Subscribe to notification count updates
      unsubscribeNotifications = NotificationManager.subscribe(() => {
        setUnreadNotificationCount(NotificationManager.getUnreadCount());
      });

      RealTimeParkingService.start();
      
      const fallbackTimer = setTimeout(() => {
        if (loading) {
          fetchParkingDataDirect();
        }
      }, 3000);

      return () => {
        clearTimeout(fallbackTimer);
        if (unsubscribeParkingUpdates) unsubscribeParkingUpdates();
        if (unsubscribeConnectionStatus) unsubscribeConnectionStatus();
        if (unsubscribeNotifications) unsubscribeNotifications();
        RealTimeParkingService.stop();
      };
    } catch (error) {
      console.error('Error setting up service:', error);
      fetchParkingDataDirect();
    }
  }, [loading, isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await RealTimeParkingService.forceUpdate();
    } catch (error) {
      await fetchParkingDataDirect();
    }
    setRefreshing(false);
  };

  const getFloorStatus = (available: number, total: number) => {
    if (total === 0) return { text: 'NO DATA', color: '#999' };
    const percentage = (available / total) * 100;
    if (percentage === 0) return { text: 'FULL', color: '#B22020' };
    if (percentage < 25) return { text: 'LIMITED', color: '#FF9801' };
    return { text: 'AVAILABLE', color: '#48D666' };
  };

  const getProgressPercentage = (available: number, total: number) => {
    if (total === 0) return 0;
    return ((total - available) / total) * 100;
  };

  const prepareFloorsForDisplay = (realFloors: any[]) => {
    console.log('Fetching real floors from API:', realFloors);
    
    const fixedFloors = [
      { floor: 1, total: 0, available: 0, occupancyRate: 0, status: 'available' as const },
      { floor: 2, total: 0, available: 0, occupancyRate: 0, status: 'available' as const },
      { floor: 3, total: 0, available: 0, occupancyRate: 0, status: 'available' as const },
      { floor: 4, total: 0, available: 0, occupancyRate: 0, status: 'available' as const },
    ];

    fixedFloors.forEach(fixedFloor => {
      const realFloor = realFloors.find(rf => rf.floor === fixedFloor.floor);
      if (realFloor) {
        fixedFloor.total = realFloor.total;
        fixedFloor.available = realFloor.available;
        fixedFloor.occupancyRate = realFloor.occupancyRate;
        fixedFloor.status = realFloor.status;
      } 
    });
    
    return fixedFloors;
  };

  const floorsToDisplay = prepareFloorsForDisplay(parkingData.floors);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

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
      
      {/*Header*/}
      <LinearGradient
        colors={['#B22020', '#4C0E0E']}
        style={styles.header}
      >
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
            {/* 🔥 ENHANCED NOTIFICATION BUTTON WITH BADGE */}
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

        {/*Campus Overall Card*/}
        <View style={styles.campusCard}>
          <Text style={styles.campusTitle}>USJ-R Quadricentennial Campus</Text>
          
          <View style={styles.circularProgressRow}>
            {/* Available */}
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

            {/* Occupied */}
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

            {/* Total Spots */}
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
            <View style={[styles.liveBadge, { backgroundColor: connectionStatus === 'connected' ? '#48D666' : '#FF9801' }]}>
              <Text style={styles.liveText}>
                {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Floor Selection */}
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.floorSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Floor</Text>
            <View style={[styles.liveBadge, { backgroundColor: connectionStatus === 'connected' ? '#48D666' : '#FF9801' }]}>
              <Text style={styles.liveText}>
                {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          {/* dynamic floor real data */}
          {floorsToDisplay.map((floor, index) => {
            const status = getFloorStatus(floor.available, floor.total);
            const progressPercentage = getProgressPercentage(floor.available, floor.total);
            const isFull = status.text === 'FULL';
            const hasNoData = status.text === 'NO DATA' || floor.total === 0;
            const isDisabled = hasNoData; // disable if no data
            
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

                {/* Progress Container */}
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

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, styles.activeTab]} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ParkingMap')}>
          <Ionicons name="map" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => navigation.navigate('Profile', currentUserId ? { userId: currentUserId } : undefined)}
        >
          <Ionicons name="person-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Feedback')}>
          <Ionicons name="chatbubble-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* 🔥 NEW: Notification Overlay */}
      <NotificationOverlay
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={currentUserId || undefined}
      />

      {/* Full Alert Modal */}
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

// 🔥 COMPLETE STYLES WITH NOTIFICATION ENHANCEMENTS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    fontFamily: 'Poppins_600SemiBold'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontFamily: 'Poppins_400Regular'
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    justifyContent: 'center',
  },
  valetText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
    fontFamily: 'Poppins_600SemiBold'
  },
  subtitle: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
    marginTop: 2,
    fontFamily: 'Poppins_400Regular'
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
    padding: 4,
  },
  // 🔥 NEW NOTIFICATION STYLES
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B22020',
  },
  notificationBadgeText: {
    color: '#333',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  campusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 0,
  },
  campusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Poppins_600SemiBold'
  },
  circularProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold'
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular'
  },
  occupancyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  occupancyText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    fontStyle: 'italic',
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold'
  },
  scrollContainer: {
    flex: 1,
  },
  floorSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold'
  },
  floorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fullFloorCard: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  noDataFloorCard: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  disabledFloorCard: {
    backgroundColor: '#f8f8f8',
    opacity: 0.6,
  },
  fullFloorText: {
    color: '#666',
    fontFamily: 'Poppins_400Regular'
  },
  disabledText: {
    color: '#aaa',
    fontFamily: 'Poppins_400Regular'
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold'
  },
  floorHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold'
  },
  floorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Poppins_400Regular'
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressBarText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    fontWeight: '500',
    fontFamily: 'Poppins_400Regular'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginHorizontal: 40,
    marginBottom: 20,
    borderRadius: 25,
    justifyContent: 'space-around',
  },
  tabItem: {
    padding: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#B22020',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  modalText: {
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});

export default HomeScreen;