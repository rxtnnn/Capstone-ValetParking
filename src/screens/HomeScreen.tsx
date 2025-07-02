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

// Simple Circular Progress Component
const CircularProgress: React.FC<{
  value: number;
  total: number;
  color: string;
  label: string;
}> = ({ value, total, color, label }) => {
  return (
    <View style={styles.circularProgressContainer}>
      <View style={[styles.circularProgressCircle, { borderColor: color }]}>
        <Text style={[styles.circularProgressValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.circularProgressLabel}>{label}</Text>
    </View>
  );
};

// Progress Bar Component
const ProgressBar: React.FC<{
  available: number;
  total: number;
  color: string;
}> = ({ available, total, color }) => {
  const percentage = total > 0 ? ((total - available) / total) * 100 : 0;
  
  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View 
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: color }
          ]}
        />
      </View>
      <Text style={styles.progressBarText}>
        {percentage === 100 ? '100% Full' : `${Math.round(100 - percentage)}% Full`}
      </Text>
    </View>
  );
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [parkingData, setParkingData] = useState<ParkingStats>({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    floors: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      
    } catch (error) {
      console.error('Error loading parking data:', error);
      Alert.alert('Connection Error', 'Unable to load parking data. Please check your internet connection.');
      
      // Use mock data for development
      setParkingData({
        totalSpots: 120,
        availableSpots: 55,
        occupiedSpots: 65,
        floors: [
          { floor: 1, total: 40, available: 15 },
          { floor: 2, total: 40, available: 5 },
          { floor: 3, total: 40, available: 0 },
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

  const getFloorStatusColor = (available: number, total: number) => {
    const percentage = available / total;
    if (percentage > 0.5) return '#4CAF50'; // Green
    if (percentage > 0.2) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getFloorStatusText = (available: number) => {
    if (available > 10) return 'Available';
    if (available > 0) return 'Limited';
    return 'Full';
  };

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
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>V</Text>
            </View>
            <Text style={styles.valetText}>VALET</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Icon name="notifications" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>Your Virtual Parking Buddy</Text>
      </View>

      {/* Campus Overview Card */}
      <Animatable.View animation="fadeInUp" delay={300}>
        <Card style={styles.campusCard}>
          <Card.Content>
            <Text style={styles.campusTitle}>USJ-R Quadricentennial Campus</Text>
            
            <View style={styles.circularProgressRow}>
              <CircularProgress
                value={parkingData.availableSpots}
                total={parkingData.totalSpots}
                color="#4CAF50"
                label="Available"
              />
              <CircularProgress
                value={parkingData.occupiedSpots}
                total={parkingData.totalSpots}
                color="#F44336"
                label="Occupied"
              />
              <CircularProgress
                value={parkingData.totalSpots}
                total={parkingData.totalSpots}
                color="#2196F3"
                label="Total Spots"
              />
            </View>
            
            <View style={styles.liveBadgeContainer}>
              <Badge style={styles.liveBadge}>LIVE</Badge>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Select Floor Section */}
      <Animatable.View animation="fadeInUp" delay={500}>
        <View style={styles.floorSection}>
          <View style={styles.floorSectionHeader}>
            <Text style={styles.floorSectionTitle}>Select Floor</Text>
            <Badge style={styles.liveBadge}>LIVE</Badge>
          </View>

          {parkingData.floors.map((floor, index) => {
            const statusColor = getFloorStatusColor(floor.available, floor.total);
            const statusText = getFloorStatusText(floor.available);
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.floorCard}
                onPress={() => navigation.navigate('ParkingMap', { floor: floor.floor })}
              >
                <View style={styles.floorCardHeader}>
                  <Text style={styles.floorTitle}>
                    {floor.floor === 1 ? '1st' : floor.floor === 2 ? '2nd' : '3rd'} Floor
                  </Text>
                  <View style={styles.floorStatusContainer}>
                    <Badge style={[styles.floorStatusBadge, { backgroundColor: statusColor }]}>
                      {statusText}
                    </Badge>
                    <Icon name="chevron-right" size={24} color="#999" />
                  </View>
                </View>

                <View style={styles.floorStats}>
                  <View style={styles.floorStat}>
                    <Text style={[styles.floorStatNumber, { color: '#4CAF50' }]}>
                      {floor.available}
                    </Text>
                    <Text style={styles.floorStatLabel}>Available</Text>
                  </View>
                  <View style={styles.floorStat}>
                    <Text style={[styles.floorStatNumber, { color: '#F44336' }]}>
                      {floor.total - floor.available}
                    </Text>
                    <Text style={styles.floorStatLabel}>Occupied</Text>
                  </View>
                  <View style={styles.floorStat}>
                    <Text style={[styles.floorStatNumber, { color: '#2196F3' }]}>
                      {floor.total}
                    </Text>
                    <Text style={styles.floorStatLabel}>Total Spots</Text>
                  </View>
                </View>

                <ProgressBar
                  available={floor.available}
                  total={floor.total}
                  color={statusColor}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </Animatable.View>

      {/* Bottom Navigation Placeholder */}
      <View style={styles.bottomNavPlaceholder} />
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  valetText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 15,
    padding: 5,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  campusCard: {
    margin: 20,
    elevation: 4,
    borderRadius: 15,
  },
  campusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  circularProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  circularProgressContainer: {
    alignItems: 'center',
  },
  circularProgressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  circularProgressValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  circularProgressLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  liveBadgeContainer: {
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
  },
  floorSection: {
    margin: 20,
    marginTop: 0,
  },
  floorSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  floorSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  floorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
  },
  floorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  floorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  floorStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floorStatusBadge: {
    marginRight: 10,
    color: '#FFFFFF',
  },
  floorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  floorStat: {
    alignItems: 'center',
  },
  floorStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  floorStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  bottomNavPlaceholder: {
    height: 80,
  },
});

export default HomeScreen;