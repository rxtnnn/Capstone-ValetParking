import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { NotificationSettings } from '../services/NotificationService';
import { NotificationManager } from '../services/NotifManager';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { styles } from './styles/SettingsScreen.style';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/AppConst'; 

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  Login: undefined;
  Profile: { userId?: number } | undefined;
  ParkingMap: undefined;
  Feedback: undefined;
};

type SettingsScreenNavigationProp = NavigationProp<RootStackParamList>;

const FONTS = { Poppins_400Regular, Poppins_600SemiBold };

const DEFAULT_SETTINGS: NotificationSettings = {
  spotAvailable: true,
  floorUpdates: true,
  vibration: true,
  sound: true,
};

const SWITCH_COLORS = {
  false: '#E0E0E0',
  true: COLORS.primary
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
  { key: 'spotAvailable', icon: 'car', iconColor: '#48D666', title: 'Parking Spots Available', desc: 'Get notified when parking spots become available' },
  { key: 'floorUpdates', icon: 'layers', iconColor: '#2196F3', title: 'Floor Updates', desc: 'Receive updates about floor occupancy changes' },
  { key: 'vibration', icon: 'vibrate', iconColor: '#9C27B0', title: 'Vibration', desc: 'Enable vibration for notifications', isMatCommunity: true },
  { key: 'sound', icon: 'volume-high', iconColor: '#4CAF50', title: 'Sound', desc: 'Play sound with notifications' },
];

const APP_SETTINGS = [
  { icon: 'person-outline', title: 'Profile', desc: 'View and edit your profile', navigate: 'Profile' as keyof RootStackParamList },
  { icon: 'chatbubble-outline', title: 'Feedback', desc: 'Send feedback & suggestions', navigate: 'Feedback' as keyof RootStackParamList }
] as const;

// Custom Alert Modal Component
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  type?: 'default' | 'logout' | 'error';
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'OK',
  type = 'default'
}) => {
  const { width } = Dimensions.get('window');

  const getIcon = () => {
    switch (type) {
      case 'logout':
        return <Ionicons name="log-out-outline" size={32} color="#E53E3E" />;
      case 'error':
        return <Ionicons name="alert-circle-outline" size={32} color="#B22020" />;
      default:
        return <Ionicons name="information-circle-outline" size={32} color="#2196F3" />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.alertcontainer}>
          <View style={styles.alertheader}>
            {getIcon()}
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button, 
                type === 'error' ? styles.errorConfirmButton : styles.confirmButton
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, logout, isAuthenticated } = useAuth();
  const [fontsLoaded] = useFonts(FONTS);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState<Set<keyof NotificationSettings>>(new Set());
  const [userContext, setUserContext] = useState<{ id: number | null; name?: string; isAuthenticated: boolean }>({
    id: null,
    isAuthenticated: false
  });

  // Alert modal states
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    cancelText?: string;
    confirmText?: string;
    type?: 'default' | 'logout' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const isMountedRef = useRef(true);
  const logoutInProgressRef = useRef(false);

  const getSettingsKey = () => {
    const uid = user?.id;
    if (!uid) throw new Error('User not authenticated');
    return `valet_notification_settings_${uid}`;
  };

  // Custom alert function
  const showAlert = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    cancelText = 'Cancel', 
    confirmText = 'OK',
    type: 'default' | 'logout' | 'error' = 'default'
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm,
      cancelText,
      confirmText,
      type,
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // Update user context when auth state changes
  useEffect(() => {
    if (user && isAuthenticated) {
      setUserContext({
        id: user.id,
        name: user.name,
        isAuthenticated: true
      });
    } else {
      setUserContext({
        id: null,
        isAuthenticated: false
      });
    }
  }, [user, isAuthenticated]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated && !logoutInProgressRef.current) {
        navigation.navigate('Login');
      }
    }, [isAuthenticated, navigation])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        loadNotificationSettings();
      }
    }, [isAuthenticated, user])
  );

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadNotificationSettings = useCallback(async () => {
    if (!isMountedRef.current || !isAuthenticated || !user) return;
    setSettingsLoading(true);
    try {
      const key = getSettingsKey();
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setNotificationSettings(JSON.parse(stored));
      } else {
        setNotificationSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
      showAlert(
        'Settings Error',
        'Could not load preferences, using defaults.',
        () => {
          hideAlert();
          setNotificationSettings(DEFAULT_SETTINGS);
        },
        '',
        'OK',
        'error'
      );
    } finally {
      if (isMountedRef.current) setSettingsLoading(false);
    }
  }, [isAuthenticated, user]);

  const saveNotificationSettings = useCallback(async (newSettings: NotificationSettings, changedKey?: keyof NotificationSettings) => {
    if (!isMountedRef.current || !isAuthenticated || !user) return;
    if (changedKey) setSavingSettings(prev => new Set(prev).add(changedKey));
    try {
      const key = getSettingsKey();
      await AsyncStorage.setItem(key, JSON.stringify(newSettings));
      setNotificationSettings(newSettings);
    } catch (error) {
      console.log('Error saving settings:', error);
      showAlert(
        'Save Error',
        'Failed to save preferences.',
        () => {
          hideAlert();
          loadNotificationSettings();
        },
        '',
        'OK',
        'error'
      );
    } finally {
      if (changedKey && isMountedRef.current) {
        setSavingSettings(prev => { const s = new Set(prev); s.delete(changedKey); return s; });
      }
    }
  }, [isAuthenticated, user, loadNotificationSettings]);

  const handleSettingChange = useCallback((key: keyof NotificationSettings, value: boolean) => {
    if (savingSettings.has(key)) return;
    const updated = { ...notificationSettings, [key]: value };
    saveNotificationSettings(updated, key);
  }, [notificationSettings, saveNotificationSettings, savingSettings]);

  const performLogout = useCallback(async () => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;
    setLoading(true);
    hideAlert();
    try {
      // clear storage
      await AsyncStorage.removeItem(getSettingsKey());
      await NotificationManager.onUserLogout();
      await logout();
      navigation.navigate('Login');
    } catch (error) {
      console.log('Logout error:', error);
      showAlert(
        'Logout Error',
        'Please try again.',
        hideAlert,
        '',
        'OK',
        'error'
      );
    } finally {
      setLoading(false);
      logoutInProgressRef.current = false;
    }
  }, [logout, navigation, user]);

  const handleLogout = useCallback(() => {
    if (!user) return;
    showAlert(
      'Sign Out',
      `Are you sure you want to sign out of VALET? You'll need to sign in again to use the app.`,
      performLogout,
      'Cancel',
      'Sign Out',
      'logout'
    );
  }, [performLogout, user]);

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
    const isSaving = savingSettings.has(item.key);
    
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isSaving && (
              <ActivityIndicator 
                size="small" 
                color="#B22020" 
                style={{ marginRight: 8 }} 
              />
            )}
            <Switch
              value={notificationSettings[item.key]}
              onValueChange={(value) => handleSettingChange(item.key, value)}
              trackColor={SWITCH_COLORS}
              thumbColor={notificationSettings[item.key] ? '#FFFFFF' : '#F4F3F4'}
              disabled={loading || settingsLoading || isSaving || !user}
            />
          </View>
        </View>
        {index < SETTING_ITEMS.length - 1 && <View style={styles.divider} />}
      </React.Fragment>
    );
  }, [notificationSettings, handleSettingChange, loading, settingsLoading, savingSettings, user]);

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
          <Ionicons name="settings" size={48} color="#B22020 "/>
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
      <StatusBar barStyle="light-content" backgroundColor="COLORS.primary" />

      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {settingsLoading ? (
            <View style={styles.settingsLoading}>
              <ActivityIndicator size="large" color="#B22020" />
              <Text style={styles.loadingText}>Loading your preferences...</Text>
            </View>
          ) : (
            <>
              <View style={styles.cardHeader}>
                <Ionicons name="notifications" size={24} color="#B22020" />
                <Text style={styles.cardTitle}>Notifications</Text>
              </View>
              {SETTING_ITEMS.map(renderSettingItem)}
            </>
          )}
        </View>

        <View style={styles.card}>
          {APP_SETTINGS.map(renderAppSettingItem)}
        </View>

        <View style={styles.LogoutCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="log-out" size={24} color="#F44336" />
            <Text style={styles.cardTitle}>Account Actions</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.settingItem, loading && styles.disabledItem]} 
            onPress={handleLogout}
            disabled={loading || logoutInProgressRef.current || !user}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={20} color={loading ? "#ccc" : "#F44336"} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: loading ? "#ccc" : '#F44336' }]}>
                  {logoutInProgressRef.current ? 'Logging out...' : 'Logout'}
                </Text>
                <Text style={[styles.settingDesc, loading && styles.disabledText]}>
                  Sign out of your VALET account
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={loading ? "#ccc" : "#F44336"} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onCancel={hideAlert}
        onConfirm={alertConfig.onConfirm}
        cancelText={alertConfig.cancelText}
        confirmText={alertConfig.confirmText}
        type={alertConfig.type}
      />
    </View>
  );
};

export default SettingsScreen;