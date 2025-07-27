import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons  } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { styles } from './styles/SettingsScreen.style';

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  Register: undefined;
  Profile: { userId?: number } | undefined;
  ApiTest: undefined;
  ParkingMap: undefined;
  Feedback: undefined;
};

type SettingsScreenNavigationProp = NavigationProp<RootStackParamList>;

interface NotificationSettings {
  spotAvailable: boolean;
  floorUpdates: boolean;
  maintenanceAlerts: boolean;
  vibration: boolean;
  sound: boolean;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, logout } = useAuth();
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    spotAvailable: true,
    floorUpdates: true,
    maintenanceAlerts: false,
    vibration: true,
    sound: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await NotificationService.getNotificationSettings();
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      await NotificationService.saveNotificationSettings(newSettings);
      setNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    saveNotificationSettings(newSettings);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await logout();
              navigation.navigate('Register');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const requestNotificationPermissions = async () => {
    try {
      const granted = await NotificationService.requestPermissions();
      if (granted) {
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings for the best experience.');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Ionicons name="settings" size={48} color="#B22020" />
          <Text style={styles.loadingText}>Updating Settings...</Text>
          <View style={styles.loadingBar}>
            <View style={styles.loadingProgress} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Notification Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications" size={24} color="#B22020" />
            <Text style={styles.cardTitle}>Notification Settings</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="car" size={20} color="#48D666" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Parking Spots Available</Text>
                <Text style={styles.settingDesc}>Get notified when parking spots become available</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.spotAvailable}
              onValueChange={(value) => handleSettingChange('spotAvailable', value)}
              trackColor={{ false: '#E0E0E0', true: '#B22020' }}
              thumbColor={notificationSettings.spotAvailable ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
          
          <View style={styles.divider} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="layers" size={20} color="#2196F3" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Floor Updates</Text>
                <Text style={styles.settingDesc}>Receive updates about floor occupancy changes</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.floorUpdates}
              onValueChange={(value) => handleSettingChange('floorUpdates', value)}
              trackColor={{ false: '#E0E0E0', true: '#B22020' }}
              thumbColor={notificationSettings.floorUpdates ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
          
          <View style={styles.divider} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="construct" size={20} color="#FF9801" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Maintenance Alerts</Text>
                <Text style={styles.settingDesc}>Get notified about system maintenance</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.maintenanceAlerts}
              onValueChange={(value) => handleSettingChange('maintenanceAlerts', value)}
              trackColor={{ false: '#E0E0E0', true: '#B22020' }}
              thumbColor={notificationSettings.maintenanceAlerts ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
          
          <View style={styles.divider} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="vibrate" size={20} color="#9C27B0" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Vibration</Text>
                <Text style={styles.settingDesc}>Enable vibration for notifications</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.vibration}
              onValueChange={(value) => handleSettingChange('vibration', value)}
              trackColor={{ false: '#E0E0E0', true: '#B22020' }}
              thumbColor={notificationSettings.vibration ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
          
          <View style={styles.divider} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={20} color="#4CAF50" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Sound</Text>
                <Text style={styles.settingDesc}>Play sound with notifications</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.sound}
              onValueChange={(value) => handleSettingChange('sound', value)}
              trackColor={{ false: '#E0E0E0', true: '#B22020' }}
              thumbColor={notificationSettings.sound ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        {/* App Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings" size={24} color="#B22020" />
            <Text style={styles.cardTitle}>App Settings</Text>
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile', { userId: user?.id })}>
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Profile</Text>
                <Text style={styles.settingDesc}>View and edit your profile information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Feedback')}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Feedback</Text>
                <Text style={styles.settingDesc}>Send feedback and suggestions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
        </View>

        {/* Account Actions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="log-out" size={24} color="#F44336" />
            <Text style={styles.cardTitle}>Account Actions</Text>
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={20} color="#F44336" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: '#F44336' }]}>Logout</Text>
                <Text style={styles.settingDesc}>Sign out of your VALET account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>


        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>VALET v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Your Virtual Parking Buddy</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;