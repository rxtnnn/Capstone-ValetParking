import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { styles } from './styles/FeedbackScreen.style';
import { NotificationManager } from '../services/NotifManager';
import { useRoute, RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  Splash: undefined;
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

const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, buttons, onClose }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          <View style={styles.alertIconContainer}>
          </View>
          
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>
          
          <View style={styles.alertButtonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  button.style === 'cancel' && styles.alertCancelButton,
                  buttons.length === 1 && styles.alertSingleButton,
                  index === 0 && buttons.length > 1 && styles.alertPrimaryButton,
                ]}
                onPress={() => {
                  button.onPress?.();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.alertButtonText,
                  button.style === 'cancel' && styles.alertCancelButtonText,
                  index === 0 && buttons.length > 1 && styles.alertPrimaryButtonText,
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
};

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
    description: 'Share your overall app experience'
  },
  { 
    value: 'parking', 
    label: 'Parking Issues', 
    icon: 'car-outline',
    description: 'Report parking spot or navigation problems'
  },
  { 
    value: 'technical', 
    label: 'Bug Reports', 
    icon: 'bug-outline',
    description: 'Technical issues or app crashes'
  },
  { 
    value: 'suggestion', 
    label: 'Suggestions', 
    icon: 'bulb-outline',
    description: 'Ideas for new features'
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

const FeedbackScreen: React.FC<Props> = ({ navigation }) => {
  const [fontsLoaded] = useFonts(FONTS);
  const route = useRoute<FeedbackRouteProp>();
  const { showReplies: initialShowReplies } = route.params || {};

  const [showReplies, setShowReplies] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Custom alert state
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
    currentUserId
  } = useFeedback();

  useEffect(() => {
    if (initialShowReplies) {
      setShowReplies(true);
    }
  }, [initialShowReplies]);

  const feedbackWithReplies = useMemo(() => 
    feedback.filter(item => 
      item.admin_response?.trim() && 
      (!currentUserId || item.user_id === currentUserId)
    ), [feedback, currentUserId]
  );

  const showCustomAlert = (title: string, message: string, buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>) => {
    setAlertData({ title, message, buttons });
    setAlertVisible(true);
  };

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
  }, [message, feedbackType, rating, email]);

  const resetForm = useCallback(() => {
    setMessage('');
    setEmail('');
    setRating(0);
    setSelectedIssues([]);
    setFeedbackType('general');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      let deviceInfo;
      try {
        deviceInfo = await getBasicDeviceInfo();
      } catch (deviceError) {
        console.error('Failed to get device info:', deviceError);
        deviceInfo = DEFAULT_DEVICE_INFO;
      }

      const feedbackData: any = {
        type: feedbackType,
        message: message.trim(),
        deviceInfo: deviceInfo,
        feedback_type: feedbackType === 'parking' ? 'parking_experience' : 
                     feedbackType === 'technical' ? 'technical_issue' :
                     feedbackType === 'suggestion' ? 'feature_request' : 'general',
        parking_location: feedbackType === 'parking' ? 'Mobile App Feedback' : undefined,
      };

      if (feedbackType === 'general' && rating > 0) {
        feedbackData.rating = rating;
      }

      if (email.trim()) {
        feedbackData.email = email.trim();
      }

      if (selectedIssues.length > 0) {
        feedbackData.issues = selectedIssues;
      }

      const feedbackId = await ApiService.submitFeedback(feedbackData);
      
      if (feedbackId) {
        resetForm();
        await refreshFeedback();
        
        if (currentUserId) {
          setTimeout(async () => {
            await checkForNewReplies();
          }, 2000);
        }

        showCustomAlert(
          'Thank You!',
          'Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve VALET.\n\nWe\'ll notify you when our team responds to your feedback.',
          [
            { text: 'Submit Another', style: 'default' },
            { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      let errorTitle = 'Submission Failed';
      let errorMessage = 'We couldn\'t submit your feedback right now. Please try again in a moment.';
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed')) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Your session has expired. Please log in again and try submitting your feedback.';
        } else if (error.message.includes('Validation failed')) {
          errorTitle = 'Invalid Information';
          errorMessage = 'Please check your information and try again. Make sure all required fields are filled out correctly.';
        } else if (error.message.includes('Network')) {
          errorTitle = 'Connection Problem';
          errorMessage = 'Please check your internet connection and try again.';
        }
      }
      
      showCustomAlert(
        errorTitle,
        errorMessage,
        [
          { text: 'Try Again', onPress: handleSubmit },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [validateForm, feedbackType, message, rating, email, selectedIssues, resetForm, refreshFeedback, currentUserId, checkForNewReplies, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFeedback();
      
      if (currentUserId) {
        await checkForNewReplies();
        await NotificationManager.checkForFeedbackReplies(currentUserId);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
    setRefreshing(false);
  }, [refreshFeedback, currentUserId, checkForNewReplies]);

  const renderStarRating = useCallback(() => (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>Rate your experience</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRatingPress(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={28}
              color={star <= rating ? '#FFD700' : '#E5E7EB'}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingFeedback}>
          {RATING_LABELS[rating - 1]}
        </Text>
      )}
    </View>
  ), [rating, handleRatingPress]);

  const renderAdminReplies = useCallback(() => {
    if (feedbackWithReplies.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#B22020" />
          </View>
          <Text style={styles.emptyTitle}>No replies yet</Text>
          <Text style={styles.emptySubtitle}>
            Admin responses to your feedback will appear here.{'\n'}
            You'll receive notifications when we reply!
          </Text>
          <TouchableOpacity 
            style={styles.emptyAction}
            onPress={() => setShowReplies(false)}
          >
            <Text style={styles.emptyActionText}>Submit New Feedback</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.repliesContainer}
        refreshControl={
          <RefreshControl refreshing={repliesLoading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.repliesContent}
      >
        {feedbackWithReplies.map((item, index) => (
          <View key={item.id || index} style={styles.replyCard}>
            <View style={styles.replyHeader}>
              <View style={styles.replyTypeContainer}>
                <Ionicons 
                  name={getTypeIcon(item.type) as any} 
                  size={16} 
                  color="#B22020" 
                />
                <Text style={styles.replyTypeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
              <View style={[
                styles.replyStatus,
                { backgroundColor: getStatusColor(item.status || 'pending') }
              ]}>
                <Text style={styles.replyStatusText}>
                  {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.originalFeedback}>
              <Text style={styles.originalLabel}>Your feedback:</Text>
              <Text style={styles.originalText} numberOfLines={2}>
                {item.message}
              </Text>
            </View>

            <View style={styles.adminResponse}>
              <View style={styles.adminHeader}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.adminLabel}>Admin Response</Text>
                {item.responded_at && (
                  <Text style={styles.responseTime}>
                    {formatTimeAgo(item.responded_at)}
                  </Text>
                )}
              </View>
              <Text style={styles.adminText}>
                {item.admin_response}
              </Text>
            </View>

            {item.rating && item.type === 'general' && (
              <View style={styles.ratingDisplay}>
                <Text style={styles.ratingDisplayLabel}>Your rating: </Text>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= item.rating! ? 'star' : 'star-outline'}
                    size={12}
                    color={star <= item.rating! ? '#FFD700' : '#E5E7EB'}
                  />
                ))}
                <Text style={styles.ratingDisplayValue}>({item.rating}/5)</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  }, [feedbackWithReplies, repliesLoading, onRefresh, getTypeIcon, getStatusColor, formatTimeAgo]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      <CustomAlert
        visible={alertVisible}
        title={alertData.title}
        message={alertData.message}
        buttons={alertData.buttons}
        onClose={() => setAlertVisible(false)}
      />
      
      <LinearGradient colors={['#B22020', '#4C0E0E']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Feedback</Text>
          
          <TouchableOpacity 
            onPress={() => setShowReplies(!showReplies)}
            style={styles.toggleButton}
          >
            <Ionicons 
              name={showReplies ? "create-outline" : "chatbubbles-outline"} 
              size={20} 
              color="white" 
            />
            {feedbackWithReplies.length > 0 && !showReplies && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{feedbackWithReplies.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerSubtitle}>
          {showReplies 
            ? 'View admin responses to your feedback'
            : 'Help us improve VALET with your insights'
          }
        </Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, !showReplies && styles.activeTab]}
            onPress={() => setShowReplies(false)}
          >
            <Text style={[styles.tabText, !showReplies && styles.activeTabText]}>
              New Feedback
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, showReplies && styles.activeTab]}
            onPress={() => setShowReplies(true)}
          >
            <Text style={[styles.tabText, showReplies && styles.activeTabText]}>
              Replies {feedbackWithReplies.length > 0 && `(${feedbackWithReplies.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {showReplies ? (
        renderAdminReplies()
      ) : (
        <KeyboardAvoidingView
          style={styles.contentContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What would you like to share?</Text>
              <View style={styles.typeGrid}>
                {FEEDBACK_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeCard,
                      feedbackType === type.value && styles.selectedTypeCard
                    ]}
                    onPress={() => setFeedbackType(type.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.typeIcon,
                      feedbackType === type.value && styles.selectedTypeIcon
                    ]}>
                      <Ionicons 
                        name={type.icon as any} 
                        size={20} 
                        color={feedbackType === type.value ? 'white' : '#B22020'} 
                      />
                    </View>
                    <Text style={[
                      styles.typeLabel,
                      feedbackType === type.value && styles.selectedTypeLabel
                    ]}>
                      {type.label}
                    </Text>
                    <Text style={[
                      styles.typeDescription,
                      feedbackType === type.value && styles.selectedTypeDescription
                    ]}>
                      {type.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {feedbackType === 'general' && (
              <View style={styles.section}>
                <View style={styles.card}>
                  {renderStarRating()}
                </View>
              </View>
            )}
            {getCommonIssuesForType(feedbackType).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Related Issues</Text>
                <Text style={styles.sectionSubtitle}>
                  Select any that apply (optional)
                </Text>
                <View style={styles.card}>
                  <View style={styles.chipsContainer}>
                    {getCommonIssuesForType(feedbackType).map((issue) => (
                      <TouchableOpacity
                        key={issue}
                        style={[
                          styles.chip,
                          selectedIssues.includes(issue) && styles.selectedChip
                        ]}
                        onPress={() => handleIssueToggle(issue)}
                      >
                        <Text style={[
                          styles.chipText,
                          selectedIssues.includes(issue) && styles.selectedChipText
                        ]}>
                          {issue}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>  
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Message</Text>
              <Text style={styles.sectionSubtitle}>
                Share your detailed feedback
              </Text>
              <View style={styles.card}>
                <TextInput
                  placeholder={getPlaceholderText()}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  style={styles.textInput}
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <View style={styles.inputFooter}>
                  <Text style={styles.characterCount}>
                    {message.length}/1000
                  </Text>
                  <Text style={styles.requiredIndicator}>Required</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email (Optional)</Text>
              <Text style={styles.sectionSubtitle}>
                For follow-up responses
              </Text>
              <View style={styles.emailInputCard}>
                <View style={styles.emailInputContainer}>
                  <Ionicons name="mail-outline" size={18} color="#6B7280" />
                  <TextInput
                    placeholder="your.email@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.emailInput}
                    placeholderTextColor="#9CA3AF"
                    maxLength={100}
                  />
                </View>
              </View>
            </View>

            <View style={styles.submitContainer}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.submitButton, loading && styles.disabledButton]}
              >
                <LinearGradient
                  colors={loading ? ['#9CA3AF', '#6B7280'] : ['#B22020', '#8B1917']}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={18} color="white" />
                  )}
                  <Text style={styles.submitText}>
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <Ionicons name="headset" size={20} color="#B22020" />
                  <Text style={styles.contactTitle}>Need immediate help?</Text>
                </View>
                <Text style={styles.contactSubtitle}>
                  Contact support for urgent issues
                </Text>
                <View style={styles.contactOptions}>
                  <TouchableOpacity style={styles.contactOption}>
                    <Ionicons name="mail" size={14} color="#6B7280" />
                    <Text style={styles.contactText}>support@valet-parking.com</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactOption}>
                    <Ionicons name="call" size={14} color="#6B7280" />
                    <Text style={styles.contactText}>+63 919 123 456</Text>
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