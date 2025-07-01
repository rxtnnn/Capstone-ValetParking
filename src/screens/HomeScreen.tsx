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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Badge } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

import { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

interface ParkingSpace {
  id: number;
  sensor_id: number;
  is_occupied: boolean;
  distance_cm: number;
  timestamp: string;
  location: string;
}

interface ParkingStats {
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  floors: Array<{
    floor: number;
    total: number;
    available: number;
  }>;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [parkingData, setParkingData] = useState<ParkingStats>({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    floors: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadParkingData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadParkingData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadParkingData = async () => {
    try {
      console.log('Loading parking data...');
      
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

      const rawData: ParkingSpace[] = await response.json();
      console.log('Received parking data:', rawData);
      
      // Transform the data
      const stats = transformParkingData(rawData);
      setParkingData(stats);
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.error('Error loading parking data:', error);
      Alert.alert('Connection Error', 'Unable to load parking data. Please check your internet connection.');
      
      // Use mock data for development
      setParkingData({
        totalSpots: 120,
        availableSpots: 45,
        occupiedSpots: 75,
        floors: [
          { floor: 1, total: 40, available: 15 },
          { floor: 2, total: 40, available: 18 },
          { floor: 3, total: 40, available: 12 },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const transformParkingData = (rawData: ParkingSpace[]): ParkingStats => {
    const totalSpots = rawData.length;
    const availableSpots = rawData.filter(space => !space.is_occupied).length;
    const occupiedSpots = totalSpots - availableSpots;

    // Group by floor based on location or sensor_id
    const floorGroups: { [key: number]: ParkingSpace[] } = {};
    
    rawData.forEach(space => {
      let floor = 1; // Default floor
      
      // Try to extract floor from location
      if (space.location) {
        const floorMatch = space.location.match(/floor\s*(\d+)/i) || 
                          space.location.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i);
        if (floorMatch) {
          floor = parseInt(floorMatch[1]);
        }
      } else {
        // Estimate floor based on sensor_id (assuming 40 sensors per floor)
        floor = Math.ceil(space.sensor_id / 40);
        floor = Math.max(1, Math.min(3, floor)); // Limit to floors 1-3
      }
      
      if (!floorGroups[floor]) {
        floorGroups[floor] = [];
      }
      floorGroups[floor].push(space);
    });

    // Create floors array
    const floors = Object.entries(floorGroups).map(([floorNum, spaces]) => ({
      floor: parseInt(floorNum),
      total: spaces.length,
      available: spaces.filter(s => !s.is_occupied).length,
    })).sort((a, b) => a.floor - b.floor);

    return {
      totalSpots,
      availableSpots,
      occupiedSpots,
      floors,
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadParkingData();
  };

  const menuItems = [
    {
      title: 'Find Parking',
      icon: 'local-parking',
      onPress: () => navigation.navigate('Floors'),
      color: '#B71C1C',
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
      color: '#B71C1C',
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
          <Icon name="local-parking" size={50} color="#B71C1C" />
          <Text style={styles.loadingText}>Loading VALET...</Text>
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
      <Animatable.View animation="fadeInUp" delay={300} style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.questionText}>What would you like to do today?</Text>
      </Animatable.View>

      {/* Menu Grid */}
      <Animatable.View animation="fadeInUp" delay={500} style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              <Icon name={item.icon} size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </Animatable.View>

      {/* Live Parking Status Card */}
      <Animatable.View animation="fadeInUp" delay={700}>
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Live Parking Status</Text>
              <Badge style={styles.liveBadge}>LIVE</Badge>
            </View>
            
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{parkingData.availableSpots}</Text>
                <Text style={styles.statusLabel}>Available</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{parkingData.occupiedSpots}</Text>
                <Text style={styles.statusLabel}>Occupied</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{parkingData.totalSpots}</Text>
                <Text style={styles.statusLabel}>Total Spots</Text>
              </View>
            </View>

            {lastUpdated && (
              <Text style={styles.lastUpdated}>
                Last updated: {lastUpdated}
              </Text>
            )}
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Floor Status */}
      <Animatable.View animation="fadeInUp" delay={900}>
        <Text style={styles.sectionTitle}>Floor Status</Text>
        {parkingData.floors.map((floor, index) => (
          <TouchableOpacity
            key={index}
            style={styles.floorCard}
            onPress={() => navigation.navigate('ParkingMap', { floor: floor.floor })}
          >
            <View style={styles.floorInfo}>
              <Text style={styles.floorTitle}>
                {floor.floor === 1 ? '1st' : floor.floor === 2 ? '2nd' : '3rd'} Floor
              </Text>
              <Text style={styles.floorSubtitle}>
                {floor.available} of {floor.total} available
              </Text>
            </View>
            <View style={styles.floorStatus}>
              <Text style={[
                styles.floorStatusText,
                { color: floor.available > 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {floor.available > 0 ? 'Available' : 'Full'}
              </Text>
              <Icon name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>
        ))}
      </Animatable.View>

      {/* Quick Actions */}
      <Animatable.View animation="fadeInUp" delay={1100}>
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
                    Alert.alert('No Available Spots', 'All floors are currently full.');
                  }
                }}
              >
                <Icon name="search" size={24} color="#B71C1C" />
                <Text style={styles.actionText}>Find Best Spot</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={onRefresh}
              >
                <Icon name="refresh" size={24} color="#B71C1C" />
                <Text style={styles.actionText}>Refresh Data</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>
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
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.9,
  },
  welcomeSection: {
    backgroundColor: '#B71C1C',
    padding: 20,
    paddingTop: 0,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 18,
    opacity: 0.9,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  statusCard: {
    margin: 20,
    marginTop: 0,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  liveBadge: {
    backgroundColor: '#4CAF50',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  floorCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  floorInfo: {
    flex: 1,
  },
  floorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  floorSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  floorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floorStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  actionsCard: {
    margin: 20,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#B71C1C',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default HomeScreen;