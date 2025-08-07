import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { styles } from './styles/ProfileScreen.style';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Login: undefined;
  Floors: undefined;
  ParkingMap: { floor: number };
  Feedback: undefined;
  Settings: undefined;
  Profile: { userId?: number } | undefined;
  ApiTest: undefined;
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
  route?: {
    params?: {
      userId?: number;
    };
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  role_display?: string;
  employee_id?: string;
  student_id?: string;
  department?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  phone?: string;
  year_level?: string;
  course?: string;
  profile_photo?: string;
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

interface UserStats {
  totalParkingSessions: number;
  hoursParked: number;
  favoriteFloor: number;
  lastParked: string;
}

const API_CONFIG = {
  BASE_URL: 'https://valet.up.railway.app/api/public/users',
  TOKEN: '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad',
  HEADERS: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'VALET-Mobile/1.0',
  }
} as const;

const ALERT_COLORS = {
  success: '#4CAF50',
  warning: '#FF9800',
  confirm: '#F44336',
  info: '#2196F3'
} as const;

const ALERT_ICONS = {
  success: 'check-circle',
  warning: 'warning',
  confirm: 'help',
  info: 'info'
} as const;

const USER_TYPE_ICONS = {
  staff: 'work',
  student: 'school',
  faculty: 'person',
  user: 'person',
  default: 'person'
} as const;

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user: authUser, logout, isAuthenticated } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const isMountedRef = useRef(true);
  const userFetchedRef = useRef(false);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(0.8), []);

  const showAlert = useCallback((config: Omit<AlertConfig, 'visible'>) => {
    if (!isMountedRef.current) return;
    setAlert({ ...config, visible: true });
  }, []);

  const hideAlert = useCallback(() => {
    if (!isMountedRef.current) return;
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  const getInitials = useCallback((name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }, []);

  const formatDate = useCallback((dateString?: string): string => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const formatRelativeTime = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return formatDate(dateString);
    } catch {
      return 'Unknown';
    }
  }, [formatDate]);

  const getUserTypeIcon = useCallback((role: string) => {
    const key = role?.toLowerCase() as keyof typeof USER_TYPE_ICONS;
    return USER_TYPE_ICONS[key] || USER_TYPE_ICONS.default;
  }, []);

  const getUserActions = useMemo(() => [
    {
      icon: 'settings' as const,
      title: 'App Settings',
      desc: 'Manage notifications and preferences',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'feedback' as const,
      title: 'Send Feedback',
      desc: 'Help us improve VALET',
      color: '#2196F3',
      onPress: () => navigation.navigate('Feedback'),
    },
  ], [navigation]);

  const handleEditProfilePhoto = useCallback(() => {
    showAlert({
      title: 'Profile Photo',
      message: 'Profile photo management will be available in a future update. For now, your initials will be displayed as your avatar.',
      type: 'info',
      icon: 'camera-alt',
      confirmText: 'Got it!'
    });
  }, [showAlert]);

  const fetchUserFromAPI = useCallback(async (userId: number): Promise<User | null> => {
    try {
      const response = await fetch(API_CONFIG.BASE_URL, {
        method: 'GET',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
        },
      });

      if (!response.ok) return null;

      const responseData = await response.json();
      
      let users: any[] = [];
      if (Array.isArray(responseData)) {
        users = responseData;
      } else if (responseData.users && Array.isArray(responseData.users)) {
        users = responseData.users;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        users = responseData.data;
      } else {
        return null;
      }

      const currentUser = users.find((u: any) => u.id === userId);
      if (!currentUser) return null;

      if (currentUser.role === 'admin') {
        showAlert({
          title: 'Access Restricted',
          message: 'Admin accounts should use the web dashboard. This mobile app is designed for students and staff only.',
          type: 'warning',
          icon: 'block',
          confirmText: 'Understood',
          onConfirm: () => navigation.navigate('Home')
        });
        return null;
      }

      if (currentUser.is_active === false) {
        showAlert({
          title: 'Account Inactive',
          message: 'Your account has been deactivated. Please contact the administrator.',
          type: 'warning',
          icon: 'block',
          confirmText: 'OK',
          onConfirm: handleForceLogout
        });
        return null;
      }

      if (authUser && authUser.id === userId) {
        try {
          await AsyncStorage.setItem('valet_user_data', JSON.stringify(currentUser));
        } catch (error) {
          console.log('Error updating stored user data:', error);
        }
      }
      
      return currentUser;
    } catch (error: any) {
      console.log('Error fetching user from API:', error);
      return null;
    }
  }, [authUser, showAlert, navigation]);

  const handleForceLogout = useCallback(async () => {
    try {
      await logout();
      navigation.navigate('Home');
    } catch (error) {
      console.log('Error during force logout:', error);
      navigation.navigate('Home');
    }
  }, [logout, navigation]);

  const loadUserStats = useCallback(async (userId: number) => {
    if (!isMountedRef.current) return;
    
    try {
      const mockStats: UserStats = {
        totalParkingSessions: Math.floor(Math.random() * 50) + 10,
        hoursParked: Math.floor(Math.random() * 200) + 50,
        favoriteFloor: Math.floor(Math.random() * 4) + 1,
        lastParked: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      if (isMountedRef.current) {
        setUserStats(mockStats);
      }
    } catch (error) {
      console.log('Error loading user stats:', error);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);

      if (!isAuthenticated || !authUser) {
        showAlert({
          title: 'Not Logged In',
          message: 'Please log in to view your profile.',
          type: 'warning',
          icon: 'login',
          confirmText: 'Go to Login',
          onConfirm: () => navigation.navigate('Home')
        });
        return;
      }

      const targetUserId = route?.params?.userId || authUser.id;
      const apiUser = await fetchUserFromAPI(targetUserId);
      
      if (apiUser) {
        setUser(apiUser);
      } else if (authUser.id === targetUserId) {
        setUser(authUser as User);
      } else {
        throw new Error('User data not available');
      }

      await loadUserStats(targetUserId);
    } catch (error) {
      console.log('Error loading current user:', error);
      
      if (isMountedRef.current) {
        showAlert({
          title: 'Loading Error',
          message: 'Couldn\'t load your profile. Using cached data.',
          type: 'warning',
          icon: 'warning',
          confirmText: 'OK'
        });

        if (authUser) {
          setUser(authUser as User);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [isAuthenticated, authUser, route?.params?.userId, fetchUserFromAPI, loadUserStats, showAlert, navigation]);

  const onRefresh = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setRefreshing(true);
    userFetchedRef.current = false;
    loadCurrentUser();
  }, [loadCurrentUser]);

  const handleLogout = useCallback(() => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of VALET? You\'ll need to sign in again to use the app.',
      type: 'confirm',
      icon: 'logout',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await logout();
          
          showAlert({
            title: 'Signed Out',
            message: 'You have been successfully signed out of VALET.',
            type: 'success',
            icon: 'check-circle',
            confirmText: 'OK',
            onConfirm: () => navigation.navigate('Login')
          });
        } catch (error) {
          showAlert({
            title: 'Error',
            message: 'Something went wrong while signing out. Please try again.',
            type: 'warning',
            icon: 'error',
            confirmText: 'OK',
          });
        }
        hideAlert();
      },
      onCancel: hideAlert,
    });
  }, [showAlert, hideAlert, logout, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const checkAuthAndLoad = async () => {
        if (!isActive || !isMountedRef.current) return;

        if (!isAuthenticated) {
          navigation.navigate('Home');
          return;
        }

        if (!userFetchedRef.current && isActive) {
          await loadCurrentUser();
          userFetchedRef.current = true;
        }
      };

      checkAuthAndLoad();

      return () => {
        isActive = false;
        userFetchedRef.current = false;
      };
    }, [isAuthenticated, navigation, loadCurrentUser])
  );

  useEffect(() => {
    isMountedRef.current = true;

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

    return () => {
      isMountedRef.current = false;
    };
  }, [alert.visible, fadeAnim, scaleAnim]);

  const CustomAlert = useCallback(() => {
    const getIconColor = () => ALERT_COLORS[alert.type];

    return (
      <Modal
        transparent
        visible={alert.visible}
        onRequestClose={hideAlert}
        animationType="none"
      >
        <Animated.View 
          style={[styles.alertOverlay, { opacity: fadeAnim }]}
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
  }, [alert, fadeAnim, scaleAnim, hideAlert]);

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <MaterialIcons name="person" size={48} color="#B71C1C" />
          <Text style={styles.loadingText}>Loading Your Profile...</Text>
          <Text style={styles.loadingSubtext}>
            {authUser ? `Welcome ${authUser.name || authUser.email}` : 'Fetching latest data from server'}
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
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={['#B72C20', '#4C0E0E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name ? getInitials(user.name) : (authUser?.name ? getInitials(authUser.name) : 'U')}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={handleEditProfilePhoto}
                activeOpacity={0.7}
              >
                <MaterialIcons name="camera-alt" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>
                {user?.name || authUser?.name || 'Unknown User'}
              </Text>
              <View style={styles.userStatusContainer}>
                <Text style={styles.userType}>
                  {user?.email}
                </Text>
                {(user?.is_active !== false) && (
                  <View style={styles.activeStatus}>
                    <MaterialIcons name="check-circle" size={12} color="#4CAF50" />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="dashboard" size={20} color="#B71C1C" />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>

          {getUserActions.map((action, index) => (
            <View key={action.title}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={action.onPress}
              >
                <View style={styles.actionLeft}>
                  <MaterialIcons name={action.icon} size={20} color={action.color} />
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDesc}>{action.desc}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              {index < getUserActions.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="help" size={20} color="#B71C1C" />
            <Text style={styles.cardTitle}>Support & Info</Text>
          </View>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => showAlert({
              title: 'Privacy & Data',
              message: 'VALET respects your privacy. We only collect necessary information to provide parking services and improve your experience. Your data is synced securely with our servers.',
              type: 'info',
              icon: 'privacy-tip',
              confirmText: 'Understood'
            })}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="privacy-tip" size={20} color="#9C27B0" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Privacy & Data</Text>
                <Text style={styles.actionDesc}>How we protect your information</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => showAlert({
              title: 'About VALET Mobile',
              message: 'VALET Mobile - Your Parking Buddy!\nVersion 1.0.0\n© 2025 VALET Team',
              type: 'info',
              icon: 'info',
              confirmText: 'Cool!'
            })}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="info" size={20} color="#2196F3" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>About VALET Mobile</Text>
                <Text style={styles.actionDesc}>App info and version</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.outBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#F44336" />
          <Text style={styles.outBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.refreshHint}>
          <MaterialIcons name="refresh" size={16} color="#999" />
          <Text style={styles.refreshHintText}>Pull down to sync with server</Text>
        </View>
      </ScrollView>

      <CustomAlert />
    </View>
  );
};

export default ProfileScreen;