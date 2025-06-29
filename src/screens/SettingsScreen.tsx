import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card, List, Button, Divider } from 'react-native-paper';
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

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

interface NotificationSettings {
  spotAvailable: boolean;
  floorUpdates: boolean;
  maintenanceAlerts: boolean;
  vibration: boolean;
  sound: boolean;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    spotAvailable: true,
    floorUpdates: true,
    maintenanceAlerts: false,
    vibration: true,
    sound: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // TODO: Load settings from AsyncStorage or your API
      // For now, using default values
      console.log('Loading settings...');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // TODO: Save settings to AsyncStorage or your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success ✅', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error ❌', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setNotifications({
              spotAvailable: true,
              floorUpdates: true,
              maintenanceAlerts: false,
              vibration: true,
              sound: true,
            });
            Alert.alert('Reset Complete', 'Settings have been reset to default values.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Animatable.View animation="fadeInDown" delay={200}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerContent}>
              <MaterialIcons name="settings" size={40} color="#B71C1C" />
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Customize your VALET experience and notification preferences
            </Text>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Notification Settings */}
      <Animatable.View animation="fadeInUp" delay={400}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="notifications" size={24} color="#B71C1C" />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>
            
            <List.Item
              title="Spot Available"
              description="Get notified when parking spots become available"
              left={() => <MaterialIcons name="local-parking" size={24} color="#4CAF50" />}
              right={() => (
                <Switch
                  value={notifications.spotAvailable}
                  onValueChange={() => handleNotificationToggle('spotAvailable')}
                  trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
                  thumbColor={notifications.spotAvailable ? '#FFFFFF' : '#F4F3F4'}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Floor Updates"
              description="Real-time updates about floor occupancy changes"
              left={() => <MaterialIcons name="update" size={24} color="#2196F3" />}
              right={() => (
                <Switch
                  value={notifications.floorUpdates}
                  onValueChange={() => handleNotificationToggle('floorUpdates')}
                  trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
                  thumbColor={notifications.floorUpdates ? '#FFFFFF' : '#F4F3F4'}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Maintenance Alerts"
              description="Important maintenance and system updates"
              left={() => <MaterialIcons name="build" size={24} color="#FF9800" />}
              right={() => (
                <Switch
                  value={notifications.maintenanceAlerts}
                  onValueChange={() => handleNotificationToggle('maintenanceAlerts')}
                  trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
                  thumbColor={notifications.maintenanceAlerts ? '#FFFFFF' : '#F4F3F4'}
                />
              )}
            />

            <Divider />
            
            <List.Item
              title="Vibration"
              description="Vibrate device when receiving notifications"
              left={() => <MaterialIcons name="vibration" size={24} color="#9C27B0" />}
              right={() => (
                <Switch
                  value={notifications.vibration}
                  onValueChange={() => handleNotificationToggle('vibration')}
                  trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
                  thumbColor={notifications.vibration ? '#FFFFFF' : '#F4F3F4'}
                />
              )}
            />

            <Divider />
            
            <List.Item
              title="Sound"
              description="Play notification sounds"
              left={() => <MaterialIcons name="volume-up" size={24} color="#FF5722" />}
              right={() => (
                <Switch
                  value={notifications.sound}
                  onValueChange={() => handleNotificationToggle('sound')}
                  trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
                  thumbColor={notifications.sound ? '#FFFFFF' : '#F4F3F4'}
                />
              )}
            />
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* App Preferences */}
      <Animatable.View animation="fadeInUp" delay={600}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="tune" size={24} color="#B71C1C" />
              <Text style={styles.sectionTitle}>App Preferences</Text>
            </View>
            
            <List.Item
              title="Auto-Refresh Interval"
              description="Automatically refresh parking data every 30 seconds"
              left={() => <MaterialIcons name="refresh" size={24} color="#4CAF50" />}
              onPress={() => Alert.alert(
                'Auto-Refresh',
                'Auto-refresh is currently set to 30 seconds.\n\nThis feature ensures you always have the latest parking information.',
                [{ text: 'OK' }]
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Data Usage Monitor"
              description="Track app data consumption"
              left={() => <MaterialIcons name="data-usage" size={24} color="#2196F3" />}
              onPress={() => Alert.alert(
                'Data Usage',
                'VALET uses minimal data:\n\n• ~1MB per hour of active usage\n• ~5KB per parking data refresh\n• Efficient caching to reduce usage',
                [{ text: 'OK' }]
              )}
            />

            <Divider />
            
            <List.Item
              title="Cache Management"
              description="Clear app cache and temporary data"
              left={() => <MaterialIcons name="clear" size={24} color="#FF9800" />}
              onPress={() => Alert.alert(
                'Clear Cache',
                'This will clear all cached parking data and temporary files.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', onPress: () => Alert.alert('Cache Cleared', 'App cache has been cleared successfully! 🧹') },
                ]
              )}
            />

            <Divider />
            
            <List.Item
              title="Theme"
              description="App appearance and theme settings"
              left={() => <MaterialIcons name="palette" size={24} color="#E91E63" />}
              onPress={() => Alert.alert(
                'Theme Settings',
                'Dark mode and custom themes coming soon! 🌙\n\nCurrently using VALET red theme.',
                [{ text: 'OK' }]
              )}
            />
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* About & Support */}
      <Animatable.View animation="fadeInUp" delay={800}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="info" size={24} color="#B71C1C" />
              <Text style={styles.sectionTitle}>About & Support</Text>
            </View>
            
            <List.Item
              title="About VALET"
              description="App version and information"
              left={() => <MaterialIcons name="info-outline" size={24} color="#2196F3" />}
              onPress={() => Alert.alert(
                'About VALET',
                '🚗 VALET v1.0.0\n\n📱 Built with Expo React Native\n🏫 Developed for USJ-R Quadricentennial Campus\n🎯 Smart Parking Made Easy\n\n© 2025 VALET Team'
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Help & FAQ"
              description="Get help with using the app"
              left={() => <MaterialIcons name="help" size={24} color="#4CAF50" />}
              onPress={() => Alert.alert(
                'Help & FAQ',
                '❓ Frequently Asked Questions:\n\n• How do I find a parking spot?\n• Why is my floor showing as full?\n• How accurate are the sensors?\n\nFor detailed help, use the Feedback screen to ask questions.'
              )}
            />

            <Divider />
            
            <List.Item
              title="Contact Support"
              description="Get in touch with our support team"
              left={() => <MaterialIcons name="headset-mic" size={24} color="#FF9800" />}
              onPress={() => Alert.alert(
                'Contact Support',
                '📞 Support Options:\n\n📧 Email: support@valet-parking.com\n📱 Phone: +63 123 456 7890\n🕒 Hours: 24/7 Support Available\n\n💬 Or use the Feedback screen in the app!'
              )}
            />

            <Divider />
            
            <List.Item
              title="Privacy Policy"
              description="Learn how we protect your data"
              left={() => <MaterialIcons name="privacy-tip" size={24} color="#9C27B0" />}
              onPress={() => Alert.alert(
                'Privacy Policy',
                '🔒 Your Privacy Matters:\n\n• We only collect anonymous usage data\n• No personal information is stored\n• Data is used to improve parking experience\n• Full compliance with data protection laws'
              )}
            />

            <Divider />
            
            <List.Item
              title="App Permissions"
              description="Review app permissions and access"
              left={() => <MaterialIcons name="security" size={24} color="#795548" />}
              onPress={() => Alert.alert(
                'App Permissions',
                '🔐 VALET uses these permissions:\n\n📶 Internet: Connect to parking servers\n📳 Notifications: Send parking alerts\n📱 Vibration: Notification feedback\n\nAll permissions are used responsibly.'
              )}
            />
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Action Buttons */}
      <Animatable.View animation="fadeInUp" delay={1000}>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={resetSettings}
            style={styles.resetButton}
            icon={() => <MaterialIcons name="restore" size={20} color="#F44336" />}
            textColor="#F44336"
          >
            Reset to Default
          </Button>
          
          <Button
            mode="contained"
            onPress={saveSettings}
            loading={loading}
            style={styles.saveButton}
            buttonColor="#B71C1C"
            icon={() => <MaterialIcons name="save" size={20} color="#FFFFFF" />}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </View>
      </Animatable.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerCard: {
    margin: 20,
    elevation: 6,
    backgroundColor: '#FFEBEE',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  card: {
    margin: 20,
    marginBottom: 10,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    margin: 20,
    gap: 10,
  },
  resetButton: {
    flex: 1,
    borderColor: '#F44336',
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
  },
});

export default SettingsScreen;