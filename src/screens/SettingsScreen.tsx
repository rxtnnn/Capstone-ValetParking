import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
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
  const { user, logout, isAuthenticated } = useAuth();
  
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
  const isMountedRef = useRef(true); // 🔥 NEW: Track if component is mounted
  const logoutInProgressRef = useRef(false); // 🔥 NEW: Track logout state

  // 🔥 NEW: Check authentication when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated && !logoutInProgressRef.current) {
        console.log('🔐 User not authenticated in Settings, redirecting...');
        navigation.navigate('Register');
      }
    }, [isAuthenticated, navigation])
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadNotificationSettings();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadNotificationSettings = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const settings = await NotificationService.getNotificationSettings();
      if (isMountedRef.current) {
        setNotificationSettings(settings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    if (!isMountedRef.current) return;
    
    try {
      await NotificationService.saveNotificationSettings(newSettings);
      if (isMountedRef.current) {
        setNotificationSettings(newSettings);
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      }
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    if (!isMountedRef.current) return;
    
    const newSettings = { ...notificationSettings, [key]: value };
    saveNotificationSettings(newSettings);
  };

  // 🔥 FIXED: Improved logout handling
  const handleLogout = () => {
    // Prevent multiple logout attempts
    if (logoutInProgressRef.current) {
      console.log('⚠️ Logout already in progress');
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: performLogout
        }
      ]
    );
  };

  // 🔥 NEW: Separate logout function with better error handling
  const performLogout = async () => {
    if (logoutInProgressRef.current || !isMountedRef.current) {
      return;
    }

    logoutInProgressRef.current = true;

    try {
      console.log('🚪 Starting logout from Settings...');
      
      if (isMountedRef.current) {
        setLoading(true);
      }

      // Call logout from auth context
      await logout();
      
      console.log('✅ Logout successful from Settings');
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        if (isMountedRef.current) {
          navigation.navigate('Register');
        }
      }, 100);

    } catch (error) {
      console.error('💥 Logout error in Settings:', error);
      
      if (isMountedRef.current) {
        Alert.alert(
          'Logout Error', 
          'There was an issue logging you out. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => {
                logoutInProgressRef.current = false;
                performLogout();
              }
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                logoutInProgressRef.current = false;
              }
            }
          ]
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      
      // Reset logout flag after a delay
      setTimeout(() => {
        logoutInProgressRef.current = false;
      }, 1000);
    }
  };

  const requestNotificationPermissions = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const granted = await NotificationService.requestPermissions();
      if (!isMountedRef.current) return;
      
      if (granted) {
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings for the best experience.');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to request permissions. Please try again.');
      }
    }
  };

  // 🔥 NEW: Don't render if not authenticated
  if (!isAuthenticated && !logoutInProgressRef.current) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Ionicons name="settings" size={48} color="#B22020" />
          <Text style={styles.loadingText}>
            {logoutInProgressRef.current ? 'Logging out...' : 'Updating Settings...'}
          </Text>
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
          </View>
        </View>

        {/* App Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings" size={24} color="#B22020" />
            <Text style={styles.cardTitle}>App Settings</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.settingItem, loading && styles.disabledItem]} 
            onPress={() => !loading && navigation.navigate('Profile', { userId: user?.id })}
            disabled={loading}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={20} color={loading ? "#ccc" : "#666"} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, loading && styles.disabledText]}>Profile</Text>
                <Text style={[styles.settingDesc, loading && styles.disabledText]}>View and edit your profile information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={loading ? "#ccc" : "#999"} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          <TouchableOpacity 
            style={[styles.settingItem, loading && styles.disabledItem]} 
            onPress={() => !loading && navigation.navigate('Feedback')}
            disabled={loading}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubble-outline" size={20} color={loading ? "#ccc" : "#666"} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, loading && styles.disabledText]}>Feedback</Text>
                <Text style={[styles.settingDesc, loading && styles.disabledText]}>Send feedback and suggestions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={loading ? "#ccc" : "#999"} />
          </TouchableOpacity>
          
        </View>

        {/* Account Actions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="log-out" size={24} color="#F44336" />
            <Text style={styles.cardTitle}>Account Actions</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.settingItem, loading && styles.disabledItem]} 
            onPress={handleLogout}
            disabled={loading || logoutInProgressRef.current}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={20} color={loading ? "#ccc" : "#F44336"} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: loading ? "#ccc" : '#F44336' }]}>
                  {logoutInProgressRef.current ? 'Logging out...' : 'Logout'}
                </Text>
                <Text style={[styles.settingDesc, loading && styles.disabledText]}>Sign out of your VALET account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={loading ? "#ccc" : "#F44336"} />
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