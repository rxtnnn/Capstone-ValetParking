import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { styles } from './styles/ProfileScreen.style';
import {API_ENDPOINTS, COLORS} from '../constants/AppConst';

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
  employee_id?: string;
  student_id?: string;
  department?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
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

interface PasswordChangeState {
  current: string;
  new: string;
  confirm: string;
}

interface PasswordErrors {
  current: string;
  new: string;
  confirm: string;
}

interface PasswordRules {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

const API_CONFIG = {
  BASE_URL: API_ENDPOINTS.userUrl,
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

  // Password Change States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwords, setPasswords] = useState<PasswordChangeState>({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({
    current: '',
    new: '',
    confirm: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  // Password validation
  const validatePassword = useCallback((password: string): PasswordRules => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  }, []);

  const handlePasswordChange = useCallback((field: keyof PasswordChangeState, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
    setPasswordErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const handleSubmitPasswordChange = useCallback(async () => {
    const newErrors: PasswordErrors = { current: '', new: '', confirm: '' };
    let hasErrors = false;

    // Validate current password
    if (!passwords.current) {
      newErrors.current = 'Current password is required';
      hasErrors = true;
    }

    // Validate new password
    const rules = validatePassword(passwords.new);
    const allRulesMet = Object.values(rules).every(rule => rule);

    if (!passwords.new) {
      newErrors.new = 'New password is required';
      hasErrors = true;
    } else if (!allRulesMet) {
      newErrors.new = 'Password must meet all requirements';
      hasErrors = true;
    }

    // Validate confirm password
    if (!passwords.confirm) {
      newErrors.confirm = 'Please confirm your password';
      hasErrors = true;
    } else if (passwords.new !== passwords.confirm) {
      newErrors.confirm = 'Passwords do not match';
      hasErrors = true;
    }

    // Check if new password is same as current
    if (passwords.current && passwords.new && passwords.current === passwords.new) {
      newErrors.new = 'New password must be different from current password';
      hasErrors = true;
    }

    if (hasErrors) {
      setPasswordErrors(newErrors);
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
        },
        body: JSON.stringify({
          user_id: user?.id,
          current_password: passwords.current,
          new_password: passwords.new,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      showAlert({
        title: 'Password Changed',
        message: 'Your password has been successfully updated!',
        type: 'success',
        icon: 'check-circle',
        confirmText: 'OK',
        onConfirm: () => {
          setShowPasswordModal(false);
          setPasswords({ current: '', new: '', confirm: '' });
          setPasswordErrors({ current: '', new: '', confirm: '' });
          setShowCurrentPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        }
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to change password. Please check your current password and try again.',
        type: 'warning',
        icon: 'error',
        confirmText: 'OK'
      });
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwords, validatePassword, showAlert, user]);

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
  }, [authUser]);

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

  // Password Requirement Component
  const PasswordRequirement: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
    <View style={styles.passwordRequirement}>
      <MaterialIcons 
        name={met ? 'check-circle' : 'cancel'} 
        size={16} 
        color={met ? '#4CAF50' : '#BDBDBD'} 
      />
      <Text style={[styles.passwordRequirementText, met && styles.passwordRequirementMet]}>
        {text}
      </Text>
    </View>
  );

  // Password Change Modal
  const PasswordChangeModal = useCallback(() => {
    const passwordRules = validatePassword(passwords.new);

    return (
      <Modal
        transparent
        visible={showPasswordModal}
        onRequestClose={() => setShowPasswordModal(false)}
        animationType="fade"
      >
        <View style={styles.passwordModalOverlay}>
          <TouchableOpacity 
            style={styles.passwordModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPasswordModal(false)}
          />
          
          <View style={styles.passwordModalContainer}>
            {/* Header */}
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 2 }}
              style={styles.passModalHeader}
            >
              <View style={styles.passModal}>
                <View style={styles.passContainer}>
                  <MaterialIcons name="lock" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.passHeader}>
                  <Text style={styles.passTitle}>Change Password</Text>
                  <Text style={styles.passSubtext}>Keep your account secure</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setShowPasswordModal(false)}
                style={styles.passCloseBtn}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.passBody} showsVerticalScrollIndicator={false}>
              {/* Current Password */}
              <View style={styles.passInput}>
                <Text style={styles.passLabel}>Current Password</Text>
                <View style={[
                  styles.passInputWrap,
                  passwordErrors.current ? styles.passError : null
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwords.current}
                    onChangeText={(text) => handlePasswordChange('current', text)}
                    placeholder="Enter current password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.passwordToggle}
                  >
                    <MaterialIcons 
                      name={showCurrentPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordErrors.current ? (
                  <View style={styles.passwordErrorContainer}>
                    <MaterialIcons name="error" size={14} color="#F44336" />
                    <Text style={styles.passwordErrorText}>{passwordErrors.current}</Text>
                  </View>
                ) : null}
              </View>

              {/* New Password */}
              <View style={styles.passInput}>
                <Text style={styles.passLabel}>New Password</Text>
                <View style={[
                  styles.passInputWrap,
                  passwordErrors.new ? styles.passError : null
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwords.new}
                    onChangeText={(text) => handlePasswordChange('new', text)}
                    placeholder="Enter new password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.passwordToggle}
                  >
                    <MaterialIcons 
                      name={showNewPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordErrors.new ? (
                  <View style={styles.passwordErrorContainer}>
                    <MaterialIcons name="error" size={14} color="#F44336" />
                    <Text style={styles.passwordErrorText}>{passwordErrors.new}</Text>
                  </View>
                ) : null}
              </View>

              {/* Password Requirements */}
              {passwords.new ? (
                <View style={styles.passReq}>
                  <Text style={styles.passReqtitle}>Password Requirements:</Text>
                  <PasswordRequirement met={passwordRules.length} text="At least 8 characters" />
                  <PasswordRequirement met={passwordRules.uppercase} text="One uppercase letter" />
                  <PasswordRequirement met={passwordRules.lowercase} text="One lowercase letter" />
                  <PasswordRequirement met={passwordRules.number} text="One number" />
                  <PasswordRequirement met={passwordRules.special} text="One special character" />
                </View>
              ) : null}

              {/* Confirm Password */}
              <View style={styles.passInput}>
                <Text style={styles.passLabel}>Confirm New Password</Text>
                <View style={[
                  styles.passInputWrap,
                  passwordErrors.confirm ? styles.passError : null
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwords.confirm}
                    onChangeText={(text) => handlePasswordChange('confirm', text)}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordToggle}
                  >
                    <MaterialIcons 
                      name={showConfirmPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordErrors.confirm ? (
                  <View style={styles.passwordErrorContainer}>
                    <MaterialIcons name="error" size={14} color="#F44336" />
                    <Text style={styles.passwordErrorText}>{passwordErrors.confirm}</Text>
                  </View>
                ) : null}
              </View>

              {/* Buttons */}
              <View style={styles.passwordModalButtons}>
                <TouchableOpacity 
                  style={styles.passwordCancelButton}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={styles.passwordCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.passwordSubmitButton,
                    isChangingPassword && styles.passwordSubmitButtonDisabled
                  ]}
                  onPress={handleSubmitPasswordChange}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.passwordSubmitButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }, [showPasswordModal, passwords, passwordErrors, showCurrentPassword, showNewPassword, showConfirmPassword, isChangingPassword, handlePasswordChange, handleSubmitPasswordChange, validatePassword]);

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
          <MaterialIcons name="person" size={48} color= {COLORS.primary} />
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
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.5}}
          style={styles.profileCard}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name ? getInitials(user.name) : (authUser?.name ? getInitials(authUser.name) : 'U')}
                </Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>
                {user?.name || authUser?.name || 'Unknown User'}
              </Text>
              <View style={styles.userStatusContainer}>
                <Text style={styles.userType}>
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : 'N/A'}
                </Text>
                {(user?.is_active !== false) && (
                  <View style={styles.activeStatus}>
                    <MaterialIcons name="check-circle" size={12} color={COLORS.green} />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>
<View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="account-box" size={22} color="#4F46E5"/>
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
                
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name || 'Unknown User'}</Text>
            </View>
            
            <View style={styles.infoDivider} />
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Unknown'}</Text>
            </View>
            
            <View style={styles.infoDivider} />
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Student ID</Text>
              <Text style={styles.infoValue}>{user?.id || 'Unknown'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{user?.department || 'Unknown'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="lock" size={20} color="#F44336" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Change Password</Text>
                <Text style={styles.actionDesc}>Update your account password</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
          </View>
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

          <View style={styles.divider} />

          
        </View>

        <TouchableOpacity style={styles.outBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#F44336" />
          <Text style={styles.outBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <PasswordChangeModal />
      <CustomAlert />
    </View>
  );
};

export default ProfileScreen;