import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

const { width } = Dimensions.get('window');

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
  role: string;
  role_display: string;
  employee_id?: string;
  student_id?: string;
  department: string;
  is_active: boolean;
  created_at: string;
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
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [alert, setAlert] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadUserProfile();
    }
  }, [currentUserId]);

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
      // Check if specific user ID was passed via navigation
      const targetUserId = route?.params?.userId;
      
      if (targetUserId) {
        setCurrentUserId(targetUserId);
        return;
      }

      // Try to get current user ID from storage
      const storedUserId = await AsyncStorage.getItem('@current_user_id');
      if (storedUserId) {
        setCurrentUserId(parseInt(storedUserId));
        return;
      }

      // Default to first user if no specific ID
      setCurrentUserId(1);
    } catch (error) {
      console.error('Error loading current user ID:', error);
      setCurrentUserId(1);
    }
  };

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      console.log(`📡 Fetching profile for user ID: ${currentUserId}`);

      // Fetch user data
      const userResponse = await fetch('https://valet.up.railway.app/api/users', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'VALET-Mobile/1.0',
        },
      });

      if (!userResponse.ok) {
        throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();
      console.log('✅ User data loaded:', userData);

      // Find specific user or use first one
      let userInfo: User | null = null;
      if (userData.users && Array.isArray(userData.users)) {
        userInfo = userData.users.find((u: { id: number | null; }) => u.id === currentUserId) || userData.users[0];
      }

      if (!userInfo) {
        throw new Error('User not found');
      }

      // Check if user is admin - mobile app is for users only
      if (userInfo.role === 'admin') {
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

      setUser(userInfo);

      // Load user stats (simulated for now - replace with real API call)
      await loadUserStats(userInfo.id);

    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      showAlert({
        title: 'Loading Error',
        message: error.message === 'User not found' 
          ? 'User account not found. Please contact support.'
          : 'Couldn\'t load profile data. Please check your connection and try again.',
        type: 'warning',
        icon: 'warning',
        confirmText: 'OK',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserStats = async (userId: number) => {
    try {
      // Simulate user stats - replace with actual API call
      // const statsResponse = await fetch(`https://valet.up.railway.app/api/users/${userId}/stats`);
      
      // Mock data for now
      const mockStats: UserStats = {
        totalParkingSessions: Math.floor(Math.random() * 50) + 10,
        hoursParked: Math.floor(Math.random() * 200) + 50,
        favoriteFloor: Math.floor(Math.random() * 3) + 1,
        lastParked: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      setUserStats(mockStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
      // Stats are optional, don't show error
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
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
            '@user_token', 
            '@user_data', 
            '@current_user_id',
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
    switch (role.toLowerCase()) {
      case 'staff': return 'work' as const;
      case 'student': return 'school' as const;
      case 'faculty': return 'person' as const;
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
      {
        icon: 'history' as const,
        title: 'Parking History',
        desc: 'View your parking sessions',
        color: '#9C27B0',
        onPress: () => showAlert({
          title: 'Parking History',
          message: 'Your parking history will show here soon! Track where and when you\'ve parked on campus.',
          type: 'info',
          icon: 'history',
          confirmText: 'Awesome!'
        }),
      },
      {
        icon: 'notifications' as const,
        title: 'Notification Center',
        desc: 'View recent parking alerts',
        color: '#FF9800',
        onPress: () => showAlert({
          title: 'Notification Center',
          message: 'Your notification history and parking alerts will appear here. Stay updated on parking availability!',
          type: 'info',
          icon: 'notifications',
          confirmText: 'Got it!'
        }),
      },
    ];
  };

  const getDynamicActions = () => {
    const baseActions = [
      {
        icon: 'settings',
        title: 'App Settings',
        desc: 'Manage notifications and preferences',
        color: '#4CAF50',
        onPress: () => navigation.navigate('Settings'),
      },
      {
        icon: 'feedback',
        title: 'Send Feedback',
        desc: 'Help us improve VALET',
        color: '#2196F3',
        onPress: () => navigation.navigate('Feedback'),
      },
    ];

    const adminActions = [
      {
        icon: 'dashboard',
        title: 'Admin Dashboard',
        desc: 'Manage parking and users',
        color: '#F44336',
        onPress: () => showAlert({
          title: 'Admin Dashboard',
          message: 'Admin dashboard feature coming soon! This will allow you to manage parking spaces, view analytics, and configure system settings.',
          type: 'info',
          icon: 'dashboard',
          confirmText: 'Got it'
        }),
      },
      {
        icon: 'analytics',
        title: 'View Analytics',
        desc: 'Parking usage statistics',
        color: '#FF9800',
        onPress: () => showAlert({
          title: 'Analytics',
          message: 'Analytics dashboard coming soon! Track parking usage, peak hours, and system performance.',
          type: 'info',
          icon: 'analytics',
          confirmText: 'Cool!'
        }),
      },
    ];

    const studentActions = [
      {
        icon: 'history',
        title: 'Parking History',
        desc: 'View your parking sessions',
        color: '#9C27B0',
        onPress: () => showAlert({
          title: 'Parking History',
          message: 'Your parking history will show here soon! Track where and when you\'ve parked on campus.',
          type: 'info',
          icon: 'history',
          confirmText: 'Awesome!'
        }),
      },
    ];

    // Return actions based on user role
    if (user?.role === 'admin') {
      return [...baseActions, ...adminActions];
    } else {
      return [...baseActions, ...studentActions];
    }
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
          <Text style={styles.loadingText}>Loading Profile...</Text>
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
              message: 'Profile editing feature is coming soon! For now, contact support if you need to update your information.',
              type: 'info',
              icon: 'edit',
              confirmText: 'Got it'
            })}
          >
            <MaterialIcons name="edit" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Parking Stats Card (User's Personal Stats) */}
        {userStats && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="local-parking" size={20} color="#B71C1C" />
              <Text style={styles.cardTitle}>My Parking Stats</Text>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.totalParkingSessions}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.hoursParked}h</Text>
                <Text style={styles.statLabel}>Hours Parked</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>Floor {userStats.favoriteFloor}</Text>
                <Text style={styles.statLabel}>Most Used</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formatRelativeTime(userStats.lastParked)}</Text>
                <Text style={styles.statLabel}>Last Visit</Text>
              </View>
            </View>
          </View>
        )}

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
              message: 'VALET respects your privacy. We only collect necessary information to provide parking services and improve your experience. Your data is never shared with third parties.',
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
              message: '🚗 VALET Mobile - Your Parking Buddy!\n\nVersion 1.0.0\n📱 Designed for USJ-R students and staff\n🎯 Find parking spots quickly and easily\n🚫 Admin features available on web only\n\n© 2025 VALET Team',
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
          <Text style={styles.refreshHintText}>Pull down to refresh profile</Text>
        </View>
      </ScrollView>

      <CustomAlert />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    width: width * 0.8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  loadingBar: {
    width: 120,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '70%',
    height: '100%',
    backgroundColor: '#B71C1C',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  userStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  userDepartment: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  editButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B71C1C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  infoText: {
    marginLeft: 14,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    marginLeft: 14,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 54,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F44336',
    elevation: 2,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  signOutButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingVertical: 8,
  },
  refreshHintText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#999',
  },
  // Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  alertConfirmButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  alertConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;