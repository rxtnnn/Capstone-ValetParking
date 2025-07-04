import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  StyleSheet,
  Modal,
  StatusBar,
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

const { width: screenWidth } = Dimensions.get('window');

interface ParkingSpot {
  id: string;
  isAvailable: boolean;
  section: string;
  sensorId?: number;
}

interface SectionStats {
  section: string;
  available: number;
  total: number;
  status: 'AVAILABLE' | 'LIMITED' | 'FULL';
}

interface NavigationPath {
  from: { x: number; y: number };
  to: { x: number; y: number };
  waypoints: Array<{ x: number; y: number; direction: string }>;
}

const ParkingMapScreen: React.FC = () => {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const navigation = useNavigation();
  const route = useRoute();
  const { floor = 1 } = (route.params as { floor?: number }) || {};
  
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showParkingAlert, setShowParkingAlert] = useState(false);
  const [showNavigationPath, setShowNavigationPath] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [parkingData, setParkingData] = useState<Record<string, ParkingSpot>>({});
  const [sectionStats, setSectionStats] = useState<SectionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  if (!fontsLoaded) return null;

  // Complete spot layout mapping (matches the exact image layout)
  const spotLayout = {
    A: ['A1', 'A2', 'A3', 'A4', 'A5'], // Top right corner + middle row
    B: ['B1', 'B2', 'B3', 'B4'], // Top row
    C: ['C1', 'C2'], // Top left vertical spots
    D: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], // Main horizontal rows
    E: ['E1', 'E2', 'E3'], // Left vertical section
    F: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'], // Bottom horizontal sections
    G: ['G1', 'G2', 'G3', 'G4', 'G5'], // Right vertical section
    H: ['H1', 'H2', 'H3'], // Bottom right corner
    I: ['I1', 'I2', 'I3', 'I4', 'I5'] // Far right vertical section
  };

  // Exact spot positions based on the image layout
  const spotPositions: Record<string, { x: number; y: number }> = {
    // Top row B section (left to right: B4, B3, B2, B1)
    'B4': { x: screenWidth * 0.55, y: 40 },
    'B3': { x: screenWidth * 0.63, y: 40 },
    'B2': { x: screenWidth * 0.71, y: 40 },
    'B1': { x: screenWidth * 0.79, y: 40 },

    // Top right corner A spot
    'A1': { x: screenWidth * 0.90, y: 95 },

    // Top left vertical C spots
    'C2': { x: screenWidth * 0.50, y: 95 },
    'C1': { x: screenWidth * 0.50, y: 130 },

    // Main D section - left group (D7, D6, D5, D4)
    'D7': { x: screenWidth * 0.13, y: 200 },
    'D6': { x: screenWidth * 0.20, y: 200 },
    'D5': { x: screenWidth * 0.27, y: 200 },
    'D4': { x: screenWidth * 0.34, y: 200 },

    // Main D section - right group (D3, D2, D1)
    'D3': { x: screenWidth * 0.48, y: 200 },
    'D2': { x: screenWidth * 0.55, y: 200 },
    'D1': { x: screenWidth * 0.62, y: 200 },

    // Left vertical E section
    'E1': { x: screenWidth * 0.08, y: 290 },
    'E2': { x: screenWidth * 0.08, y: 325 },
    'E3': { x: screenWidth * 0.08, y: 360 },

    // Middle A section horizontal row (A5, A4, A3, A2, A1)
    'A5': { x: screenWidth * 0.22, y: 310 },
    'A4': { x: screenWidth * 0.29, y: 310 },
    'A3': { x: screenWidth * 0.36, y: 310 },
    'A2': { x: screenWidth * 0.43, y: 310 },

    // Bottom F sections
    // F1, F2 (left group)
    'F1': { x: screenWidth * 0.13, y: 450 },
    'F2': { x: screenWidth * 0.20, y: 450 },

    // F3, F4, F5 (middle group)
    'F3': { x: screenWidth * 0.30, y: 450 },
    'F4': { x: screenWidth * 0.37, y: 450 },
    'F5': { x: screenWidth * 0.44, y: 450 },

    // F6, F7 (right group)
    'F6': { x: screenWidth * 0.54, y: 450 },
    'F7': { x: screenWidth * 0.61, y: 450 },

    // Right vertical G section (G1, G2, G3, G4, G5)
    'G1': { x: screenWidth * 0.75, y: 480 },
    'G2': { x: screenWidth * 0.75, y: 515 },
    'G3': { x: screenWidth * 0.75, y: 550 },
    'G4': { x: screenWidth * 0.75, y: 585 },
    'G5': { x: screenWidth * 0.75, y: 620 },

    // Far right vertical I section (I5, I4, I3, I2, I1)
    'I5': { x: screenWidth * 0.90, y: 480 },
    'I4': { x: screenWidth * 0.90, y: 515 },
    'I3': { x: screenWidth * 0.90, y: 550 },
    'I2': { x: screenWidth * 0.90, y: 585 },
    'I1': { x: screenWidth * 0.90, y: 620 },

    // Bottom right corner H section (H1, H2, H3)
    'H1': { x: screenWidth * 0.60, y: 680 },
    'H2': { x: screenWidth * 0.70, y: 680 },
    'H3': { x: screenWidth * 0.80, y: 680 },
  };

  // Static elements positions
  const staticElements = {
    motorcycleParking: { x: screenWidth * 0.02, y: 40, label: 'MOTORCYCLE\nPARKING' },
    stairs: { x: screenWidth * 0.02, y: 200, rotation: 90, label: 'STAIRS' },
    mainElevator: { x: screenWidth * 0.72, y: 200, label: 'Elevator' },
    entrance: { x: screenWidth * 0.72, y: 240, label: 'Entrance' },
    youAreHere: { x: screenWidth * 0.85, y: 200, label: 'You are here' },
    bottomElevator: { x: screenWidth * 0.72, y: 450, label: 'Elevator' },
    rightElevator: { x: screenWidth * 0.97, y: 380, rotation: 90, label: 'Elevator' },
    exit: { x: screenWidth * 0.85, y: 310, label: 'EXIT' }
  };

  // Directional arrows positions
  const arrows = [
    // Top arrows under B section
    { x: screenWidth * 0.59, y: 80, direction: '←' },
    { x: screenWidth * 0.75, y: 80, direction: '←' },

    // Right side up arrow
    { x: screenWidth * 0.90, y: 135, direction: '↑' },

    // Vertical arrow between C spots
    { x: screenWidth * 0.50, y: 115, direction: '↓' },

    // Main D section arrows
    { x: screenWidth * 0.15, y: 240, direction: '←' },
    { x: screenWidth * 0.22, y: 240, direction: '←' },
    { x: screenWidth * 0.50, y: 240, direction: '←' },
    { x: screenWidth * 0.57, y: 240, direction: '←' },

    // Center vertical arrows
    { x: screenWidth * 0.72, y: 270, direction: '↓' },
    { x: screenWidth * 0.72, y: 320, direction: '↓' },

    // Left E section arrows
    { x: screenWidth * 0.08, y: 305, direction: '↓' },

    // Bottom horizontal arrows (under A middle section)
    { x: screenWidth * 0.15, y: 350, direction: '→' },
    { x: screenWidth * 0.22, y: 350, direction: '→' },
    { x: screenWidth * 0.29, y: 350, direction: '→' },
    { x: screenWidth * 0.36, y: 350, direction: '→' },
    { x: screenWidth * 0.43, y: 350, direction: '→' },

    // Right side up arrows for EXIT
    { x: screenWidth * 0.85, y: 350, direction: '↑' },

    // Bottom elevator arrow
    { x: screenWidth * 0.72, y: 490, direction: '↓' },

    // Right G section arrows
    { x: screenWidth * 0.75, y: 495, direction: '↓' },
    { x: screenWidth * 0.75, y: 530, direction: '↓' },
    { x: screenWidth * 0.75, y: 565, direction: '↓' },
    { x: screenWidth * 0.75, y: 600, direction: '↓' },

    // Far right I section arrows
    { x: screenWidth * 0.90, y: 495, direction: '↑' },
    { x: screenWidth * 0.90, y: 530, direction: '↑' },
    { x: screenWidth * 0.90, y: 565, direction: '↑' },
    { x: screenWidth * 0.90, y: 600, direction: '↑' },

    // Bottom right arrow
    { x: screenWidth * 0.55, y: 680, direction: '→' },
  ];

  // Entrance position
  const entrancePosition = { x: screenWidth * 0.50, y: 750 };

  // Fetch real-time parking data
  const fetchParkingData = async () => {
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
      console.log('Fetched parking data:', rawData);
      
      // Transform API data to our spot format
      const transformedData = transformApiData(rawData);
      setParkingData(transformedData);
      updateSectionStats(transformedData);
      setIsLive(true);
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.error('Error fetching parking data:', error);
      setIsLive(false);
      // Use mock data as fallback
      const mockData = generateMockData();
      setParkingData(mockData);
      updateSectionStats(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Transform API data to match our spot IDs
  const transformApiData = (apiData: any[]): Record<string, ParkingSpot> => {
    const spots: Record<string, ParkingSpot> = {};
    
    // Initialize all spots as available first
    Object.values(spotLayout).flat().forEach((spotId, index) => {
      spots[spotId] = {
        id: spotId,
        isAvailable: true,
        section: spotId.charAt(0),
        sensorId: index + 1
      };
    });

    // Map API data to our spots
    apiData.forEach((apiSpot, index) => {
      const spotId = Object.values(spotLayout).flat()[index % Object.values(spotLayout).flat().length];
      if (spotId) {
        spots[spotId] = {
          id: spotId,
          isAvailable: !apiSpot.is_occupied,
          section: spotId.charAt(0),
          sensorId: apiSpot.sensor_id
        };
      }
    });

    return spots;
  };

  // Generate mock data for fallback
  const generateMockData = (): Record<string, ParkingSpot> => {
    const spots: Record<string, ParkingSpot> = {};
    const occupiedSpots = ['D3', 'D6', 'E2', 'F5', 'G2', 'I3', 'B2', 'H1', 'A3']; // Some occupied spots
    
    Object.values(spotLayout).flat().forEach(spotId => {
      spots[spotId] = {
        id: spotId,
        isAvailable: !occupiedSpots.includes(spotId),
        section: spotId.charAt(0)
      };
    });
    
    return spots;
  };

  // Update section statistics
  const updateSectionStats = (spots: Record<string, ParkingSpot>) => {
    const stats: SectionStats[] = [];
    
    ['A', 'B', 'C', 'D'].forEach(section => {
      const sectionSpots = Object.values(spots).filter(spot => spot.section === section);
      const available = sectionSpots.filter(spot => spot.isAvailable).length;
      const total = sectionSpots.length;
      
      let status: 'AVAILABLE' | 'LIMITED' | 'FULL' = 'AVAILABLE';
      if (available === 0) {
        status = 'FULL';
      } else if (available / total < 0.3) {
        status = 'LIMITED';
      }
      
      stats.push({
        section,
        available,
        total,
        status
      });
    });
    
    setSectionStats(stats);
  };

  // Generate navigation path from entrance to selected spot
  const generateNavigationPath = (targetSpotId: string): NavigationPath => {
    const target = spotPositions[targetSpotId];
    const entrance = entrancePosition;
    
    // Simple pathfinding
    const waypoints: Array<{ x: number; y: number; direction: string }> = [];
    
    // Basic path from entrance to target
    if (target.y < 300) {
      // Going to upper sections (A, B, C, D)
      waypoints.push(
        { x: entrance.x, y: entrance.y - 100, direction: '↑' },
        { x: entrance.x, y: entrance.y - 200, direction: '↑' },
        { x: target.x, y: target.y + 30, direction: target.x > entrance.x ? '→' : '←' },
        { x: target.x, y: target.y, direction: '↑' }
      );
    } else {
      // Going to bottom sections (F, G, H, I)
      waypoints.push(
        { x: entrance.x, y: entrance.y - 50, direction: '↑' },
        { x: target.x, y: entrance.y - 50, direction: target.x > entrance.x ? '→' : '←' },
        { x: target.x, y: target.y, direction: '↓' }
      );
    }
    
    return {
      from: entrance,
      to: target,
      waypoints
    };
  };

  useEffect(() => {
    fetchParkingData();
    
    // Set up real-time updates every 10 seconds
    const interval = setInterval(fetchParkingData, 10000);
    return () => clearInterval(interval);
  }, []);

  const ParkingSpotComponent: React.FC<{
    id: string;
    position: { x: number; y: number };
    available: boolean;
    selected: boolean;
    onPress: (id: string) => void;
  }> = ({ id, position, available, selected, onPress }) => {
    const isHighlighted = selected && selectedSection && parkingData[id]?.section === selectedSection;
    const isNavigationTarget = navigationTarget === id;
    
    return (
      <TouchableOpacity
        onPress={() => onPress(id)}
        style={[
          styles.parkingSpot,
          {
            left: position.x - 16, // Center the spot
            top: position.y - 12,
          },
          isNavigationTarget ? styles.targetSpot :
          isHighlighted ? styles.highlightedSpot : 
          available ? styles.availableSpot : styles.occupiedSpot
        ]}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.spotText,
          !available && styles.occupiedSpotText
        ]}>{id}</Text>
        {isNavigationTarget && (
          <View style={styles.targetIndicator}>
            <Text style={styles.targetArrow}>→</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const StaticElement: React.FC<{
    children: React.ReactNode;
    position: { x: number; y: number; rotation?: number };
    style?: any;
  }> = ({ children, position, style = {} }) => (
    <View style={[
      styles.staticElement, 
      { 
        left: position.x, 
        top: position.y,
        transform: position.rotation ? [{ rotate: `${position.rotation}deg` }] : undefined,
      }, 
      style
    ]}>
      {children}
    </View>
  );

  const DirectionalArrow: React.FC<{
    position: { x: number; y: number };
    direction: string;
  }> = ({ position, direction }) => (
    <Text style={[styles.arrow, { position: 'absolute', left: position.x, top: position.y }]}>
      {direction}
    </Text>
  );

  const handleSpotPress = (spotId: string) => {
    const spot = parkingData[spotId];
    if (!spot || !spot.isAvailable) {
      Alert.alert(
        'Spot Unavailable', 
        `Parking spot ${spotId} is currently occupied. Please choose another spot.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    setSelectedSpot(spotId);
    setShowParkingAlert(true);
  };

  const confirmParking = () => {
    setShowParkingAlert(false);
    setShowNavigationPath(true);
    setNavigationTarget(selectedSpot);
  };

  const cancelParking = () => {
    setShowParkingAlert(false);
    setSelectedSpot(null);
    setShowNavigationPath(false);
    setNavigationTarget(null);
  };

  const clearNavigation = () => {
    setShowNavigationPath(false);
    setNavigationTarget(null);
    setSelectedSpot(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#B22020', '#4C0E0E']} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading Parking Map...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      {/* Header with Gradient */}
      <LinearGradient colors={['#B22020', '#4C0E0E']} style={styles.header}>
        {/* Section Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sectionTabs}>
            {sectionStats.map(({ section, available, total, status }) => {
              const isSelected = selectedSection === section;
              const statusText = status === 'FULL' ? 'FULL SLOT' : `${available} SLOTS`;
              
              return (
                <TouchableOpacity
                  key={section}
                  onPress={() => setSelectedSection(isSelected ? null : section)}
                  style={[
                    styles.sectionTab,
                    isSelected ? styles.selectedTab : styles.unselectedTab
                  ]}
                >
                  <Text style={[
                    styles.sectionText,
                    isSelected ? styles.selectedTabText : styles.unselectedTabText
                  ]}>
                    {section}
                  </Text>
                  <Text style={[
                    styles.slotsText,
                    isSelected ? styles.selectedTabText : styles.unselectedTabText,
                    status === 'FULL' && styles.fullSlotText
                  ]}>
                    {statusText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Parking Map Layout */}
      <ScrollView style={styles.mapScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mapContainer}>
          
          {/* Render all parking spots */}
          {Object.entries(spotPositions).map(([spotId, position]) => {
            const spot = parkingData[spotId];
            const isHighlighted = selectedSection === spot?.section;
            
            return (
              <ParkingSpotComponent
                key={spotId}
                id={spotId}
                position={position}
                available={spot?.isAvailable ?? true}
                selected={isHighlighted}
                onPress={handleSpotPress}
              />
            );
          })}

          {/* Static elements */}
          <StaticElement position={staticElements.motorcycleParking} style={styles.motorcycleParkingStyle}>
            <Text style={styles.motorcycleParkingText}>{staticElements.motorcycleParking.label}</Text>
          </StaticElement>

          <StaticElement position={staticElements.stairs} style={[styles.stairsStyle, { transform: [{ rotate: `${staticElements.stairs.rotation}deg` }] }]}>
            <Text style={styles.stairsText}>{staticElements.stairs.label}</Text>
          </StaticElement>

          <StaticElement position={staticElements.mainElevator} style={styles.elevatorStyle}>
            <Text style={styles.elevatorText}>{staticElements.mainElevator.label}</Text>
          </StaticElement>

          <StaticElement position={staticElements.entrance} style={styles.entranceStyle}>
            <Text style={styles.entranceText}>{staticElements.entrance.label}</Text>
          </StaticElement>

          <StaticElement position={staticElements.youAreHere} style={styles.youAreHereStyle}>
            <Text style={styles.youAreHereText}>{staticElements.youAreHere.label}</Text>
          </StaticElement>

          <StaticElement position={staticElements.bottomElevator} style={styles.elevatorStyle}>
            <Text style={styles.elevatorText}>{staticElements.bottomElevator.label}</Text>
          </StaticElement>

          <StaticElement position={staticElements.rightElevator} style={[styles.rightElevatorStyle, { transform: [{ rotate: `${staticElements.rightElevator.rotation}deg` }] }]}>
            <Text style={styles.elevatorText}>{staticElements.rightElevator.label}</Text>
          </StaticElement>

          <StaticElement position={staticElements.exit}>
            <Text style={styles.exitText}>{staticElements.exit.label}</Text>
          </StaticElement>

          {/* Directional arrows */}
          {arrows.map((arrow, index) => (
            <DirectionalArrow
              key={index}
              position={{ x: arrow.x, y: arrow.y }}
              direction={arrow.direction}
            />
          ))}

          {/* Navigation Path */}
          {showNavigationPath && navigationTarget && (
            <>
              {/* Entrance Marker */}
              <StaticElement position={{ x: entrancePosition.x - 60, y: entrancePosition.y - 20 }} style={styles.entranceMarker}>
                <Text style={styles.entranceMarkerText}>🚗 ENTRANCE</Text>
              </StaticElement>

              {/* Dynamic navigation arrows based on path */}
              {generateNavigationPath(navigationTarget).waypoints.map((waypoint, index) => (
                <Text 
                  key={index}
                  style={[
                    styles.navArrow, 
                    { 
                      position: 'absolute',
                      left: waypoint.x - 10, 
                      top: waypoint.y - 10,
                    }
                  ]}
                >
                  {waypoint.direction}
                </Text>
              ))}

              {/* Target destination highlight */}
              <StaticElement 
                position={{ 
                  x: spotPositions[navigationTarget].x - 30, 
                  y: spotPositions[navigationTarget].y - 40 
                }} 
                style={styles.destination}
              >
                <Text style={styles.destinationText}>🎯 {navigationTarget}</Text>
              </StaticElement>

              {/* Clear route button */}
              <TouchableOpacity 
                onPress={clearNavigation}
                style={[styles.clearButton, { position: 'absolute', top: 10, right: 20 }]}
              >
                <Text style={styles.clearButtonText}>Clear Route</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Live status indicator */}
          <View style={[styles.statusIndicator, { position: 'absolute', top: 20, left: 20 }]}>
            <View style={[styles.statusDot, { backgroundColor: isLive ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
          </View>

          {/* Live status indicator */}
          <View style={[styles.statusIndicator, { position: 'absolute', top: 20, left: 20 }]}>
            <View style={[styles.statusDot, { backgroundColor: isLive ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Card */}
      <LinearGradient colors={['#B22020', '#4C0E0E']} style={styles.bottomNav}>
        <View style={styles.bottomCard}>
          <View style={styles.bottomHeader}>
            <Text style={styles.buildingName}>USJR Quadricentennial</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Floor</Text>
              <Text style={styles.infoValue}>{floor}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Available Spots</Text>
              <Text style={styles.infoValue}>
                {Object.values(parkingData).filter(spot => spot.isAvailable).length}
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.viewLevelsButton}
            >
              <Text style={styles.viewLevelsText}>View other levels</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navigateButton}
              onPress={() => {
                if (navigationTarget) {
                  Alert.alert('Navigation', `Navigating to spot ${navigationTarget}`);
                } else {
                  Alert.alert('Navigation', 'Select a parking spot to start navigation guidance.');
                }
              }}
            >
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>

          {lastUpdated && (
            <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
          )}
        </View>
      </LinearGradient>

      {/* Parking Confirmation Modal */}
      <Modal visible={showParkingAlert} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Navigate to Spot {selectedSpot}?</Text>
            <Text style={styles.modalText}>
              This will show you the best route to parking spot {selectedSpot} in section {parkingData[selectedSpot!]?.section}.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={confirmParking} style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Yes, Guide Me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelParking} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#374151',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginTop: 16,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 14,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  sectionTab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  selectedTab: {
    backgroundColor: 'white',
  },
  unselectedTab: {
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  selectedTabText: {
    color: '#B22020',
  },
  unselectedTabText: {
    color: 'white',
  },
  sectionText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    marginBottom: 4,
  },
  slotsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  fullSlotText: {
    color: '#FF6B6B',
  },
  mapScrollView: {
    flex: 1,
  },
  mapContainer: {
    height: 850,
    backgroundColor: '#4B5563',
    position: 'relative',
    margin: 16,
    borderRadius: 12,
  },
  parkingSpot: {
    position: 'absolute',
    width: 32,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availableSpot: {
    backgroundColor: '#10B981',
    borderColor: '#047857',
  },
  occupiedSpot: {
    backgroundColor: '#EF4444',
    borderColor: '#B91C1C',
  },
  highlightedSpot: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  targetSpot: {
    backgroundColor: '#3B82F6',
    borderColor: '#1D4ED8',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  spotText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
  },
  occupiedSpotText: {
    color: '#FFE5E5',
  },
  targetIndicator: {
    position: 'absolute',
    top: -15,
    right: -15,
  },
  targetArrow: {
    fontSize: 16,
    color: '#FF6B35',
  },
  staticElement: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  motorcycleParkingStyle: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 15,
    borderRadius: 8,
    width: 60,
    height: 80,
  },
  motorcycleParkingText: {
    color: 'white',
    fontSize: 8,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
    lineHeight: 12,
  },
  stairsStyle: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 20,
    borderRadius: 6,
  },
  stairsText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  elevatorStyle: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  rightElevatorStyle: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 15,
    borderRadius: 6,
  },
  elevatorText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  entranceStyle: {
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  entranceText: {
    color: '#1F2937',
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  youAreHereStyle: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  youAreHereText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  exitText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  arrow: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  entranceMarker: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  entranceMarkerText: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  navArrow: {
    color: '#60A5FA',
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    textShadowColor: '#1E40AF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  destination: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  destinationText: {
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
  },
  bottomNav: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bottomCard: {
    padding: 16,
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buildingName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 4,
  },
  infoValue: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  viewLevelsButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  viewLevelsText: {
    color: '#B22020',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#831B1B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  lastUpdated: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.8,
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

export default ParkingMapScreen;