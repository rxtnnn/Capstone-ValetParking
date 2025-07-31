import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { styles } from './styles/SettingsScreen.style';

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  Login: undefined;
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

const FONTS = { Poppins_400Regular, Poppins_600SemiBold };

const DEFAULT_SETTINGS: NotificationSettings = {
  spotAvailable: true,
  floorUpdates: true,
  maintenanceAlerts: false,
  vibration: true,
  sound: true,
};

const SWITCH_COLORS = {
  false: '#E0E0E0',
  true: '#B22020'
} as const;

interface SettingItem {
  key: keyof NotificationSettings;
  icon: string;
  iconColor: string;
  title: string;
  desc: string;
  isMatCommunity?: boolean;
}

const SETTING_ITEMS: SettingItem[] = [
  {
    key: 'spotAvailable',
    icon: 'car',
    iconColor: '#48D666',
    title: 'Parking Spots Available',
    desc: 'Get notified when parking spots become available'
  },
  {
    key: 'floorUpdates',
    icon: 'layers',
    iconColor: '#2196F3',
    title: 'Floor Updates',
    desc: 'Receive updates about floor occupancy changes'
  },
  {
    key: 'maintenanceAlerts',
    icon: 'construct',
    iconColor: '#FF9801',
    title: 'Maintenance Alerts',
    desc: 'Get notified about system maintenance'
  },
  {
    key: 'vibration',
    icon: 'vibrate',
    iconColor: '#9C27B0',
    title: 'Vibration',
    desc: 'Enable vibration for notifications',
    isMatCommunity: true
  },
  {
    key: 'sound',
    icon: 'volume-high',
    iconColor: '#4CAF50',
    title: 'Sound',
    desc: 'Play sound with notifications'
  }
];

const APP_SETTINGS = [
  {
    icon: 'person-outline',
    title: 'Profile',
    desc: 'View and edit your profile information',
    navigate: 'Profile' as keyof RootStackParamList
  },
  {
    icon: 'chatbubble-outline',
    title: 'Feedback',
    desc: 'Send feedback and suggestions',
    navigate: 'Feedback' as keyof RootStackParamList
  }
] as const;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, logout, isAuthenticated } = useAuth();
  const [fontsLoaded] = useFonts(FONTS);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const logoutInProgressRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated && !logoutInProgressRef.current) {
        navigation.navigate('Login');
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

  const loadNotificationSettings = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const settings = await NotificationService.getNotificationSettings();
      if (isMountedRef.current) {
        setNotificationSettings(settings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }, []);

  const saveNotificationSettings = useCallback(async (newSettings: NotificationSettings) => {
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
  }, []);

  const handleSettingChange = useCallback((key: keyof NotificationSettings, value: boolean) => {
    if (!isMountedRef.current) return;
    
    const newSettings = { ...notificationSettings, [key]: value };
    saveNotificationSettings(newSettings);
  }, [notificationSettings, saveNotificationSettings]);

  const performLogout = useCallback(async () => {
    if (logoutInProgressRef.current || !isMountedRef.current) return;

    logoutInProgressRef.current = true;

    try {
      if (isMountedRef.current) {
        setLoading(true);
      }

      await logout();
      
      setTimeout(() => {
        if (isMountedRef.current) {
          navigation.navigate('Login');
        }
      }, 100);

    } catch (error) {
      console.error('Logout error in Settings:', error);
      
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
      
      setTimeout(() => {
        logoutInProgressRef.current = false;
      }, 1000);
    }
  }, [logout, navigation]);

  const handleLogout = useCallback(() => {
    if (logoutInProgressRef.current) return;

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
  }, [performLogout]);

  const handleNavigation = useCallback((screen: keyof RootStackParamList) => {
    if (loading) return;
    
    if (screen === 'Profile') {
      navigation.navigate(screen, { userId: user?.id });
    } else {
      navigation.navigate(screen);
    }
  }, [loading, navigation, user?.id]);

  const renderSettingItem = useCallback((item: SettingItem, index: number) => {
    const IconComponent = item.isMatCommunity ? MaterialCommunityIcons : Ionicons;
    
    return (
      <React.Fragment key={item.key}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <IconComponent name={item.icon as any} size={20} color={item.iconColor} />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingDesc}>{item.desc}</Text>
            </View>
          </View>
          <Switch
            value={notificationSettings[item.key]}
            onValueChange={(value) => handleSettingChange(item.key, value)}
            trackColor={SWITCH_COLORS}
            thumbColor={notificationSettings[item.key] ? '#FFFFFF' : '#F4F3F4'}
            disabled={loading}
          />
        </View>
        {index < SETTING_ITEMS.length - 1 && <View style={styles.divider} />}
      </React.Fragment>
    );
  }, [notificationSettings, handleSettingChange, loading]);

  const renderAppSettingItem = useCallback((item: typeof APP_SETTINGS[number], index: number) => (
    <React.Fragment key={item.navigate}>
      <TouchableOpacity 
        style={[styles.settingItem, loading && styles.disabledItem]} 
        onPress={() => handleNavigation(item.navigate)}
        disabled={loading}
      >
        <View style={styles.settingLeft}>
          <Ionicons name={item.icon as any} size={20} color={loading ? "#ccc" : "#666"} />
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, loading && styles.disabledText]}>{item.title}</Text>
            <Text style={[styles.settingDesc, loading && styles.disabledText]}>{item.desc}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={loading ? "#ccc" : "#999"} />
      </TouchableOpacity>
      {index < APP_SETTINGS.length - 1 && <View style={styles.divider} />}
    </React.Fragment>
  ), [loading, handleNavigation]);

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
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications" size={24} color="#B22020" />
            <Text style={styles.cardTitle}>Notification Settings</Text>
          </View>
          
          {SETTING_ITEMS.map(renderSettingItem)}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings" size={24} color="#B22020" />
            <Text style={styles.cardTitle}>App Settings</Text>
          </View>
          
          {APP_SETTINGS.map(renderAppSettingItem)}
        </View>

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

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>VALET v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Your Virtual Parking Buddy</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;