import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Card, Button, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

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

type ParkingMapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ParkingMap'>;
type ParkingMapScreenRouteProp = RouteProp<RootStackParamList, 'ParkingMap'>;

interface Props {
  navigation: ParkingMapScreenNavigationProp;
  route: ParkingMapScreenRouteProp;
}

interface ParkingSpot {
  id: string;
  position: { x: number; y: number };
  isOccupied: boolean;
  isReserved: boolean;
  spotNumber: string;
  sensorId: number;
  distanceCm?: number;
  lastUpdated: string;
}

interface FloorData {
  floor: number;
  spots: ParkingSpot[];
  availableCount: number;
  totalCount: number;
}

const { width: screenWidth } = Dimensions.get('window');

const ParkingMapScreen: React.FC<Props> = ({ navigation, route }) => {
  const { floor } = route.params;
  const [floorData, setFloorData] = useState<FloorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

  useEffect(() => {
    loadFloorData();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      // Randomly update a few spots
      if (floorData) {
        const updatedSpots = floorData.spots.map(spot => {
          if (Math.random() > 0.95) { // 5% chance to change
            return {
              ...spot,
              isOccupied: Math.random() > 0.6,
              lastUpdated: new Date().toLocaleTimeString(),
            };
          }
          return spot;
        });
        
        setFloorData({
          ...floorData,
          spots: updatedSpots,
          availableCount: updatedSpots.filter(s => !s.isOccupied && !s.isReserved).length,
        });
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [floor]);

  const loadFloorData = async () => {
    try {
      // Simulate API call
      const mockData = generateMockFloorData(floor);
      setFloorData(mockData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load floor data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockFloorData = (targetFloor: number): FloorData => {
    const spots: ParkingSpot[] = [];
    const totalSpots = 20; // Reduced for better visualization
    
    for (let i = 1; i <= totalSpots; i++) {
      const row = Math.floor((i - 1) / 4);
      const col = (i - 1) % 4;
      
      spots.push({
        id: `${targetFloor}-${i}`,
        position: {
          x: 30 + (col * 80),
          y: 50 + (row * 100),
        },
        isOccupied: Math.random() > 0.6,
        isReserved: Math.random() > 0.9,
        spotNumber: `${i <= 10 ? 'A' : 'B'}${((i - 1) % 10) + 1}`,
        sensorId: ((targetFloor - 1) * 20) + i,
        distanceCm: Math.floor(Math.random() * 200) + 50,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    }

    const availableCount = spots.filter(spot => !spot.isOccupied && !spot.isReserved).length;

    return {
      floor: targetFloor,
      spots,
      availableCount,
      totalCount: totalSpots,
    };
  };

  const handleSpotPress = (spot: ParkingSpot) => {
    if (spot.isOccupied) {
      Alert.alert('Occupied', 'This parking spot is currently occupied.');
      return;
    }
    
    if (spot.isReserved) {
      Alert.alert('Reserved', 'This parking spot is reserved.');
      return;
    }

    setSelectedSpot(spot);
    Alert.alert(
      'Available Spot',
      `Spot ${spot.spotNumber} is available.\nSensor ID: ${spot.sensorId}\nDistance: ${spot.distanceCm}cm\nWould you like to get directions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Get Directions', onPress: () => handleGetDirections(spot) },
      ]
    );
  };

  const handleGetDirections = (spot: ParkingSpot) => {
    Alert.alert('Directions', `🚗 Navigate to spot ${spot.spotNumber}\n📍 Turn right from elevator\n🚶‍♂️ Walk 20 meters\n✅ You'll find spot ${spot.spotNumber} on your left`);
  };

  const renderParkingSpot = (spot: ParkingSpot, index: number) => {
    const spotColor = spot.isOccupied 
      ? '#F44336' 
      : spot.isReserved 
      ? '#FF9800' 
      : '#4CAF50';

    return (
      <Animatable.View
        key={spot.id}
        animation="fadeIn"
        delay={index * 50}
        style={[
          styles.parkingSpot,
          {
            backgroundColor: spotColor,
            left: spot.position.x,
            top: spot.position.y,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.spotTouchable}
          onPress={() => handleSpotPress(spot)}
          disabled={spot.isOccupied}
        >
          <Text style={styles.spotText}>{spot.spotNumber}</Text>
          {spot.isOccupied && (
            <MaterialIcons name="directions-car" size={12} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="map" size={50} color="#B71C1C" />
        <Text style={styles.loadingText}>Loading floor {floor}...</Text>
      </View>
    );
  }

  if (!floorData) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={50} color="#F44336" />
        <Text style={styles.errorText}>Failed to load floor data</Text>
        <Button mode="contained" onPress={loadFloorData} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statusText}>Available</Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusIndicator, { backgroundColor: '#F44336' }]} />
          <Text style={styles.statusText}>Occupied</Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusIndicator, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.statusText}>Reserved</Text>
        </View>
      </View>

      {/* Floor Map */}
      <View style={styles.floorContainer}>
        <View style={styles.floorLayout}>
          {/* Parking Structure */}
          <View style={styles.parkingStructure}>
            {/* Section Labels */}
            <View style={styles.sectionA}>
              <Text style={styles.sectionLabel}>A</Text>
            </View>
            <View style={styles.sectionB}>
              <Text style={styles.sectionLabel}>B</Text>
            </View>
            
            {/* Driveway */}
            <View style={styles.driveway}>
              <Text style={styles.drivewayText}>DRIVE WAY</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFA726" />
            </View>
            
            {/* Render parking spots */}
            {floorData.spots.map((spot, index) => renderParkingSpot(spot, index))}
          </View>
        </View>

        {/* Campus Info */}
        <Card style={styles.campusInfo}>
          <Card.Content>
            <View style={styles.campusHeader}>
              <Text style={styles.campusTitle}>USJ-R Quadricentennial Campus</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.campusDetails}>
              <View style={styles.campusRow}>
                <Text style={styles.campusLabel}>Floor</Text>
                <Text style={styles.campusValue}>Available Spots</Text>
              </View>
              <View style={styles.campusRow}>
                <Text style={styles.floorNumber}>{floor}</Text>
                <Text style={styles.availableSpots}>{floorData.availableCount}</Text>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Floors')}
                style={styles.viewLevelsButton}
              >
                View Levels
              </Button>
              <Button
                mode="contained"
                onPress={() => Alert.alert('Navigation', 'Starting navigation to this floor...')}
                style={styles.nextButton}
                buttonColor="#FFFFFF"
                textColor="#B71C1C"
              >
                Navigate
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Stats */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text style={styles.statsTitle}>Floor {floor} Live Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{floorData.availableCount}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{floorData.totalCount - floorData.availableCount}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{floorData.totalCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Math.round((floorData.availableCount / floorData.totalCount) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Free</Text>
            </View>
          </View>
          <View style={styles.updateInfo}>
            <MaterialIcons name="update" size={16} color="#666" />
            <Text style={styles.updateText}>Updates every 10 seconds</Text>
          </View>
        </Card.Content>
      </Card>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  floorContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 4,
  },
  floorLayout: {
    height: 500,
    backgroundColor: '#424242',
    position: 'relative',
  },
  parkingStructure: {
    flex: 1,
    position: 'relative',
  },
  sectionA: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  sectionB: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  driveway: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -15 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  drivewayText: {
    color: '#FFA726',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
  },
  parkingSpot: {
    position: 'absolute',
    width: 35,
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  spotTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  campusInfo: {
    backgroundColor: '#B71C1C',
    borderRadius: 0,
  },
  campusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  campusTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  campusDetails: {
    marginBottom: 15,
  },
  campusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  campusLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  campusValue: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  floorNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  availableSpots: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  viewLevelsButton: {
    flex: 1,
    borderColor: '#FFFFFF',
  },
  nextButton: {
    flex: 1,
  },
  statsCard: {
    margin: 20,
    marginTop: 0,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B71C1C',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  updateInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  updateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    fontStyle: 'italic',
  },
});

export default ParkingMapScreen;