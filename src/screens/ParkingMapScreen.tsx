import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  StyleSheet,
  Modal 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

interface ParkingSpot {
  id: string;
  isAvailable: boolean;
  section: string;
}

const ParkingMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { floor = 1 } = (route.params as { floor?: number }) || {};
  
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [showParkingAlert, setShowParkingAlert] = useState(false);
  const [showNavigationPath, setShowNavigationPath] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  // Mock parking spots data
  const parkingSpots: Record<string, ParkingSpot> = {
    'B1': { id: 'B1', isAvailable: true, section: 'B' },
    'B2': { id: 'B2', isAvailable: true, section: 'B' },
    'B3': { id: 'B3', isAvailable: true, section: 'B' },
    'B4': { id: 'B4', isAvailable: true, section: 'B' },
    'D1': { id: 'D1', isAvailable: true, section: 'D' },
    'D2': { id: 'D2', isAvailable: true, section: 'D' },
    'D3': { id: 'D3', isAvailable: false, section: 'D' },
    'D4': { id: 'D4', isAvailable: true, section: 'D' },
    'D5': { id: 'D5', isAvailable: true, section: 'D' },
    'D6': { id: 'D6', isAvailable: false, section: 'D' },
    'D7': { id: 'D7', isAvailable: true, section: 'D' },
    'E1': { id: 'E1', isAvailable: true, section: 'E' },
    'E2': { id: 'E2', isAvailable: false, section: 'E' },
    'E3': { id: 'E3', isAvailable: true, section: 'E' },
    'E4': { id: 'E4', isAvailable: true, section: 'E' },
    'E5': { id: 'E5', isAvailable: false, section: 'E' },
    'E6': { id: 'E6', isAvailable: true, section: 'E' },
    'C1': { id: 'C1', isAvailable: false, section: 'C' },
    'C2': { id: 'C2', isAvailable: true, section: 'C' },
    'C3': { id: 'C3', isAvailable: true, section: 'C' },
  };

  const ParkingSpotComponent: React.FC<{
    id: string;
    available: boolean;
    selected: boolean;
    onPress: (id: string) => void;
  }> = ({ id, available, selected, onPress }) => {
    const isHighlighted = selected && selectedSection && parkingSpots[id]?.section === selectedSection;
    
    return (
      <TouchableOpacity
        onPress={() => onPress(id)}
        style={[
          styles.parkingSpot,
          isHighlighted ? styles.highlightedSpot : 
          available ? styles.availableSpot : styles.occupiedSpot
        ]}
        activeOpacity={0.7}
      >
        <Text style={styles.spotText}>{id}</Text>
      </TouchableOpacity>
    );
  };

  const handleSpotPress = (spotId: string) => {
    const spot = parkingSpots[spotId];
    if (!spot || !spot.isAvailable) {
      Alert.alert('Unavailable', 'This spot is not available!');
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parking Map</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sectionTabs}>
            {[
              { section: 'A', slots: '2 SLOTS' },
              { section: 'B', slots: '10 SLOTS' },
              { section: 'C', slots: 'FULL SLOT' },
              { section: 'D', slots: '5 SLOTS' }
            ].map(({ section, slots }) => {
              const isSelected = selectedSection === section;
              return (
                <TouchableOpacity
                  key={section}
                  onPress={() => setSelectedSection(section)}
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
                    isSelected ? styles.selectedTabText : styles.unselectedTabText
                  ]}>
                    {slots}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Parking Map Layout */}
      <View style={styles.mapContainer}>
        
        {/* Top Right B Section */}
        <View style={[styles.absolutePosition, { top: 20, right: 20, flexDirection: 'row' }]}>
          <ParkingSpotComponent id="B4" available={true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="B3" available={true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="B2" available={true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="B1" available={true} selected={selectedSection === 'B'} onPress={handleSpotPress} />
        </View>

        {/* Elevator (top) */}
        <View style={[styles.absolutePosition, styles.elevator, { top: 20, right: 180 }]}>
          <Text style={styles.elevatorText}>Elevator</Text>
        </View>

        {/* Top A spot */}
        <View style={[styles.absolutePosition, styles.aSpot, { top: 20, left: 20 }]}>
          <Text style={styles.spotText}>A</Text>
        </View>

        {/* Direction arrows */}
        <Text style={[styles.absolutePosition, styles.arrow, { top: 30, right: 140 }]}>←</Text>
        <Text style={[styles.absolutePosition, styles.arrow, { top: 30, right: 160 }]}>←</Text>

        {/* U spots */}
        <View style={[styles.absolutePosition, { top: 60, right: 110, alignItems: 'center' }]}>
          <View style={styles.uSpot}>
            <Text style={styles.spotText}>U</Text>
          </View>
          <Text style={styles.arrow}>↓</Text>
          <View style={styles.uSpot}>
            <Text style={styles.spotText}>U</Text>
          </View>
        </View>

        {/* STAIRS */}
        <View style={[styles.absolutePosition, styles.stairs, { top: 100, left: 10 }]}>
          <Text style={styles.stairsText}>STAIRS</Text>
        </View>

        {/* Main D Section */}
        <View style={[styles.absolutePosition, { top: 120, left: 30, flexDirection: 'row' }]}>
          <ParkingSpotComponent id="D7" available={true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="D6" available={false} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="D5" available={true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="D4" available={true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="D3" available={false} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="D2" available={true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="D1" available={true} selected={selectedSection === 'D'} onPress={handleSpotPress} />
        </View>

        {/* Direction arrows above D */}
        <View style={[styles.absolutePosition, { top: 90, left: 40, flexDirection: 'row' }]}>
          <Text style={styles.arrow}>←</Text>
          <View style={{ width: 20 }} />
          <Text style={styles.arrow}>←</Text>
          <View style={{ width: 20 }} />
          <Text style={styles.arrow}>←</Text>
          <View style={{ width: 20 }} />
          <Text style={styles.arrow}>←</Text>
        </View>

        {/* Main Elevator */}
        <View style={[styles.absolutePosition, styles.mainElevator, { top: 120, right: 20 }]}>
          <Text style={styles.elevatorText}>Elevator</Text>
        </View>

        {/* You are here */}
        <View style={[styles.absolutePosition, styles.youAreHere, { top: 120, right: 100 }]}>
          <Text style={styles.youAreHereText}>You are here</Text>
        </View>

        {/* Down arrows */}
        <Text style={[styles.absolutePosition, styles.arrow, { top: 170, right: 40 }]}>↓</Text>
        <Text style={[styles.absolutePosition, styles.arrow, { top: 170, right: 110 }]}>↓</Text>

        {/* Left E section */}
        <View style={[styles.absolutePosition, { top: 170, left: 10, alignItems: 'center' }]}>
          <ParkingSpotComponent id="E1" available={true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <Text style={styles.arrow}>↓</Text>
          <ParkingSpotComponent id="E2" available={false} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <Text style={styles.arrow}>→</Text>
          <ParkingSpotComponent id="E3" available={true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
        </View>

        {/* Right up arrow */}
        <Text style={[styles.absolutePosition, styles.arrow, { top: 60, right: 30 }]}>↑</Text>

        {/* Middle A section (5 spots) */}
        <View style={[styles.absolutePosition, { top: 220, left: 60, flexDirection: 'row' }]}>
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.spotSpacing} />
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.spotSpacing} />
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.spotSpacing} />
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
          <View style={styles.spotSpacing} />
          <View style={styles.aSpot}><Text style={styles.spotText}>A</Text></View>
        </View>

        {/* EXIT */}
        <View style={[styles.absolutePosition, { top: 220, right: 20, alignItems: 'center' }]}>
          <Text style={styles.exitText}>EXIT</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.arrow}>↑</Text>
            <Text style={styles.arrow}>↑</Text>
          </View>
        </View>

        {/* Bottom flow arrows */}
        <View style={[styles.absolutePosition, { top: 270, left: 50, flexDirection: 'row' }]}>
          <Text style={styles.arrow}>→</Text>
          <View style={{ width: 15 }} />
          <Text style={styles.arrow}>→</Text>
          <View style={{ width: 15 }} />
          <Text style={styles.arrow}>→</Text>
          <View style={{ width: 15 }} />
          <Text style={styles.arrow}>→</Text>
          <View style={{ width: 15 }} />
          <Text style={styles.arrow}>→</Text>
        </View>

        {/* Bottom section */}
        <View style={[styles.absolutePosition, { top: 300, left: 30, flexDirection: 'row' }]}>
          <ParkingSpotComponent id="C2" available={true} selected={selectedSection === 'C'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="C1" available={false} selected={selectedSection === 'C'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="E4" available={true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="E5" available={false} selected={selectedSection === 'E'} onPress={handleSpotPress} />
          <View style={styles.spotSpacing} />
          <ParkingSpotComponent id="E6" available={true} selected={selectedSection === 'E'} onPress={handleSpotPress} />
        </View>

        {/* Bottom Elevator */}
        <View style={[styles.absolutePosition, styles.mainElevator, { top: 300, right: 20 }]}>
          <Text style={styles.elevatorText}>Elevator</Text>
        </View>

        {/* Navigation Path */}
        {showNavigationPath && navigationTarget && (
          <>
            {/* Entrance Marker */}
            <View style={[styles.absolutePosition, styles.entrance, { bottom: 60, alignSelf: 'center', left: '40%' }]}>
              <Text style={styles.entranceText}>🚗 ENTRANCE</Text>
            </View>

            {/* Navigation arrows */}
            <Text style={[styles.absolutePosition, styles.navArrow, { bottom: 50, left: '45%' }]}>↑</Text>
            <Text style={[styles.absolutePosition, styles.navArrow, { bottom: 35, left: '45%' }]}>↑</Text>

            {/* Target destination banner */}
            <View style={[styles.absolutePosition, styles.destination, { top: 10, left: '20%' }]}>
              <Text style={styles.destinationText}>🎯 Destination: {navigationTarget}</Text>
            </View>

            {/* Clear route button */}
            <TouchableOpacity 
              onPress={clearNavigation}
              style={[styles.absolutePosition, styles.clearButton, { top: 50, right: 20 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear Route</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <View style={styles.bottomCard}>
          <View>
            <Text style={styles.buildingName}>USJR Quadricentennial</Text>
            <Text style={styles.floorInfo}>Floor {floor} • Available Spots: 40</Text>
          </View>
          <TouchableOpacity style={styles.navigateButton}>
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Parking Confirmation Modal */}
      <Modal visible={showParkingAlert} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Want to park in spot {selectedSpot}?</Text>
            <Text style={styles.modalText}>
              This will guide you to parking spot {selectedSpot} in section {parkingSpots[selectedSpot!]?.section}.
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
  header: {
    backgroundColor: '#DC2626',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    color: 'white',
    fontSize: 24,
    marginRight: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  selectedTab: {
    backgroundColor: 'white',
  },
  unselectedTab: {
    borderWidth: 1,
    borderColor: 'white',
  },
  selectedTabText: {
    color: '#DC2626',
  },
  unselectedTabText: {
    color: 'white',
  },
  sectionText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  slotsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#4B5563',
    position: 'relative',
  },
  absolutePosition: {
    position: 'absolute',
  },
  parkingSpot: {
    width: 32,
    height: 24,
    borderRadius: 4,
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
  },
  spotText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  spotSpacing: {
    width: 4,
  },
  elevator: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 4,
    transform: [{ rotate: '-90deg' }],
  },
  mainElevator: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  elevatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  arrow: {
    color: 'white',
    fontSize: 18,
  },
  aSpot: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  uSpot: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stairs: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 32,
    borderRadius: 4,
    transform: [{ rotate: '-90deg' }],
  },
  stairsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  youAreHere: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  youAreHereText: {
    color: 'white',
    fontSize: 10,
  },
  exitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  entrance: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  entranceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  navArrow: {
    color: '#60A5FA',
    fontSize: 20,
  },
  destination: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  destinationText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomNav: {
    backgroundColor: '#DC2626',
    padding: 16,
  },
  bottomCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buildingName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1F2937',
  },
  floorInfo: {
    color: '#6B7280',
    fontSize: 14,
  },
  navigateButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navigateButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ParkingMapScreen;