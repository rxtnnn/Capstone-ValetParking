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
import { Card, Badge, ProgressBar, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

// Define types locally to avoid import issues
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

type FloorsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Floors'>;

interface Props {
  navigation: FloorsScreenNavigationProp;
}

interface FloorInfo {
  floor: number;
  total: number;
  available: number;
  occupancyRate: number;
  status: 'available' | 'limited' | 'full';
  lastUpdated: string;
}

const FloorsScreen: React.FC<Props> = ({ navigation }) => {
  const [floors, setFloors] = useState<FloorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalStats, setTotalStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
  });

  useEffect(() => {
    loadFloorsData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadFloorsData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadFloorsData = async () => {
    try {
      // Simulate API call - replace with actual API call
      const mockData = getMockFloorsData();
      setFloors(mockData.floors);
      setTotalStats(mockData.totalStats);
    } catch (error) {
      Alert.alert('Error', 'Failed to load floors data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockFloorsData = () => {
    const floors = [
      {
        floor: 1,
        total: 40,
        available: 15,
        occupancyRate: 62.5,
        status: 'available' as const,
        lastUpdated: new Date().toLocaleTimeString(),
      },
      {
        floor: 2,
        total: 40,
        available: 8,
        occupancyRate: 80,
        status: 'limited' as const,
        lastUpdated: new Date().toLocaleTimeString(),
      },
      {
        floor: 3,
        total: 40,
        available: 0,
        occupancyRate: 100,
        status: 'full' as const,
        lastUpdated: new Date().toLocaleTimeString(),
      },
    ];

    const totalStats = {
      total: 120,
      available: 23,
      occupied: 97,
    };

    return { floors, totalStats };
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'limited': return '#FF9800';
      case 'full': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'available': return 'Available';
      case 'limited': return 'Limited';
      case 'full': return 'Full';
      default: return 'Unknown';
    }
  };

  const getFloorName = (floor: number): string => {
    if (floor === 1) return '1st Floor';
    if (floor === 2) return '2nd Floor';
    if (floor === 3) return '3rd Floor';
    return `${floor}th Floor`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFloorsData();
  };

  const handleFloorPress = (floor: FloorInfo) => {
    if (floor.status === 'full') {
      Alert.alert(
        'Floor Full',
        `${getFloorName(floor.floor)} is currently full. Would you like to view it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Anyway', onPress: () => navigation.navigate('ParkingMap', { floor: floor.floor }) },
        ]
      );
    } else {
      navigation.navigate('ParkingMap', { floor: floor.floor });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="local-parking" size={50} color="#B71C1C" />
        <Text style={styles.loadingText}>Loading floors...</Text>
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
      {/* Header Stats */}
      <Animatable.View animation="fadeInDown" delay={200}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statsTitle}>USJ-R Quadricentennial Campus</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalStats.available}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalStats.occupied}</Text>
                <Text style={styles.statLabel}>Occupied</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalStats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.occupancyContainer}>
              <Text style={styles.occupancyLabel}>Overall Occupancy</Text>
              <ProgressBar
                progress={totalStats.occupied / totalStats.total}
                color="#B71C1C"
                style={styles.progressBar}
              />
              <Text style={styles.occupancyText}>
                {Math.round((totalStats.occupied / totalStats.total) * 100)}% Full
              </Text>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Floors List */}
      <View style={styles.floorsContainer}>
        <Text style={styles.sectionTitle}>Select Floor</Text>
        {floors.map((floor, index) => (
          <Animatable.View
            key={floor.floor}
            animation="fadeInUp"
            delay={300 + (index * 100)}
          >
            <TouchableOpacity
              style={styles.floorCard}
              onPress={() => handleFloorPress(floor)}
              activeOpacity={0.7}
            >
              <Card style={[
                styles.floorCardInner,
                floor.status === 'full' && styles.fullFloorCard
              ]}>
                <Card.Content>
                  <View style={styles.floorHeader}>
                    <View style={styles.floorTitleContainer}>
                      <Text style={styles.floorTitle}>{getFloorName(floor.floor)}</Text>
                      <Badge
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(floor.status) }
                        ]}
                      >
                        {getStatusText(floor.status)}
                      </Badge>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={floor.status === 'full' ? '#999' : '#B71C1C'}
                    />
                  </View>

                  <View style={styles.floorStats}>
                    <View style={styles.floorStatItem}>
                      <Text style={styles.floorStatNumber}>{floor.available}</Text>
                      <Text style={styles.floorStatLabel}>Available</Text>
                    </View>
                    <View style={styles.floorStatItem}>
                      <Text style={styles.floorStatNumber}>{floor.total - floor.available}</Text>
                      <Text style={styles.floorStatLabel}>Occupied</Text>
                    </View>
                    <View style={styles.floorStatItem}>
                      <Text style={styles.floorStatNumber}>{floor.total}</Text>
                      <Text style={styles.floorStatLabel}>Total</Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <ProgressBar
                      progress={floor.occupancyRate / 100}
                      color={getStatusColor(floor.status)}
                      style={styles.floorProgress}
                    />
                    <Text style={styles.occupancyPercentage}>
                      {Math.round(floor.occupancyRate)}% Full
                    </Text>
                  </View>

                  <Text style={styles.lastUpdated}>
                    Last updated: {floor.lastUpdated}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          </Animatable.View>
        ))}
      </View>

      {/* Quick Actions */}
      <Animatable.View animation="fadeInUp" delay={800}>
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const availableFloor = floors.find(f => f.status === 'available');
                  if (availableFloor) {
                    navigation.navigate('ParkingMap', { floor: availableFloor.floor });
                  } else {
                    Alert.alert('No Available Floors', 'All floors are currently full or have limited availability.');
                  }
                }}
              >
                <MaterialIcons name="search" size={24} color="#B71C1C" />
                <Text style={styles.actionText}>Find Best Floor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <MaterialIcons name="notifications" size={24} color="#B71C1C" />
                <Text style={styles.actionText}>Notification Settings</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Legend */}
      <Animatable.View animation="fadeInUp" delay={1000}>
        <Card style={styles.legendCard}>
          <Card.Content>
            <Text style={styles.legendTitle}>Status Legend</Text>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>Available (20%+ spots free)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.legendText}>Limited (1-20% spots free)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#F44336' }]} />
                <Text style={styles.legendText}>Full (0% spots free)</Text>
              </View>
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
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  statsCard: {
    margin: 20,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  occupancyContainer: {
    alignItems: 'center',
  },
  occupancyLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
    marginBottom: 10,
  },
  occupancyText: {
    fontSize: 14,
    color: '#666',
  },
  floorsContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  floorCard: {
    marginBottom: 15,
  },
  floorCardInner: {
    elevation: 3,
  },
  fullFloorCard: {
    opacity: 0.7,
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  floorTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  floorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  floorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  floorStatItem: {
    alignItems: 'center',
  },
  floorStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  floorStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 10,
  },
  floorProgress: {
    height: 6,
    marginBottom: 8,
  },
  occupancyPercentage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
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
  legendCard: {
    margin: 20,
    marginTop: 0,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  legendContainer: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
});

export default FloorsScreen;