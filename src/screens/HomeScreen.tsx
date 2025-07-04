import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
  Image,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RealTimeParkingService, ParkingStats } from '../services/RealtimeParking';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold  } from '@expo-google-fonts/poppins';
import AppLoading from 'expo-app-loading';

// Define navigation types
type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: undefined;
  Feedback: undefined;
  Settings: undefined;
  Profile: undefined;
  ApiTest: undefined;
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
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
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
  
  const { width } = Dimensions.get('window');
  const navigation = useNavigation<HomeScreenNavigationProp>();
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

  // Get floor name helper function
  const getFloorName = (floorNumber: number): string => {
    switch (floorNumber) {
      case 1: return '1st Floor';
      case 2: return '2nd Floor';
      case 3: return '3rd Floor';
      case 4: return '4th Floor';
      default: return `${floorNumber}th Floor`;
    }
  };
  

  // Handle floor card press
  const handleFloorPress = (floor: any) => {
    const status = getFloorStatus(floor.available, floor.total);
    
    if (status.text === 'FULL') {
     setShowFullAlert(true);
    } else {
      navigation.navigate('ParkingMap');
    }
  };

  // Fallback function to fetch data directly from API
  const fetchParkingDataDirect = async () => {
    try {
      console.log('Fetching parking data directly from API...');
      
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
      // Transform the data
      const transformedData = transformParkingData(rawData);
      setParkingData(transformedData);
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Error loading parking data:', error);
      setConnectionStatus('error'); 
    } finally {
      setLoading(false);
    }
  };

  // Transform raw API data to app format
 const transformParkingData = (rawData: any[]): ParkingStats => {
  const totalSpots = rawData.length;
  const availableSpots = rawData.filter((space: any) => !space.is_occupied).length;
  const occupiedSpots = totalSpots - availableSpots;

  // Group by floor - MODIFIED: Assign all API data to floor 4
  const floorGroups: { [key: number]: any[] } = {};
  
  rawData.forEach((space: any) => {
    // CHANGE: Assign all API data to floor 4 instead of floor 1
    let floor = 4;
    
    // You can still use location-based assignment if needed, but default to floor 4
    if (space.location) {
      const floorMatch = space.location.match(/floor\s*(\d+)/i) || 
                        space.location.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i);
      if (floorMatch) {
        const extractedFloor = parseInt(floorMatch[1]);
        // Map extracted floors to floor 4 (or keep original logic if you want)
        floor = 4; // Force all to floor 4
      }
    }
    
    if (!floorGroups[floor]) {
      floorGroups[floor] = [];
    }
    floorGroups[floor].push(space);
  });

  // Create floors array with status
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
  };
};

  useEffect(() => {
    let unsubscribeParkingUpdates: (() => void) | undefined;
    let unsubscribeConnectionStatus: (() => void) | undefined;

    // Try to use RealTimeParkingService first
    try {
      // Subscribe to real-time parking updates
      unsubscribeParkingUpdates = RealTimeParkingService.onParkingUpdate((data: ParkingStats) => {
        setParkingData(data);
        setLoading(false);
      });

      // Subscribe to connection status updates
      unsubscribeConnectionStatus = RealTimeParkingService.onConnectionStatus((status: 'connected' | 'disconnected' | 'error') => {
        setConnectionStatus(status);
      });
      RealTimeParkingService.start();
      
      // Fallback: if no data after 5 seconds, fetch directly
      const fallbackTimer = setTimeout(() => {
        if (loading) {
          fetchParkingDataDirect();
        }
      }, 5000);

      return () => {
        clearTimeout(fallbackTimer);
        if (unsubscribeParkingUpdates) unsubscribeParkingUpdates();
        if (unsubscribeConnectionStatus) unsubscribeConnectionStatus();
        RealTimeParkingService.stop();
      };
    } catch (error) {
      // Fallback to direct API call
      fetchParkingDataDirect();
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await RealTimeParkingService.forceUpdate();
    } catch (error) {
      console.log('Service update failed, trying direct fetch...');
      await fetchParkingDataDirect();
    }
    setRefreshing(false);
  };

  const getFloorStatus = (available: number, total: number) => {
    if (total === 0) return { text: 'AVAILABLE', color: '#48D666' };
    const percentage = (available / total) * 100;
    
    if (percentage === 0) return { text: 'FULL', color: '#B22020' };
    if (percentage < 25) return { text: 'LIMITED', color: '#FF9801' };
    return { text: 'AVAILABLE', color: '#48D666' };
  };

  const getProgressPercentage = (available: number, total: number) => {
    if (total === 0) return 0;
    return ((total - available) / total) * 100;
  };

  // Ensure we have 4 floors
  const ensureFourFloors = (floors: any[]) => {
    const defaultFloorData = [
      { floor: 1, total: 40, available: 15, occupancyRate: 62.5, status: 'limited' as const },
      { floor: 2, total: 40, available: 5, occupancyRate: 87.5, status: 'limited' as const },
      { floor: 3, total: 40, available: 0, occupancyRate: 100, status: 'full' as const },
      { floor: 4, total: 40, available: 25, occupancyRate: 37.5, status: 'available' as const },
    ];

    return defaultFloorData.map((defaultFloor) => {
      const existingFloor = floors.find(f => f.floor === defaultFloor.floor);
      return existingFloor || defaultFloor;
    });
  };

    const fourFloors = ensureFourFloors([
      ...parkingData.floors.map(floor =>
        floor.floor === 1 ? { ...floor, floor: 4 } : floor
      )
    ]);

  // Show loading indicator
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={styles.loadingContent}>
          <Ionicons name="car" size={48} color="#B22020" />
          <Text style={styles.loadingText}>Loading VALET...</Text>
          <Text style={styles.loadingSubtext}>Fetching real-time parking data</Text>
        </View>
      </View>
    );
  }

  return (
    
    <View style={styles.container}>
      
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      {/* Header with Gradient */}
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
              <Text style={styles.subtitle}>Your Virtual Parking Buddy</Text>
            </View>
          </View>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Campus Overview Card */}
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

          {fourFloors.map((floor, index) => {
            const status = getFloorStatus(floor.available, floor.total);
            const progressPercentage = getProgressPercentage(floor.available, floor.total);
            const isFull = status.text === 'FULL';
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.floorCard,
                  isFull && styles.fullFloorCard
                ]}
                onPress={() => handleFloorPress(floor)}
                activeOpacity={0.8}
              >
                <View style={styles.floorHeader}>
                  <Text style={[
                    styles.floorTitle,
                    isFull && styles.fullFloorText
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
                      color={isFull ? "#666" : "#999"} 
                    />
                  </View>
                </View>

                <View style={styles.floorStats}>
                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber, 
                      { color: '#48D666' },
                      isFull && styles.fullFloorText
                    ]}>
                      {floor.available}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      isFull && styles.fullFloorText
                    ]}>Available</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber, 
                      { color: '#B22020' },
                      isFull && styles.fullFloorText
                    ]}>
                      {floor.total - floor.available}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      isFull && styles.fullFloorText
                    ]}>Occupied</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[
                      styles.statNumber, 
                      { color: '#2196F3' },
                      isFull && styles.fullFloorText
                    ]}>
                      {floor.total}
                    </Text>
                    <Text style={[
                      styles.statLabel,
                      isFull && styles.fullFloorText
                    ]}>Total Spots</Text>
                  </View>
                </View>

                {/* Progress Bar */}
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
                    isFull && styles.fullFloorText
                  ]}>
                    {Math.round(progressPercentage)}% Full
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

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
      {showFullAlert && (
      <Modal visible={showFullAlert} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>No Available Slots</Text>
            <Text style={styles.modalText}>
              This floor is currently full. Please choose another floor.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowFullAlert(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        )}
    </View>
  );
};

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
  },
  subtitle: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
    padding: 4,
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
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  occupancyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  occupancyText: {
    fontSize: 14,
    color: '#666',
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
  fullFloorText: {
    color: '#666',
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
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    fontWeight: '500',
  },
  //TABS PART
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
    fontFamily: 'Poppins_700Bold',
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
  confirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  cancelButtonText: {
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});

export default HomeScreen;