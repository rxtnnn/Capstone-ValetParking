import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Badge } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

import { RealTimeParkingService, ParkingStats } from '../services/RealTimeParkingService';

// Define types locally
type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: { floor: number };
  Feedback: undefined;
  Settings: undefined;
  Profile: undefined;
  ApiTest: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [parkingData, setParkingData] = useState<ParkingStats>({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    floors: [],
    lastUpdated: '',
    isLive: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Subscribe to real-time parking updates
    const unsubscribeParkingUpdates = RealTimeParkingService.onParkingUpdate((data) => {
      console.log('📊 Received real-time parking update:', data);
      setParkingData(data);
      setLoading(false);
      setRefreshing(false);
    });

    // Subscribe to connection status updates
    const unsubscribeConnectionStatus = RealTimeParkingService.onConnectionStatus((status) => {
      console.log('📡 Connection status changed:', status);
      setConnectionStatus(status);
    });

    // Start real-time updates
    RealTimeParkingService.start();

    // Cleanup function
    return () => {
      unsubscribeParkingUpdates();
      unsubscribeConnectionStatus();
      RealTimeParkingService.stop();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await RealTimeParkingService.forceUpdate();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    // Note: setRefreshing(false) is called in the update callback
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'error': return '#F44336';
      case 'disconnected': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return parkingData.isLive ? 'LIVE' : 'CONNECTED';
      case 'error': return 'ERROR';
      case 'disconnected': return 'CONNECTING...';
      default: return 'UNKNOWN';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return parkingData.isLive ? 'wifi' : 'cloud-done';
      case 'error': return 'wifi-off';
      case 'disconnected': return 'cloud-sync';
      default: return 'help';
    }
  };

  const menuItems = [
    {
      title: 'Find Parking',
      icon: 'local-parking',
      onPress: () => navigation.navigate('Floors'),
      color: '#B71C1C',
    },
    {
      title: 'API Test',
      icon: 'developer-mode',
      onPress: () => navigation.navigate('ApiTest'),
      color: '#4CAF50',
    },
    {
      title: 'Settings',
      icon: 'settings',
      onPress: () => navigation.navigate('Settings'),
      color: '#B71C1C',
    },
    {
      title: 'Profile',
      icon: 'person',
      onPress: () => navigation.navigate('Profile'),
      color: '#2196F3',
    },
    {
      title: 'Parking Map',
      icon: 'map',
      onPress: () => navigation.navigate('ParkingMap', { floor: 1 }),
      color: '#FF9800',
    },
    {
      title: 'Send Feedback',
      icon: 'feedback',
      onPress: () => navigation.navigate('Feedback'),
      color: '#B71C1C',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loader}>
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            style={styles.loadingIcon}
          >
            <MaterialIcons name="wifi" size={50} color="#B71C1C" />
          </Animatable.View>
          <Text style={styles.loadingText}>Connecting to VALET...</Text>
          <Text style={styles.loadingSubtext}>Fetching real-time parking data</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.valetText}>VALET</Text>
        </View>
        <Text style={styles.subtitle}>
          Your Virtual Assistant with LED{'\n'}Enabled Tracking
        </Text>
      </View>

      {/* Welcome Section */}
      <Animatable.View animation="pulse" delay={300} style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.questionText}>What would you like to do today?</Text>
      </Animatable.View>

      {/* Menu Grid */}
      <Animatable.View animation="pulse" delay={500} style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              <MaterialIcons name={item.icon as any} size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </Animatable.View>

      {/* Real-Time Parking Status Card */}
      <Animatable.View animation="pulse" delay={700}>
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Real-Time Parking Status</Text>
              <View style={styles.connectionBadge}>
                <MaterialIcons 
                  name={getConnectionStatusIcon() as any} 
                  size={14} 
                  color="#FFFFFF" 
                  style={styles.connectionIcon}
                />
                <Badge style={[styles.liveBadge, { backgroundColor: getConnectionStatusColor() }]}>
                  {getConnectionStatusText()}
                </Badge>
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <Animatable.View 
                style={styles.statusItem}
                animation={parkingData.isLive ? "pulse" : undefined}
                iterationCount="infinite"
                duration={2000}
              >
                <Text style={styles.statusNumber}>{parkingData.availableSpots}</Text>
                <Text style={styles.statusLabel}>Available</Text>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              </Animatable.View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{parkingData.occupiedSpots}</Text>
                <Text style={styles.statusLabel}>Occupied</Text>
                <MaterialIcons name="directions-car" size={16} color="#F44336" />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{parkingData.totalSpots}</Text>
                <Text style={styles.statusLabel}>Total Spots</Text>
                <MaterialIcons name="apps" size={16} color="#2196F3" />
              </View>
            </View>

            <View style={styles.updateContainer}>
              <MaterialIcons 
                name={parkingData.isLive ? "schedule" : "cloud-off"} 
                size={16} 
                color={parkingData.isLive ? "#4CAF50" : "#FF9800"} 
              />
              <Text style={[
                styles.lastUpdated,
                { color: parkingData.isLive ? "#4CAF50" : "#FF9800" }
              ]}>
                {parkingData.isLive 
                  ? `Live update: ${parkingData.lastUpdated}`
                  : `Last update: ${parkingData.lastUpdated}`
                }
              </Text>
            </View>

            {/* Real-time indicator */}
            {parkingData.isLive && (
              <View style={styles.realTimeIndicator}>
                <Animatable.View
                  animation="pulse"
                  iterationCount="infinite"
                  duration={1000}
                  style={styles.pulsingDot}
                />
                <Text style={styles.realTimeText}>Updates every 5 seconds</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Floor Status with Real-time Updates */}
      <Animatable.View animation="pulse" delay={900}>
        <View style={styles.floorHeader}>
          <Text style={styles.sectionTitle}>Live Floor Status</Text>
          {connectionStatus === 'connected' && (
            <Animatable.View
              animation="pulse"
              iterationCount="infinite"
              style={styles.liveIndicator}
            >
              <MaterialIcons name="fiber-manual-record" size={12} color="#4CAF50" />
              <Text style={styles.liveText}>LIVE</Text>
            </Animatable.View>
          )}
        </View>
        
        {parkingData.floors.map((floor, index) => (
          <Animatable.View
            key={floor.floor}
            animation="pulse"
            delay={1000 + (index * 100)}
          >
            <TouchableOpacity
              style={styles.floorCard}
              onPress={() => navigation.navigate('ParkingMap', { floor: floor.floor })}
            >
              <View style={styles.floorInfo}>
                <View style={styles.floorTitleRow}>
                  <Text style={styles.floorTitle}>
                    {floor.floor === 1 ? '1st' : floor.floor === 2 ? '2nd' : '3rd'} Floor
                  </Text>
                  <View style={[
                    styles.floorStatusBadge,
                    { backgroundColor: floor.status === 'available' ? '#4CAF50' : 
                                      floor.status === 'limited' ? '#FF9800' : '#F44336' }
                  ]}>
                    <Text style={styles.floorStatusText}>
                      {floor.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.floorSubtitle}>
                  {floor.available} of {floor.total} available ({Math.round(100 - floor.occupancyRate)}% free)
                </Text>
                <View style={styles.floorProgress}>
                  <Animatable.View 
                    style={[
                      styles.floorProgressBar, 
                      { 
                        width: `${100 - floor.occupancyRate}%`,
                        backgroundColor: floor.status === 'available' ? '#4CAF50' : 
                                        floor.status === 'limited' ? '#FF9800' : '#F44336'
                      }
                    ]}
                    animation={parkingData.isLive ? "slideInLeft" : undefined}
                    duration={500}
                  />
                </View>
              </View>
              <View style={styles.floorStatus}>
                <Text style={[
                  styles.floorStatusText,
                  { color: floor.available > 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {floor.available > 0 ? `${floor.available} Free` : 'Full'}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color="#999" />
              </View>
            </TouchableOpacity>
          </Animatable.View>
        ))}
      </Animatable.View>

      {/* Quick Actions */}
      <Animatable.View animation="pulse" delay={1300}>
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const availableFloor = parkingData.floors.find(f => f.available > 0);
                  if (availableFloor) {
                    navigation.navigate('ParkingMap', { floor: availableFloor.floor });
                  } else {
                    Alert.alert(
                      'No Available Spots', 
                      'All floors are currently full. You\'ll be notified when spots become available.',
                      [{ text: 'OK' }]
                    );
                  }
                }}
              >
                <MaterialIcons name="search" size={24} color="#B71C1C" />
                <Text style={styles.actionText}>Find Best Spot</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={onRefresh}
              >
                <MaterialIcons name="refresh" size={24} color="#B71C1C" />
                <Text style={styles.actionText}>Force Refresh</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Connection Status Card */}
      {connectionStatus !== 'connected' && (
        <Animatable.View animation="pulse" delay={1500}>
          <Card style={[
            styles.connectionCard,
            { backgroundColor: connectionStatus === 'error' ? '#FFEBEE' : '#FFF3E0' }
          ]}>
            <Card.Content>
              <View style={styles.connectionHeader}>
                <MaterialIcons 
                  name={connectionStatus === 'error' ? 'error' : 'info'} 
                  size={24} 
                  color={connectionStatus === 'error' ? '#F44336' : '#FF9800'} 
                />
                <Text style={[
                  styles.connectionTitle,
                  { color: connectionStatus === 'error' ? '#F44336' : '#FF9800' }
                ]}>
                  {connectionStatus === 'error' ? 'Connection Error' : 'Connecting...'}
                </Text>
              </View>
              <Text style={styles.connectionText}>
                {connectionStatus === 'error' 
                  ? 'Unable to connect to parking sensors. Showing last known data.'
                  : 'Establishing connection to real-time parking data...'
                }
              </Text>
              <TouchableOpacity 
                style={styles.connectionAction}
                onPress={() => navigation.navigate('ApiTest')}
              >
                <Text style={styles.connectionActionText}>Debug Connection</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        </Animatable.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loader: {
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#B71C1C',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  valetText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 16,
    color: '#666',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIcon: {
    marginRight: 5,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  updateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  lastUpdated: {
    fontSize: 12,
    marginLeft: 5,
  },
  realTimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  realTimeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  floorCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  floorInfo: {
    flex: 1,
  },
  floorTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  floorStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  floorStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  floorSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  floorProgress: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 5,
  },
  floorProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  floorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
  },
  actionText: {
    fontSize: 14,
    color: '#B71C1C',
    marginTop: 8,
    fontWeight: '600',
  },
  connectionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  connectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  connectionAction: {
    alignSelf: 'flex-start',
  },
  connectionActionText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default HomeScreen;