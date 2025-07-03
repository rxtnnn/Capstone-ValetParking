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
  ActivityIndicator 
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
  const [refreshing, setRefreshing] = useState(false);
  if (!fontsLoaded) return null;

  // Define spot layout exactly as shown in the reference image
  const spotLayout = {
    A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
    B: ['B1', 'B2', 'B3', 'B4'],
    C: ['C1', 'C2'],
    D: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
    E: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']
  };

  // Fetch real-time parking data
  const fetchParkingData  = async (showLoadingScreen = false) =>  {
    try {
       if (showLoadingScreen) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
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
      const transformedData = transformApiData(rawData);
      setParkingData(transformedData);
      updateSectionStats(transformedData);
      setIsLive(true);
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.error('Error fetching parking data:', error);
      setIsLive(false);
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
    
    Object.values(spotLayout).flat().forEach((spotId, index) => {
      spots[spotId] = {
        id: spotId,
        isAvailable: true,
        section: spotId.charAt(0),
        sensorId: index + 1
      };
    });

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

  // Generate mock data
  const generateMockData = (): Record<string, ParkingSpot> => {
    const spots: Record<string, ParkingSpot> = {};
    const occupiedSpots = ['D3', 'D6', 'E2', 'E5', 'C1', 'B2'];
    
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

  useEffect(() => {
    fetchParkingData();
    const interval = setInterval(fetchParkingData, 10000);
    return () => clearInterval(interval);
  }, []);

  const ParkingSpotComponent: React.FC<{
    id: string;
    available: boolean;
    selected: boolean;
    onPress: (id: string) => void;
  }> = ({ id, available, selected, onPress }) => {
    const isHighlighted = selected && selectedSection && parkingData[id]?.section === selectedSection;
    const isNavigationTarget = navigationTarget === id;
    
    return (
      <TouchableOpacity
        onPress={() => onPress(id)}
        style={[
          styles.parkingSpot,
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
      </TouchableOpacity>
    );
  };

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

      {/* Main Parking Map - Exact layout from reference image */}
      <View style={styles.mapContainer}>
        
        {/* Top Row: Top Elevator + B4,B3,B2,B1 + A spot */}
        {/* Top Left Elevator (Vertical) */}
        <View style={[styles.absolute, styles.topLeftElevator, { top: 20, left: 20 }]}>
          <Text style={styles.elevatorText}>Elevator</Text>
        </View>

        {/* B Section: B4, B3, B2, B1 */}
        <View style={[styles.absolute, { top: 20, left: 120, flexDirection: 'row', gap: 8 }]}>
          <ParkingSpotComponent id="B4" available={parkingData['B4']?.isAvailable ?? true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="B3" available={parkingData['B3']?.isAvailable ?? true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="B2" available={parkingData['B2']?.isAvailable ?? true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="B1" available={parkingData['B1']?.isAvailable ?? true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
        </View>

        {/* Top Right A spot */}
        <View style={[styles.absolute, { top: 20, right: 20 }]}>
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
        </View>

        {/* Arrows under B section */}
        <View style={[styles.absolute, { top: 60, left: 130, flexDirection: 'row', gap: 40 }]}>
          <Text style={styles.arrow}>←</Text>
          <Text style={styles.arrow}>←</Text>
        </View>

        {/* U spots (vertical) */}
        <View style={[styles.absolute, { top: 80, left: 80, alignItems: 'center' }]}>
          <View style={styles.uSpot}><Text style={styles.spotText}>U</Text></View>
          <Text style={styles.arrow}>↓</Text>
          <View style={styles.uSpot}><Text style={styles.spotText}>U</Text></View>
        </View>

        {/* Up arrow (top right) */}
        <Text style={[styles.absolute, styles.arrow, { top: 80, right: 30 }]}>↑</Text>

        {/* STAIRS (Left side, vertical) */}
        <View style={[styles.absolute, styles.stairs, { top: 160, left: 20 }]}>
          <Text style={styles.stairsText}>STAIRS</Text>
        </View>

        {/* Main D Section: D7, D6, D5, D4, D3, D2, D1 */}
        <View style={[styles.absolute, { top: 160, left: 80, flexDirection: 'row', gap: 8 }]}>
          <ParkingSpotComponent id="D7" available={parkingData['D7']?.isAvailable ?? true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="D6" available={parkingData['D6']?.isAvailable ?? true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="D5" available={parkingData['D5']?.isAvailable ?? true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="D4" available={parkingData['D4']?.isAvailable ?? true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="D3" available={parkingData['D3']?.isAvailable ?? true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="D2" available={parkingData['D2']?.isAvailable ?? true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="D1" available={parkingData['D1']?.isAvailable ?? true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
        </View>

        {/* Main Elevator (Right of D section) */}
        <View style={[styles.absolute, styles.mainElevator, { top: 160, right: 120 }]}>
          <Text style={styles.elevatorText}>Elevator</Text>
        </View>

        {/* You are here */}
        <View style={[styles.absolute, styles.youAreHere, { top: 160, right: 20 }]}>
          <Text style={styles.youAreHereText}>You are here</Text>
        </View>

        {/* Arrows above D section */}
        <View style={[styles.absolute, { top: 130, left: 90, flexDirection: 'row', gap: 35 }]}>
          <Text style={styles.arrow}>←</Text>
          <Text style={styles.arrow}>←</Text>
          <Text style={styles.arrow}>←</Text>
          <Text style={styles.arrow}>←</Text>
        </View>

        {/* Down arrow (right side) */}
        <Text style={[styles.absolute, styles.arrow, { top: 210, right: 80 }]}>↓</Text>

        {/* Left E Section (Vertical): E1, E2, E3 */}
        <View style={[styles.absolute, { top: 240, left: 20, alignItems: 'center' }]}>
          <ParkingSpotComponent id="E1" available={parkingData['E1']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <Text style={styles.arrow}>↓</Text>
          <ParkingSpotComponent id="E2" available={parkingData['E2']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <Text style={styles.arrow}>→</Text>
          <ParkingSpotComponent id="E3" available={parkingData['E3']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
        </View>

        {/* Middle A Section: 5 A spots */}
        <View style={[styles.absolute, { top: 280, left: 100, flexDirection: 'row', gap: 8 }]}>
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
        </View>

        {/* EXIT (Right side) */}
        <View style={[styles.absolute, { top: 280, right: 20, alignItems: 'center' }]}>
          <Text style={styles.exitText}>EXIT</Text>
          <Text style={styles.arrow}>↑</Text>
        </View>

        {/* Bottom flow arrows */}
        <View style={[styles.absolute, { top: 330, left: 80, flexDirection: 'row', gap: 30 }]}>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.arrow}>→</Text>
        </View>

        {/* Bottom Section: C2, C1, E4, E5, E6, E4, E5, E6 */}
        <View style={[styles.absolute, { top: 360, left: 60, flexDirection: 'row', gap: 8 }]}>
          <ParkingSpotComponent id="C2" available={parkingData['C2']?.isAvailable ?? true} selected={selectedSection === 'C'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="C1" available={parkingData['C1']?.isAvailable ?? true} selected={selectedSection === 'C'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="E4" available={parkingData['E4']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="E5" available={parkingData['E5']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="E6" available={parkingData['E6']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="E4" available={parkingData['E4']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="E5" available={parkingData['E5']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <ParkingSpotComponent id="E6" available={parkingData['E6']?.isAvailable ?? true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
        </View>

        {/* Bottom Elevator */}
        <View style={[styles.absolute, styles.bottomElevator, { top: 360, right: 120 }]}>
          <Text style={styles.elevatorText}>Elevator</Text>
        </View>

        {/* Down arrow (bottom right) */}
        <Text style={[styles.absolute, styles.arrow, { top: 410, right: 80 }]}>↓</Text>

        {/* Right Vertical E Section */}
        <View style={[styles.absolute, { top: 440, right: 80, alignItems: 'center' }]}>
          <View style={styles.eSpot}><Text style={styles.spotText}>E1</Text></View>
          <Text style={styles.arrow}>↓</Text>
          <View style={styles.eSpot}><Text style={styles.spotText}>E2</Text></View>
          <Text style={styles.arrow}>↓</Text>
          <View style={styles.eSpot}><Text style={styles.spotText}>E3</Text></View>
          <Text style={styles.arrow}>↓</Text>
          <View style={styles.eSpot}><Text style={styles.spotText}>C1</Text></View>
          <Text style={styles.arrow}>↓</Text>
          <View style={styles.eSpot}><Text style={styles.spotText}>C2</Text></View>
        </View>

        {/* Right side arrows */}
        <View style={[styles.absolute, { top: 450, right: 20, alignItems: 'center' }]}>
          <Text style={styles.arrow}>↑</Text>
          <Text style={styles.arrow}>↑</Text>
          <Text style={styles.arrow}>↑</Text>
          <Text style={styles.arrow}>↑</Text>
          <Text style={styles.arrow}>↑</Text>
        </View>

        {/* Right side E spots (vertical) */}
        <View style={[styles.absolute, { top: 440, right: 20, alignItems: 'center' }]}>
          <View style={styles.eSpot}><Text style={styles.spotText}>E3</Text></View>
          <View style={styles.eSpot}><Text style={styles.spotText}>E1</Text></View>
          <View style={styles.eSpot}><Text style={styles.spotText}>C2</Text></View>
          <View style={styles.eSpot}><Text style={styles.spotText}>C1</Text></View>
        </View>

        {/* Right arrow */}
        <Text style={[styles.absolute, styles.arrow, { top: 580, right: 60 }]}>→</Text>

        {/* Bottom right E spots */}
        <View style={[styles.absolute, { top: 600, right: 60, flexDirection: 'row', gap: 8 }]}>
          <View style={styles.eSpot}><Text style={styles.spotText}>E4</Text></View>
          <View style={styles.eSpot}><Text style={styles.spotText}>E5</Text></View>
          <View style={styles.eSpot}><Text style={styles.spotText}>E6</Text></View>
        </View>

        {/* Right bottom elevator */}
        <View style={[styles.absolute, styles.rightElevator, { top: 520, right: 20 }]}>
          <Text style={styles.elevatorText}>Elevator</Text>
        </View>

        {/* Navigation Path */}
        {showNavigationPath && navigationTarget && (
          <>
            <View style={styles.entrance}>
              <Text style={styles.entranceText}>🚗 ENTRANCE</Text>
            </View>

            <View style={styles.destination}>
              <Text style={styles.destinationText}>🎯 Destination: {navigationTarget}</Text>
            </View>

            <TouchableOpacity onPress={clearNavigation} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear Route</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Bottom Navigation Card */}
      <LinearGradient colors={['#B22020', '#4C0E0E']} >
        <View style={styles.bottomCard}>
          <View style={styles.bottomHeader}>
            <Text style={styles.buildingName}>USJ-R Quadricentennial</Text>
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
            
            <TouchableOpacity style={styles.navigateButton}>
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
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
    marginHorizontal: 16,
  },
  refreshButton: {
    padding: 4,
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
  mapContainer: {
    flex: 1,
    backgroundColor: '#4B5563',
    margin: 16,
    borderRadius: 12,
    position: 'relative',
  },
  absolute: {
    position: 'absolute',
  },

  // Parking spots and infrastructure
  parkingSpot: {
    width: 36,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  occupiedSpotText: {
    color: '#FFE5E5',
  },
  
  // Infrastructure elements
  topLeftElevator: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 20,
    borderRadius: 6,
    transform: [{ rotate: '-90deg' }],
  },
  mainElevator: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  bottomElevator: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  rightElevator: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 20,
    borderRadius: 6,
    transform: [{ rotate: '-90deg' }],
  },
  stairs: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 40,
    borderRadius: 6,
    transform: [{ rotate: '-90deg' }],
  },
  youAreHere: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  
  // Spot types
  aSpot: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uSpot: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  eSpot: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 2,
  },
  
  // Text styles
  elevatorText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
  },
  stairsText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
  },
  youAreHereText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
  },
  exitText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  arrow: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Poppins_400Regular',
  },
  
  // Navigation elements
  entrance: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    left: '40%',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  entranceText: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  destination: {
    position: 'absolute',
    top: 10,
    left: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  destinationText: {
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  clearButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  
  // Bottom navigation
 
  bottomCard: {
    borderRadius: 12,
    padding: 20,
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
  
  // Modal styles
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