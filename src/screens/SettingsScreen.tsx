import React, { useState, useEffect } from 'react';
import { View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles/SettingsSecreen.style';

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

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  type: 'info' | 'success' | 'warning' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const SETTINGS_KEY = '@valet_notification_settings';

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    spotAvailable: true,
    floorUpdates: true,
    maintenanceAlerts: false,
    vibration: true,
    sound: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      autoSaveSettings();
    }
  }, [notifications, isLoading]);

  useEffect(() => {
    if (alert.visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [alert.visible]);

  const showAlert = (config: Omit<AlertConfig, 'visible'>) => {
    setAlert({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNotifications(parsedSettings);
      } else {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(notifications));
      }
    } catch (error) {
      showAlert({
        title: 'Loading Error',
        message: 'Couldn\'t load your saved settings. Don\'t worry - VALET will use the default settings for now.',
        type: 'warning',
        icon: 'warning',
        confirmText: 'OK',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const autoSaveSettings = async () => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(notifications));
      console.log('Settings saved');
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetSettings = () => {
    showAlert({
      title: 'Reset Settings',
      message: 'This will turn off all notifications and reset VALET to how it was when you first installed it. You can always change these settings again later.',
      type: 'confirm',
      icon: 'restore',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const defaultSettings = {
          spotAvailable: false,
          floorUpdates: false,
          maintenanceAlerts: false,
          vibration: false,
          sound: false,
        };
        
        setNotifications(defaultSettings);
        
        try {
          await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
          showAlert({
            title: 'Success',
            message: 'All settings have been reset! VALET is now back to its original settings.',
            type: 'success',
            icon: 'check-circle',
            confirmText: 'OK',
          });
        } catch (error) {
          showAlert({
            title: 'Error',
            message: 'Something went wrong while resetting. Please try again in a moment.',
            type: 'warning',
            icon: 'error',
            confirmText: 'OK',
          });
        }
        hideAlert();
      },
      onCancel: hideAlert,
    });
  };

  const CustomAlert = () => {
    const getIconColor = () => {
      switch (alert.type) {
        case 'success': return '#4CAF50';
        case 'warning': return '#FF9800';
        case 'confirm': return '#F44336';
        default: return '#2196F3';
      }
    };

    const getIcon = () => {
      if (alert.icon) return alert.icon;
      switch (alert.type) {
        case 'success': return 'check-circle';
        case 'warning': return 'warning';
        case 'confirm': return 'help';
        default: return 'info';
      }
    };

    return (
      <Modal
        transparent
        visible={alert.visible}
        onRequestClose={hideAlert}
        animationType="none"
      >
        <Animated.View 
          style={[
            styles.alertOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.alertBackdrop}
            activeOpacity={1}
            onPress={hideAlert}
          />
          
          <Animated.View 
            style={[
              styles.alertContainer,
              { 
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim 
              }
            ]}
          >
            <View style={styles.alertHeader}>
              <View style={[styles.alertIconContainer, { backgroundColor: getIconColor() + '20' }]}>
                <MaterialIcons 
                  name={getIcon() as any} 
                  size={32} 
                  color={getIconColor()} 
                />
              </View>
              <Text style={styles.alertTitle}>{alert.title}</Text>
            </View>
            
            <Text style={styles.alertMessage}>{alert.message}</Text>
            
            <View style={styles.alertButtons}>
              {alert.type === 'confirm' && (
                <TouchableOpacity 
                  style={[styles.alertButton, styles.alertCancelButton]}
                  onPress={alert.onCancel}
                >
                  <Text style={styles.alertCancelText}>
                    {alert.cancelText || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.alertButton, 
                  styles.alertConfirmButton,
                  { backgroundColor: getIconColor() }
                ]}
                onPress={() => {
                  if (alert.onConfirm) {
                    alert.onConfirm();
                  } else {
                    hideAlert();
                  }
                }}
              >
                <Text style={styles.alertConfirmText}>
                  {alert.confirmText || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <MaterialIcons name="settings" size={48} color="#B71C1C" />
          <Text style={styles.loadingText}>Loading Settings...</Text>
          <View style={styles.loadingBar}>
            <View style={styles.loadingProgress} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="notifications" size={20} color="#B71C1C" />
            <Text style={styles.cardTitle}>Notifications</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="local-parking" size={20} color="#4CAF50" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Spot Available</Text>
                <Text style={styles.settingDesc}>Get notified when spots open</Text>
              </View>
            </View>
            <Switch
              value={notifications.spotAvailable}
              onValueChange={() => handleNotificationToggle('spotAvailable')}
              trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="update" size={20} color="#2196F3" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Floor Updates</Text>
                <Text style={styles.settingDesc}>When floors get busy or free up</Text>
              </View>
            </View>
            <Switch
              value={notifications.floorUpdates}
              onValueChange={() => handleNotificationToggle('floorUpdates')}
              trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="vibration" size={20} color="#9C27B0" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Vibration</Text>
                <Text style={styles.settingDesc}>Vibrate when you get notifications</Text>
              </View>
            </View>
            <Switch
              value={notifications.vibration}
              onValueChange={() => handleNotificationToggle('vibration')}
              trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="volume-up" size={20} color="#FF5722" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Sound</Text>
                <Text style={styles.settingDesc}>Play sounds with notifications</Text>
              </View>
            </View>
            <Switch
              value={notifications.sound}
              onValueChange={() => handleNotificationToggle('sound')}
              trackColor={{ false: '#E0E0E0', true: '#B71C1C' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* App Preferences Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="tune" size={20} color="#B71C1C" />
            <Text style={styles.cardTitle}>App Preferences</Text>
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showAlert({
              title: 'Auto-Refresh',
              message: 'VALET automatically checks for new parking spots every 5 seconds. This means you always see the latest available spots without having to manually refresh the app.',
              type: 'info',
              icon: 'refresh',
              confirmText: 'Got it'
            })}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="refresh" size={20} color="#4CAF50" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto-Refresh</Text>
                <Text style={styles.settingDesc}>Keeps parking info fresh</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showAlert({
              title: 'Clear Cache',
              message: 'This will clear temporary app data to free up space on your phone. Your notification settings will stay the same.',
              type: 'confirm',
              icon: 'clear',
              confirmText: 'Clear Cache',
              cancelText: 'Cancel',
              onConfirm: () => {
                showAlert({
                  title: 'Success',
                  message: 'Cache cleared! VALET will now get fresh parking data.',
                  type: 'success',
                  confirmText: 'OK'
                });
              },
              onCancel: hideAlert
            })}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="clear" size={20} color="#FF9800" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Clear Cache</Text>
                <Text style={styles.settingDesc}>Free up phone storage</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* About Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info" size={20} color="#B71C1C" />
            <Text style={styles.cardTitle}>About & Support</Text>
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showAlert({
              title: 'About VALET',
              message: 'VALET - Your Parking Buddy!\n\n© 2025 VALET Team',
              type: 'info',
              icon: 'info',
              confirmText: 'Cool!'
            })}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="info-outline" size={20} color="#2196F3" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>About VALET</Text>
                <Text style={styles.settingDesc}>Version 1.0.0</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showAlert({
              title: 'Help & FAQ',
              message: '❓ Common Questions:\n\n• How do I find parking?\n  Tap on "Floors" to see available spots on each level\n\n• Why does it show "Full"?\n  All parking spots on that floor are taken\n\n• How fresh is the information?\n  VALET updates every 5 seconds to show the latest spots\n\n• What if I need more help?\n  Use the Feedback screen to ask questions!',
              type: 'info',
              icon: 'help',
              confirmText: 'Thanks!'
            })}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="help" size={20} color="#4CAF50" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Help & FAQ</Text>
                <Text style={styles.settingDesc}>Questions? We have answers!</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showAlert({
              title: 'Contact Support',
              message: '📞 Need Help?\n\n📧 Email: support@valet-parking.com\n📱 Phone: +63 123 456 7890\n🕒 Available 24/7\n\n💬 Quick Tip: Use the Feedback screen in the app for faster help!\n\nOur friendly support team is here to help with any questions.',
              type: 'info',
              icon: 'headset-mic',
              confirmText: 'Got it'
            })}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="headset-mic" size={20} color="#FF9800" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Contact Support</Text>
                <Text style={styles.settingDesc}>Need help? We're here!</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => showAlert({
              title: 'Privacy Policy',
              message: '🔒 Your Privacy is Safe:\n\n• We don\'t collect your personal information\n• We only track how the app is used (no names or details)\n• This helps us make VALET better for everyone\n• We follow all privacy laws to protect you\n\nWe respect your privacy and keep your data secure.',
              type: 'info',
              icon: 'privacy-tip',
              confirmText: 'Understood'
            })}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="privacy-tip" size={20} color="#9C27B0" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingDesc}>How we keep your info safe</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
          <MaterialIcons name="restore" size={20} color="#F44336" />
          <Text style={styles.resetButtonText}>Reset to Default</Text>
        </TouchableOpacity>

        {/* Auto-save indicator */}
        <View style={styles.autoSaveIndicator}>
          <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.autoSaveText}>Settings saved automatically</Text>
        </View>
      </ScrollView>

      <CustomAlert />
    </View>
  );
};

export default SettingsScreen;