import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ParkingSpace {
  id: number;
  sensor_id: number;
  is_occupied: boolean;
  distance_cm: number;
  timestamp: string;
  location: string;
}

const ApiTestScreen: React.FC = () => {
  const [apiData, setApiData] = useState<ParkingSpace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSensorId, setNewSensorId] = useState('');
  const [newDistance, setNewDistance] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const testGetAPI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing GET API...');
      
      const response = await fetch('https://valet.up.railway.app/api/parking', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ParkingSpace[] = await response.json();
      console.log('API Response:', data);
      
      setApiData(data);
      Alert.alert('Success!', `Loaded ${data.length} parking spaces`);
      
    } catch (err: any) {
      console.error('API Test Error:', err);
      setError(err.message);
      Alert.alert('API Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const testPostAPI = async () => {
    if (!newSensorId || !newDistance) {
      Alert.alert('Error', 'Please fill in Sensor ID and Distance');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing POST API...');
      
      const postData = {
        sensor_id: parseInt(newSensorId),
        is_occupied: parseInt(newDistance) < 100, // Assume occupied if distance < 100cm
        distance_cm: parseInt(newDistance),
        location: newLocation || 'Floor 1',
      };

      console.log('Sending POST data:', postData);

      const response = await fetch('https://valet.up.railway.app/api/parking', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      console.log('POST Response status:', response.status);

      const responseText = await response.text();
      console.log('POST Response:', responseText);

      if (response.ok) {
        Alert.alert('Success!', 'Data posted successfully');
        // Refresh the data
        testGetAPI();
        // Clear form
        setNewSensorId('');
        setNewDistance('');
        setNewLocation('');
      } else {
        throw new Error(`POST failed with status: ${response.status}, Response: ${responseText}`);
      }
      
    } catch (err: any) {
      console.error('POST API Error:', err);
      setError(err.message);
      Alert.alert('POST Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* API Test Controls */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>API Connection Test</Text>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={testGetAPI}
              loading={loading}
              icon="download"
              style={styles.testButton}
              buttonColor="#4CAF50"
            >
              Test GET API
            </Button>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Icon name="error" size={20} color="#F44336" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* POST Test Form */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Test POST API</Text>
          
          <TextInput
            label="Sensor ID"
            value={newSensorId}
            onChangeText={setNewSensorId}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Distance (cm)"
            value={newDistance}
            onChangeText={setNewDistance}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Location (optional)"
            value={newLocation}
            onChangeText={setNewLocation}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., Floor 1, Section A"
          />

          <Button
            mode="contained"
            onPress={testPostAPI}
            loading={loading}
            icon="upload"
            style={styles.testButton}
            buttonColor="#B71C1C"
          >
            Test POST API
          </Button>
        </Card.Content>
      </Card>

      {/* API Response Display */}
      {apiData && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>
              API Response ({apiData.length} records)
            </Text>
            
            {/* Summary Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{apiData.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {apiData.filter(item => !item.is_occupied).length}
                </Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {apiData.filter(item => item.is_occupied).length}
                </Text>
                <Text style={styles.statLabel}>Occupied</Text>
              </View>
            </View>

            {/* Data List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableRow}>
                  <Text style={[styles.tableHeader, styles.idColumn]}>ID</Text>
                  <Text style={[styles.tableHeader, styles.sensorColumn]}>Sensor</Text>
                  <Text style={[styles.tableHeader, styles.statusColumn]}>Status</Text>
                  <Text style={[styles.tableHeader, styles.distanceColumn]}>Distance</Text>
                  <Text style={[styles.tableHeader, styles.locationColumn]}>Location</Text>
                  <Text style={[styles.tableHeader, styles.timeColumn]}>Updated</Text>
                </View>
                
                {/* Table Data */}
                {apiData.slice(0, 20).map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.idColumn]}>{item.id}</Text>
                    <Text style={[styles.tableCell, styles.sensorColumn]}>{item.sensor_id}</Text>
                    <Text style={[
                      styles.tableCell, 
                      styles.statusColumn,
                      { color: item.is_occupied ? '#F44336' : '#4CAF50' }
                    ]}>
                      {item.is_occupied ? 'Occupied' : 'Free'}
                    </Text>
                    <Text style={[styles.tableCell, styles.distanceColumn]}>{item.distance_cm}cm</Text>
                    <Text style={[styles.tableCell, styles.locationColumn]}>{item.location || 'N/A'}</Text>
                    <Text style={[styles.tableCell, styles.timeColumn]}>{formatTimestamp(item.timestamp)}</Text>
                  </View>
                ))}
                
                {apiData.length > 20 && (
                  <View style={styles.moreDataRow}>
                    <Text style={styles.moreDataText}>... and {apiData.length - 20} more records</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>
      )}

      {/* Connection Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Connection Info</Text>
          <View style={styles.infoRow}>
            <Icon name="link" size={20} color="#666" />
            <Text style={styles.infoText}>API URL: https://valet.up.railway.app/api/parking</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="storage" size={20} color="#666" />
            <Text style={styles.infoText}>Database: MySQL on Railway</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="table-chart" size={20} color="#666" />
            <Text style={styles.infoText}>Table: parking_spaces</Text>
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
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  testButton: {
    marginVertical: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
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
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tableContainer: {
    minWidth: 800,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
  },
  tableHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 8,
  },
  idColumn: {
    width: 60,
  },
  sensorColumn: {
    width: 80,
  },
  statusColumn: {
    width: 80,
  },
  distanceColumn: {
    width: 80,
  },
  locationColumn: {
    width: 120,
  },
  timeColumn: {
    width: 160,
  },
  moreDataRow: {
    padding: 16,
    alignItems: 'center',
  },
  moreDataText: {
    fontStyle: 'italic',
    color: '#999',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
});

export default ApiTestScreen;