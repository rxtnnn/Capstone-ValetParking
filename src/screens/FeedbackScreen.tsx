import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import ApiService from '../services/ApiService';
import { useFeedback } from '../hooks/useFeedback';
import { FeedbackData, FEEDBACK_CATEGORIES } from '../types/feedback';
import { getBasicDeviceInfo } from '../utils/deviceInfo';
import { NotificationManager } from '../services/NotifManager';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { createResponsiveStyles, createCustomAlertStyles } from './styles/FeedbackScreen.style';

type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: { floor: number };
  Feedback: { showReplies?: boolean };
  Settings: undefined;
  Profile: undefined;
  ApiTest: undefined;
};

type FeedbackScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Feedback'>;
type FeedbackRouteProp = RouteProp<RootStackParamList, 'Feedback'>;

interface Props {
  navigation: FeedbackScreenNavigationProp;
}

interface FeedbackType {
  value: FeedbackData['type'];
  label: string;
  icon: string;
  description: string;
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = React.memo(({ visible, title, message, buttons, onClose }) => {
  const { width, height } = useWindowDimensions();
  const alertStyles = createCustomAlertStyles(width, height);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.container}>
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          
          <View style={alertStyles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  alertStyles.button,
                  button.style === 'cancel' && alertStyles.cancelButton,
                  buttons.length === 1 && alertStyles.singleButton,
                  index === 0 && buttons.length > 1 && alertStyles.primaryButton,
                ]}
                onPress={() => {
                  button.onPress?.();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  alertStyles.buttonText,
                  button.style === 'cancel' && alertStyles.cancelButtonText,
                  index === 0 && buttons.length > 1 && alertStyles.primaryButtonText,
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const FONTS = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
};

const FEEDBACK_TYPES: FeedbackType[] = [
  {
    value: 'general',
    label: 'Rate Experience',
    icon: 'star-outline',
    description: 'Share your overall app experience',
  },
  {
    value: 'parking',
    label: 'Parking Issues',
    icon: 'car-outline',
    description: 'Report parking spot or navigation problems',
  },
  {
    value: 'technical',
    label: 'Bug Reports',
    icon: 'bug-outline',
    description: 'Technical issues or app crashes',
  },
  {
    value: 'suggestion',
    label: 'Suggestions',
    icon: 'bulb-outline',
    description: 'Ideas for new features',
  },
];

const getCommonIssuesForType = (type: FeedbackData['type']): string[] => {
  const category = FEEDBACK_CATEGORIES.find(c => c.value === type);
  return category?.commonIssues || [];
};

const RATING_LABELS = ['Very Poor 😞', 'Poor 😐', 'Average 🙂', 'Good 😊', 'Excellent 🤩'];

const STATUS_COLORS = {
  pending: '#F59E0B',
  reviewed: '#EF4444',
  resolved: '#10B981',
  default: '#6B7280'
};

const TYPE_ICONS = {
  general: 'star-outline',
  technical: 'bug-outline',
  suggestion: 'bulb-outline',
  parking: 'car-outline',
  default: 'chatbubble-outline'
};

const DEFAULT_DEVICE_INFO = {
  platform: 'unknown',
  version: 'unknown',
  model: 'Unknown Device',
  systemVersion: 'unknown',
  appVersion: '1.0.0',
  buildNumber: '1',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let globalDeviceInfo: any = null;
let deviceInfoPromise: Promise<any> | null = null;

const getDeviceInfoOnce = async () => {
  if (globalDeviceInfo) return globalDeviceInfo;
  
  if (!deviceInfoPromise) {
    deviceInfoPromise = (async () => {
      try {
        globalDeviceInfo = await getBasicDeviceInfo();
      } catch (error) {
        globalDeviceInfo = DEFAULT_DEVICE_INFO;
      }
      return globalDeviceInfo;
    })();
  }
  
  return deviceInfoPromise;
};

const FeedbackScreen: React.FC<Props> = ({ navigation }) => {
  const [fontsLoaded] = useFonts(FONTS);
  const route = useRoute<FeedbackRouteProp>();
  const { showReplies: initialShowReplies } = route.params || {};
  const { logout, isAuthenticated } = useAuth();
  const { width, height } = useWindowDimensions();
  const responsiveStyles = useMemo(() => createResponsiveStyles(width, height), [width, height]);
  const isSmallScreen = width < 360;
  const isLargeScreen = width >= 410;
  const isTablet = width >= 768;

  const getResponsiveSize = useCallback((small: number, medium: number, large: number, tablet: number) => {
    if (isTablet) return tablet;
    if (isLargeScreen) return large;
    if (isSmallScreen) return small;
    return medium; 
  }, [isSmallScreen, isLargeScreen, isTablet]);

  const mountedRef = useRef(true);
  const lastRefreshTime = useRef(0);
  const [showReplies, setShowReplies] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const submissionCache = useRef<{
    isSubmitting: boolean;
    lastSubmissionTime: number;
    deviceInfo: any;
  }>({
    isSubmitting: false,
    lastSubmissionTime: 0,
    deviceInfo: null
  });

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState<{
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  const { 
    feedback, 
    loading: repliesLoading, 
    refreshFeedback, 
    checkForNewReplies,
    currentUserId,
    error: feedbackError
  } = useFeedback();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialShowReplies) {
      setShowReplies(true);
    }
  }, [initialShowReplies, setShowReplies]);

  useEffect(() => {
    getDeviceInfoOnce().then(info => {
      if (mountedRef.current) {
        submissionCache.current.deviceInfo = info;
      }
    });
  }, []);

  const feedbackWithReplies = useMemo(() => {
    if (!feedback || feedback.length === 0) return [];
    
    return feedback.filter(item => 
      item.admin_response?.trim() && 
      (!currentUserId || item.user_id === currentUserId)
    );
  }, [feedback, currentUserId]);

  const currentTypeIssues = useMemo(() => 
    getCommonIssuesForType(feedbackType), [feedbackType]);

  const showCustomAlert = useCallback((title: string, message: string, buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>) => {
    if (!mountedRef.current) return;
    setAlertData({ title, message, buttons });
    setAlertVisible(true);
  }, []);

  const handleAuthenticationError = useCallback(async () => {
    if (!mountedRef.current || submissionCache.current.isSubmitting) return;
    
    showCustomAlert(
      'Session Expired',
      'Your session has expired. Please log in again to continue.',
      [
        {
          text: 'Log In',
          onPress: async () => {
            if (!mountedRef.current) return;
            try {
              await logout();
              navigation.navigate('Login' as never);
            } catch (error) {
              console.log('Logout error:', error);
            }
          },
          style: 'default'
        }
      ]
    );
  }, [logout, navigation, showCustomAlert]);

  useEffect(() => {
    if (feedbackError && feedbackError.includes('expired') && !alertVisible) {
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          handleAuthenticationError();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [feedbackError, alertVisible, handleAuthenticationError]);

  useEffect(() => {
    if (!isAuthenticated && mountedRef.current) {
      navigation.navigate('Login' as never);
    }
  }, [isAuthenticated, navigation]);

  const getPlaceholderText = useCallback((): string => {
    const placeholders = {
      general: "Tell us about your experience with VALET. What did you like? What could be improved?",
      parking: "Describe the parking issue you encountered. Which floor or area was affected?",
      technical: "What technical problem did you experience? When did it happen?",
      suggestion: "What new feature would you like to see? How would it improve your experience?"
    };
    return placeholders[feedbackType] || "Share your thoughts with us...";
  }, [feedbackType]);

  const formatTimeAgo = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) return `${diffInDays}d ago`;
    if (diffInHours > 0) return `${diffInHours}h ago`;
    if (diffInMinutes > 0) return `${diffInMinutes}m ago`;
    return 'Just now';
  }, []);

  const getStatusColor = useCallback((status: string) => 
    STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default, []);

  const getTypeIcon = useCallback((type: string) => 
    TYPE_ICONS[type as keyof typeof TYPE_ICONS] || TYPE_ICONS.default, []);

  const handleRatingPress = useCallback((value: number) => {
    setRating(value);
  }, []);

  const handleIssueToggle = useCallback((issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!message.trim()) {
      showCustomAlert('Required Field', 'Please share your feedback with us to help improve VALET.', [
        { text: 'Understood', style: 'default' }
      ]);
      return false;
    }

    if (message.trim().length < 10) {
      showCustomAlert('More Details Needed', 'Please provide more detailed feedback (at least 10 characters) so we can better understand your experience.', [
        { text: 'Understood', style: 'default' }
      ]);
      return false;
    }

    if (feedbackType === 'general' && rating === 0) {
      showCustomAlert('Rating Required', 'Please rate your experience with VALET to help us understand how we\'re doing.', [
        { text: 'Understood', style: 'default' }
      ]);
      return false;
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      showCustomAlert('Invalid Email', 'Please enter a valid email address if you\'d like us to follow up with you.', [
        { text: 'Understood', style: 'default' }
      ]);
      return false;
    }

    return true;
  }, [message, feedbackType, rating, email, showCustomAlert]);

  const resetForm = useCallback(() => {
    if (!mountedRef.current) return;
    setMessage('');
    setEmail('');
    setRating(0);
    setSelectedIssues([]);
    setFeedbackType('general');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateForm() || submissionCache.current.isSubmitting || !mountedRef.current) {
      return;
    }
    const now = Date.now();
    if (now - submissionCache.current.lastSubmissionTime < 2000) {
      return;
    }

    submissionCache.current.isSubmitting = true;
    submissionCache.current.lastSubmissionTime = now;
    setLoading(true);

    try {
      const deviceInfo = submissionCache.current.deviceInfo || DEFAULT_DEVICE_INFO;
      const feedbackData: Omit<FeedbackData, 'id' | 'status' | 'created_at' | 'user_id'> = {
        type: feedbackType,
        message: message.trim(),
        ...(feedbackType === 'general' && rating > 0 && { rating }),
        ...(email.trim() && { email: email.trim() }),
        ...(selectedIssues.length > 0 && { issues: selectedIssues }),
        device_info: {
          platform: deviceInfo.platform,
          model:    deviceInfo.model,
          version:  deviceInfo.appVersion,
        },
        ...(feedbackType === 'parking' && { parking_location: 'Mobile App Feedback' }),
      };

      const feedbackId = await ApiService.submitFeedback(feedbackData);
      
      if (feedbackId && mountedRef.current) {
        resetForm();
        
        showCustomAlert(
          'Thank You!',
          'Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve VALET.',
          [
            { text: 'Submit Another', style: 'default' },
            { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
        setTimeout(async () => {
          if (mountedRef.current) {
            try {
              await Promise.allSettled([
                refreshFeedback(),
                currentUserId ? checkForNewReplies() : Promise.resolve()
              ]);
            } catch (error) {
              console.log('Background refresh failed:', error);
            }
          }
        }, 500);
      }
    } catch (error) {
      console.log('Error submitting feedback:', error);
      
      if (!mountedRef.current) return;
      let errorMessage = 'We couldn\'t submit your feedback. Please try again.';
      let retryAction = () => handleSubmit();
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Submission is taking longer than expected. Please check your connection and try again.';
        } else if (error.message.includes('expired') || error.message.includes('authenticated')) {
          errorMessage = 'Your session has expired. Please log in again.';
          retryAction = async () => {
            await logout();
            navigation.navigate('Login' as never);
          };
        } else if (error.message.includes('Network') || error.message.includes('connection')) {
          errorMessage = 'Please check your internet connection and try again.';
        }
      }
      
      showCustomAlert(
        'Submission Failed',
        errorMessage,
        [
          { text: 'Try Again', onPress: retryAction },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      submissionCache.current.isSubmitting = false;
    }
  }, [
    validateForm, 
    feedbackType, 
    message, 
    rating, 
    email, 
    selectedIssues, 
    resetForm, 
    navigation, 
    logout, 
    showCustomAlert,
    refreshFeedback,
    checkForNewReplies,
    currentUserId
  ]);

  const onRefresh = useCallback(async () => {
    if (refreshing || !mountedRef.current) return;
    
    const now = Date.now();
    if (now - lastRefreshTime.current < 1000) return; 
    
    lastRefreshTime.current = now;
    setRefreshing(true);
    
    try {
      const refreshPromise = Promise.race([
        Promise.allSettled([
          refreshFeedback(),
          currentUserId ? checkForNewReplies() : Promise.resolve(),
          currentUserId ? NotificationManager.checkForFeedbackReplies(currentUserId) : Promise.resolve()
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Refresh timeout')), 8000))
      ]);

      await refreshPromise;
    } catch (error: any) {
      console.log('Refresh error:', error);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshing, refreshFeedback, currentUserId, checkForNewReplies]);

  const renderStarRating = useMemo(() => (
    <View style={responsiveStyles.ratingContainer}>
      <Text style={responsiveStyles.ratingLabel}>Rate your experience</Text>
      <View style={responsiveStyles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={responsiveStyles.starButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={getResponsiveSize(24, 28, 30, 32)}
              color={star <= rating ? '#FFD700' : '#E5E7EB'}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={responsiveStyles.ratingFeedback}>
          {RATING_LABELS[rating - 1]}
        </Text>
      )}
    </View>
  ), [rating, responsiveStyles, getResponsiveSize]);

  const ReplyItem = React.memo(({ item, index }: { item: FeedbackData; index: number }) => (
    <View key={`${item.id}-${index}`} style={responsiveStyles.replyCard}>
      <View style={responsiveStyles.replyHeader}>
        <View style={responsiveStyles.replyTypeContainer}>
          <Ionicons 
            name={getTypeIcon(item.type) as any} 
            size={getResponsiveSize(14, 16, 17, 18)} 
            color="#B22020" 
          />
          <Text style={responsiveStyles.replyTypeText}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
        <View style={[
          responsiveStyles.replyStatus,
          { backgroundColor: getStatusColor(item.status || 'pending') }
        ]}>
          <Text style={responsiveStyles.replyStatusText}>
            {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
          </Text>
        </View>
      </View>

      <View style={responsiveStyles.originalFeedback}>
        <Text style={responsiveStyles.originalLabel}>Your feedback:</Text>
        <Text style={responsiveStyles.originalText} numberOfLines={2}>
          {item.message}
        </Text>
      </View>

      <View style={responsiveStyles.adminResponse}>
        <View style={responsiveStyles.adminHeader}>
          <Ionicons name="shield-checkmark" size={getResponsiveSize(14, 16, 17, 18)} color="#059669" />
          <Text style={responsiveStyles.adminLabel}>Admin Response</Text>
          {item.responded_at && (
            <Text style={responsiveStyles.responseTime}>
              {formatTimeAgo(item.responded_at)}
            </Text>
          )}
        </View>
        <Text style={responsiveStyles.adminText}>
          {item.admin_response}
        </Text>
      </View>

      {item.rating && item.type === 'general' && (
        <View style={responsiveStyles.ratingDisplay}>
          <Text style={responsiveStyles.ratingDisplayLabel}>Your rating: </Text>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating! ? 'star' : 'star-outline'}
              size={getResponsiveSize(10, 12, 13, 14)}
              color={star <= item.rating! ? '#FFD700' : '#E5E7EB'}
            />
          ))}
          <Text style={responsiveStyles.ratingDisplayValue}>({item.rating}/5)</Text>
        </View>
      )}
    </View>
  ));

  const SubmitButton = useMemo(() => (
    <TouchableOpacity
      onPress={handleSubmit}
      disabled={loading || submissionCache.current.isSubmitting}
      style={[responsiveStyles.submitButton, loading && responsiveStyles.disabledButton]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={loading ? ['#9CA3AF', '#6B7280'] : ['#B22020', '#8B1917']}
        style={responsiveStyles.submitGradient}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="send" size={getResponsiveSize(16, 18, 19, 20)} color="white" />
        )}
        <Text style={responsiveStyles.submitText}>
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  ), [loading, handleSubmit, responsiveStyles, getResponsiveSize]);

  const renderAdminReplies = useMemo(() => {
    if (feedbackWithReplies.length === 0) {
      return (
        <View style={responsiveStyles.emptyContainer}>
          <View style={responsiveStyles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={getResponsiveSize(40, 48, 50, 56)} color="#B22020" />
          </View>
          <Text style={responsiveStyles.emptyTitle}>No replies yet</Text>
          <Text style={responsiveStyles.emptySubtitle}>
            Admin responses to your feedback will appear here.{'\n'}
            You'll receive notifications when we reply!
          </Text>
          <TouchableOpacity 
            style={responsiveStyles.emptyAction}
            onPress={() => setShowReplies(false)}
          >
            <Text style={responsiveStyles.emptyActionText}>Submit New Feedback</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView 
        style={responsiveStyles.repliesContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#B22020']}
            tintColor="#B22020"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={responsiveStyles.repliesContent}
        removeClippedSubviews={true}
      >
        {feedbackWithReplies.map((item, index) => (
          <ReplyItem key={`${item.id}-${index}`} item={item} index={index} />
        ))}
      </ScrollView>
    );
  }, [feedbackWithReplies, refreshing, onRefresh, responsiveStyles, getResponsiveSize]);

  if (!fontsLoaded) {
    return (
      <View style={[responsiveStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#B22020" />
      </View>
    );
  }

  return (
    <View style={responsiveStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      <CustomAlert
        visible={alertVisible}
        title={alertData.title}
        message={alertData.message}
        buttons={alertData.buttons}
        onClose={() => setAlertVisible(false)}
      />
      
      <LinearGradient colors={['#B22020', '#4C0E0E']} style={responsiveStyles.header}>
        <View style={responsiveStyles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={responsiveStyles.backButton}
          >
            <Ionicons name="chevron-back" size={getResponsiveSize(20, 24, 25, 28)} color="white" />
          </TouchableOpacity>
          
          <Text style={responsiveStyles.headerTitle}>Feedback</Text>
          
          <TouchableOpacity 
            onPress={() => setShowReplies(!showReplies)}
            style={responsiveStyles.toggleButton}
          >
            <Ionicons 
              name={showReplies ? "create-outline" : "chatbubbles-outline"} 
              size={getResponsiveSize(18, 20, 21, 24)} 
              color="white" 
            />
            {feedbackWithReplies.length > 0 && !showReplies && (
              <View style={responsiveStyles.badgeContainer}>
                <Text style={responsiveStyles.badgeText}>{feedbackWithReplies.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={responsiveStyles.headerSubtitle}>
          {showReplies 
            ? 'View admin responses to your feedback'
            : 'Help us improve VALET with your insights'
          }
        </Text>

        <View style={responsiveStyles.tabContainer}>
          <TouchableOpacity 
            style={[responsiveStyles.tab, !showReplies && responsiveStyles.activeTab]}
            onPress={() => setShowReplies(false)}
          >
            <Text style={[responsiveStyles.tabText, !showReplies && responsiveStyles.activeTabText]}>
              New Feedback
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[responsiveStyles.tab, showReplies && responsiveStyles.activeTab]}
            onPress={() => setShowReplies(true)}
          >
            <Text style={[responsiveStyles.tabText, showReplies && responsiveStyles.activeTabText]}>
              Replies {feedbackWithReplies.length > 0 && `(${feedbackWithReplies.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {showReplies ? (
        renderAdminReplies
      ) : (
        <KeyboardAvoidingView
          style={responsiveStyles.contentContainer}
          behavior={Platform.OS === 'android' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={responsiveStyles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={responsiveStyles.scrollContent}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
          >
            
            <View style={responsiveStyles.section}>
              <Text style={responsiveStyles.sectionTitle}>What would you like to share?</Text>
              <View style={responsiveStyles.typeGrid}>
                {FEEDBACK_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      responsiveStyles.typeCard,
                      feedbackType === type.value && responsiveStyles.selectedTypeCard
                    ]}
                    onPress={() => setFeedbackType(type.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      responsiveStyles.typeIcon,
                      feedbackType === type.value && responsiveStyles.selectedTypeIcon
                    ]}>
                      <Ionicons 
                        name={type.icon as any} 
                        size={getResponsiveSize(18, 20, 21, 24)} 
                        color={feedbackType === type.value ? 'white' : '#B22020'} 
                      />
                    </View>
                    <Text style={[
                      responsiveStyles.typeLabel,
                      feedbackType === type.value && responsiveStyles.selectedTypeLabel
                    ]}>
                      {type.label}
                    </Text>
                    <Text style={[
                      responsiveStyles.typeDescription,
                      feedbackType === type.value && responsiveStyles.selectedTypeDescription
                    ]}>
                      {type.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {feedbackType === 'general' && (
              <View style={responsiveStyles.section}>
                <View style={responsiveStyles.card}>
                  {renderStarRating}
                </View>
              </View>
            )}
            
            {currentTypeIssues.length > 0 && (
              <View style={responsiveStyles.section}>
                <Text style={responsiveStyles.sectionTitle}>Related Issues</Text>
                <Text style={responsiveStyles.sectionSubtitle}>
                  Select any that apply (optional)
                </Text>
                <View style={responsiveStyles.card}>
                  <View style={responsiveStyles.chipsContainer}>
                    {currentTypeIssues.map((issue) => (
                      <TouchableOpacity
                        key={issue}
                        style={[
                          responsiveStyles.chip,
                          selectedIssues.includes(issue) && responsiveStyles.selectedChip
                        ]}
                        onPress={() => handleIssueToggle(issue)}
                      >
                        <Text style={[
                          responsiveStyles.chipText,
                          selectedIssues.includes(issue) && responsiveStyles.selectedChipText
                        ]}>
                          {issue}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>  
              </View>
            )}

            <View style={responsiveStyles.section}>
              <Text style={responsiveStyles.sectionTitle}>Your Message</Text>
              <Text style={responsiveStyles.sectionSubtitle}>
                Share your detailed feedback
              </Text>
              <View style={responsiveStyles.card}>
                <TextInput
                  placeholder={getPlaceholderText()}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  style={responsiveStyles.textInput}
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <View style={responsiveStyles.inputFooter}>
                  <Text style={responsiveStyles.characterCount}>
                    {message.length}/1000
                  </Text>
                  <Text style={responsiveStyles.requiredIndicator}>Required</Text>
                </View>
              </View>
            </View>

            <View style={responsiveStyles.section}>
              <Text style={responsiveStyles.sectionTitle}>Email (Optional)</Text>
              <Text style={responsiveStyles.sectionSubtitle}>
                For follow-up responses
              </Text>
              <View style={responsiveStyles.emailInputCard}>
                <View style={responsiveStyles.emailInputContainer}>
                  <Ionicons name="mail-outline" size={getResponsiveSize(16, 18, 19, 20)} color="#6B7280" />
                  <TextInput
                    placeholder="your.email@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={responsiveStyles.emailInput}
                    placeholderTextColor="#9CA3AF"
                    maxLength={100}
                  />
                </View>
              </View>
            </View>

            <View style={responsiveStyles.submitContainer}>
              {SubmitButton}
            </View>

            <View style={responsiveStyles.section}>
              <View style={responsiveStyles.contactCard}>
                <View style={responsiveStyles.contactHeader}>
                  <Ionicons name="headset" size={getResponsiveSize(18, 20, 21, 24)} color="#B22020" />
                  <Text style={responsiveStyles.contactTitle}>Need immediate help?</Text>
                </View>
                <Text style={responsiveStyles.contactSubtitle}>
                  Contact support for urgent issues
                </Text>
                <View style={responsiveStyles.contactOptions}>
                  <TouchableOpacity style={responsiveStyles.contactOption}>
                    <Ionicons name="mail" size={getResponsiveSize(12, 14, 15, 16)} color="#6B7280" />
                    <Text style={responsiveStyles.contactText}>support@valet-parking.com</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={responsiveStyles.contactOption}>
                    <Ionicons name="call" size={getResponsiveSize(12, 14, 15, 16)} color="#6B7280" />
                    <Text style={responsiveStyles.contactText}>+63 919 123 456</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default FeedbackScreen;