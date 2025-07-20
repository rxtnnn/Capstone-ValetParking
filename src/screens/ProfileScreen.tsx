import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { styles } from './styles/ProfileScreen.style';


type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
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

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
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

  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  // Refresh profile data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadCurrentUser();
    }, [])
  );

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

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      // First, try to get user from route params
      const routeUserId = route?.params?.userId;
      
      // If no route user ID, get logged-in user ID from AuthService storage
      const userData = await AsyncStorage.getItem('valet_user_data');
      
      if (!userData && !routeUserId) {
        showAlert({
          title: 'Not Logged In',
          message: 'Please log in to view your profile.',
          type: 'warning',
          icon: 'login',
          confirmText: 'Go to Login',
          onConfirm: () => {
            AsyncStorage.multiRemove(['valet_auth_token', 'valet_user_data']);
            navigation.navigate('Home');
          }
        });
        return;
      }

      let targetUserId: number;
      
      if (routeUserId) {
        targetUserId = routeUserId;
        console.log('Using user ID from route params:', targetUserId);
      } else {
        const loggedInUser = JSON.parse(userData!);
        targetUserId = loggedInUser.id;
        console.log('Using logged-in user ID from storage:', targetUserId);
      }

      // Fetch latest user data from API
      await fetchUserFromAPI(targetUserId);

    } catch (error) {
      console.error('Error loading current user:', error);
      showAlert({
        title: 'Loading Error',
        message: 'Couldn\'t load your profile. Please try logging in again.',
        type: 'warning',
        icon: 'warning',
        confirmText: 'OK',
        onConfirm: () => navigation.navigate('Home')
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserFromAPI = async (userId: number) => {
    try {
      const response = await fetch('https://valet.up.railway.app/api/users', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'VALET-Mobile/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      const users = responseData.users || responseData;
      
      if (!Array.isArray(users)) {
        throw new Error('Invalid API response format - users is not an array');
      }

      const currentUser = users.find((u: any) => u.id === userId);

      if (!currentUser) {
        throw new Error(`User with ID ${userId} not found in API response`);
      }

      console.log('👤 Current user found:', currentUser.name || currentUser.email);

      if (currentUser.role === 'admin') {
        showAlert({
          title: 'Access Restricted',
          message: 'Admin accounts should use the web dashboard. This mobile app is designed for students and staff only.',
          type: 'warning',
          icon: 'block',
          confirmText: 'Understood',
          onConfirm: () => navigation.navigate('Home')
        });
        return;
      }

      // Check if user account is active
      if (currentUser.is_active === false) {
        showAlert({
          title: 'Account Inactive',
          message: 'Your account has been deactivated. Please contact the administrator.',
          type: 'warning',
          icon: 'block',
          confirmText: 'OK',
          onConfirm: () => {
            handleForceLogout();
          }
        });
        return;
      }

      // Update user data in local storage with latest from API (only if it's the logged-in user)
      const storedUserData = await AsyncStorage.getItem('valet_user_data');
      if (storedUserData) {
        const storedUser = JSON.parse(storedUserData);
        if (storedUser.id === userId) {
          await AsyncStorage.setItem('valet_user_data', JSON.stringify(currentUser));
        }
      }
      
      setUser(currentUser);
      await loadUserStats(currentUser.id);

    } catch (error: any) {
      if (error.message.includes('not found in API')) {
        showAlert({
          title: 'Account Not Found',
          message: 'Your account was not found in the system. Please contact support or try logging in again.',
          type: 'warning',
          icon: 'warning',
          confirmText: 'Logout',
          onConfirm: () => handleForceLogout()
        });
      } else if (error.message.includes('HTTP 404')) {
        showAlert({
          title: 'Service Unavailable',
          message: 'The user service is currently unavailable. Please try again later.',
          type: 'warning',
          icon: 'warning',
          confirmText: 'OK'
        });
      } else if (error.message.includes('Network') || error.message.includes('fetch')) {
        showAlert({
          title: 'Connection Error',
          message: 'Cannot connect to the server. Please check your internet connection and try again.',
          type: 'warning',
          icon: 'warning',
          confirmText: 'Retry',
          onConfirm: () => loadCurrentUser()
        });
      } else {
        showAlert({
          title: 'Loading Error',
          message: `Couldn't load profile data: ${error.message}`,
          type: 'warning',
          icon: 'warning',
          confirmText: 'OK'
        });
      }
    }
  };

  const handleForceLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'valet_auth_token', 
        'valet_user_data', 
        '@valet_notification_settings'
      ]);
      navigation.navigate('Splash');
    } catch (error) {
      console.error('Error during force logout:', error);
      navigation.navigate('Splash');
    }
  };

  const loadUserStats = async (userId: number) => {
    try {
      const mockStats: UserStats = {
        totalParkingSessions: Math.floor(Math.random() * 50) + 10,
        hoursParked: Math.floor(Math.random() * 200) + 50,
        favoriteFloor: Math.floor(Math.random() * 3) + 1,
        lastParked: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      setUserStats(mockStats);
      console.log('✅ User stats loaded');
    } catch (error) {
      console.error('Error loading user stats:', error);
      // Stats are optional, don't show error
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCurrentUser();
  };

  const handleLogout = () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of VALET? You\'ll need to sign in again to use the app.',
      type: 'confirm',
      icon: 'logout',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await AsyncStorage.multiRemove([
            'valet_auth_token', 
            'valet_user_data', 
            '@valet_notification_settings'
          ]);
          
          showAlert({
            title: 'Signed Out',
            message: 'You have been successfully signed out of VALET.',
            type: 'success',
            icon: 'check-circle',
            confirmText: 'OK',
            onConfirm: () => navigation.navigate('Home')
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
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const formatDate = (dateString?: string): string => {
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
  };

  const formatRelativeTime = (dateString: string): string => {
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
  };

  const getUserTypeIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'staff': return 'work' as const;
      case 'student': return 'school' as const;
      case 'faculty': return 'person' as const;
      case 'user': return 'person' as const;
      default: return 'person' as const;
    }
  };

  const getUserActions = () => {
    return [
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
    ];
  };

  const renderDynamicFields = () => {
    const fields = [];

    // Email (always show if available)
    if (user?.email) {
      fields.push(
        <View key="email">
          <View style={styles.infoItem}>
            <MaterialIcons name="email" size={20} color="#2196F3" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>
      );
    }

    // ID Field (employee_id or student_id)
    const idField = user?.employee_id || user?.student_id;
    if (idField) {
      fields.push(
        <View key="id">
          <View style={styles.infoItem}>
            <MaterialIcons name="badge" size={20} color="#4CAF50" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>
                {user?.employee_id ? 'Employee ID' : 'Student ID'}
              </Text>
              <Text style={styles.infoValue}>{idField}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>
      );
    }

    // Role (simplified for users)
    if (user?.role_display && user.role !== 'admin') {
      fields.push(
        <View key="role">
          <View style={styles.infoItem}>
            <MaterialIcons name={getUserTypeIcon(user?.role || '')} size={20} color="#2196F3" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role_display}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>
      );
    }

    // Department
    if (user?.department) {
      fields.push(
        <View key="department">
          <View style={styles.infoItem}>
            <MaterialIcons name="business" size={20} color="#FF9800" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{user.department}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>
      );
    }

    // Course (for students)
    if (user?.course) {
      fields.push(
        <View key="course">
          <View style={styles.infoItem}>
            <MaterialIcons name="school" size={20} color="#673AB7" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue}>{user.course}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>
      );
    }

    // Year Level (for students)
    if (user?.year_level) {
      fields.push(
        <View key="year">
          <View style={styles.infoItem}>
            <MaterialIcons name="grade" size={20} color="#E91E63" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Year Level</Text>
              <Text style={styles.infoValue}>{user.year_level}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>
      );
    }

    // Phone (if available)
    if (user?.phone) {
      fields.push(
        <View key="phone">
          <View style={styles.infoItem}>
            <MaterialIcons name="phone" size={20} color="#4CAF50" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>
      );
    }

    // Member Since (always show)
    fields.push(
      <View key="created">
        <View style={styles.infoItem}>
          <MaterialIcons name="access-time" size={20} color="#607D8B" />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{formatDate(user?.created_at)}</Text>
          </View>
        </View>
      </View>
    );

    return fields;
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
      if (alert.icon) return alert.icon as any;
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
              <View style={[styles.alertIconContainer, { backgroundColor: getIconColor() + '20' }]}>
                <MaterialIcons 
                  name={getIcon()} 
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
          <MaterialIcons name="person" size={48} color="#B71C1C" />
          <Text style={styles.loadingText}>Loading Your Profile...</Text>
          <Text style={styles.loadingSubtext}>Fetching latest data from server</Text>
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
        {/* Profile Header Card */}
        <LinearGradient
          colors={['#B72C20', '#4C0E0E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? getInitials(user.name) : 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || 'Unknown User'}</Text>
              <View style={styles.userStatusContainer}>
                <Text style={styles.userType}>
                  {user?.role_display || 'VALET User'} {(user?.employee_id || user?.student_id) && `• ${user?.employee_id || user?.student_id}`}
                </Text>
                {user?.is_active && (
                  <View style={styles.activeStatus}>
                    <MaterialIcons name="check-circle" size={12} color="#4CAF50" />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                )}
              </View>
              {user?.department && (
                <Text style={styles.userDepartment}>{user.department}</Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => showAlert({
              title: 'Edit Profile',
              message: 'Profile editing is not available in the mobile app. Please contact your administrator to update your information.',
              type: 'info',
              icon: 'edit',
              confirmText: 'Got it'
            })}
          >
            <MaterialIcons name="edit" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Account Information Card - Dynamic Fields */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="account-circle" size={20} color="#B71C1C" />
            <Text style={styles.cardTitle}>Account Information</Text>
          </View>
          
          {renderDynamicFields()}
        </View>

        {/* Quick Actions Card - User Actions Only */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="dashboard" size={20} color="#B71C1C" />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>

          {getUserActions().map((action, index) => (
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
              {index < getUserActions().length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Support Card */}
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
              message: 'VALET Mobile - Your Parking Buddy!\nVersion 1.0.0 quickly and easily\n© 2025 VALET Team',
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

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#F44336" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Refresh hint */}
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