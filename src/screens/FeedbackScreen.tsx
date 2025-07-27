import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
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
import { FeedbackData } from '../types/feedback';
import { getBasicDeviceInfo } from '../utils/deviceInfo';
import { styles } from './styles/FeedbackScreen.style';

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

type FeedbackScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Feedback'>;

interface Props {
  navigation: FeedbackScreenNavigationProp;
}

interface FeedbackType {
  value: FeedbackData['type'];
  label: string;
  icon: string;
}

const FeedbackScreen: React.FC<Props> = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Main state
  const [showReplies, setShowReplies] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  // Use feedback hook
  const { feedback, loading: repliesLoading, refreshFeedback } = useFeedback();

  useEffect(() => {
    const testApiConnection = async () => {
      try {
        console.log('Testing API connection...');
        const isConnected = await ApiService.testConnection();
        console.log('API connection test result:', isConnected);
        
        if (!isConnected) {
          Alert.alert(
            'Connection Issue',
            'Unable to connect to the feedback system. Please check your internet connection.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('API connection test failed:', error);
      }
    };

    testApiConnection();
  }, []);

  // 🔥 UPDATED: More appropriate feedback types for parking app
  const feedbackTypes: FeedbackType[] = [
    { value: 'general', label: 'App Experience', icon: 'star-outline' },
    { value: 'parking', label: 'Parking Issues', icon: 'car-outline' },
    { value: 'technical', label: 'Technical Problems', icon: 'settings-outline' },
    { value: 'suggestion', label: 'Suggestions', icon: 'bulb-outline' },
  ];

  const commonIssues = [
    'Sensor not working',
    'App performance',
    'Incorrect spot status',
    'Navigation issues',
    'Notification problems',
    'UI/UX concerns',
    'Connection problems',
    'Data not updating',
  ];

  // Get feedback with admin replies
  const feedbackWithReplies = feedback.filter(item => 
    item.admin_response && item.admin_response.trim().length > 0
  );

  const handleRatingPress = (value: number) => {
    setRating(value);
  };

  const handleIssueToggle = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const validateForm = (): boolean => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return false;
    }

    if (message.trim().length < 10) {
      Alert.alert('Error', 'Please provide more detailed feedback (at least 10 characters)');
      return false;
    }

    if (feedbackType === 'general' && rating === 0) {
      Alert.alert('Error', 'Please provide a rating for your experience');
      return false;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address');
        return false;
      }
    }

    return true;
  };

  const resetForm = () => {
    setMessage('');
    setEmail('');
    setRating(0);
    setSelectedIssues([]);
    setFeedbackType('general');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let deviceInfo;
      try {
        deviceInfo = await getBasicDeviceInfo();
        console.log('Device info collected:', deviceInfo);
      } catch (deviceError) {
        console.error('Failed to get device info:', deviceError);
        deviceInfo = {
          platform: 'unknown',
          version: 'unknown',
          model: 'Unknown Device',
          systemVersion: 'unknown',
          appVersion: '1.0.0',
          buildNumber: '1',
        };
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

      console.log('Submitting feedback data:', feedbackData);

      const feedbackId = await ApiService.submitFeedback(feedbackData);
      
      console.log('Feedback submitted successfully with ID:', feedbackId);

      resetForm();
      await refreshFeedback(); // Refresh the feedback list

      Alert.alert(
        'Thank You! 🙏',
        'Your feedback has been submitted successfully. We appreciate your input and will use it to improve VALET!\n\nFeedback ID: #' + feedbackId,
        [
          { 
            text: 'View Replies', 
            style: 'default',
            onPress: () => setShowReplies(true)
          },
          { 
            text: 'Submit Another', 
            style: 'default'
          },
          { 
            text: 'Done', 
            style: 'cancel',
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      let errorMessage = 'An error occurred while submitting your feedback. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed')) {
          errorMessage = 'Authentication error. Please contact support.';
        } else if (error.message.includes('Validation failed')) {
          errorMessage = 'Please check your input and try again.\n\n' + error.message;
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Submission Failed',
        errorMessage,
        [
          { text: 'Retry', onPress: handleSubmit },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderText = (): string => {
    switch (feedbackType) {
      case 'general':
        return "How was your experience with VALET? What did you like or dislike about the app?";
      case 'parking':
        return "Describe the parking issue you encountered. Which floor or section was affected? When did this happen?";
      case 'technical':
        return "What technical problem did you experience? Please describe what happened and when it occurred.";
      case 'suggestion':
        return "What feature or improvement would you like to see in VALET? How would it make your parking experience better?";
      default:
        return "Please share your feedback with us...";
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'reviewed':
        return '#EF4444';
      case 'resolved':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return 'chatbubble-outline';
      case 'bug':
        return 'bug-outline';
      case 'feature':
        return 'bulb-outline';
      case 'parking':
        return 'car-outline';
      default:
        return 'document-outline';
    }
  };

  const renderStarRating = () => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>How would you rate your overall experience with VALET?</Text>
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
                size={32}
                color={star <= rating ? '#FFD700' : '#DDD'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <View style={styles.ratingTextContainer}>
            <Text style={styles.ratingText}>
              {rating === 1 && '😞 Very Poor'}
              {rating === 2 && '😐 Poor'}
              {rating === 3 && '🙂 Average'}
              {rating === 4 && '😊 Good'}
              {rating === 5 && '🤩 Excellent'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAdminReplies = () => {
    if (feedbackWithReplies.length === 0) {
      return (
        <View style={styles.emptyRepliesContainer}>
          <Ionicons name="mail-open-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyRepliesTitle}>No replies yet</Text>
          <Text style={styles.emptyRepliesText}>
            When admins respond to your feedback, their replies will appear here
          </Text>
          <TouchableOpacity 
            style={styles.newFeedbackButton}
            onPress={() => setShowReplies(false)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#B22020" />
            <Text style={styles.newFeedbackButtonText}>Submit New Feedback</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.repliesScrollView}
        refreshControl={
          <RefreshControl refreshing={repliesLoading} onRefresh={refreshFeedback} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.repliesScrollViewContent}
      >
        {feedbackWithReplies.map((item, index) => (
          <View key={item.id || index} style={styles.replyCard}>
            {/* Original Feedback Header */}
            <View style={styles.originalFeedbackHeader}>
              <View style={styles.feedbackTypeContainer}>
                <Ionicons 
                  name={getTypeIcon(item.type) as any} 
                  size={16} 
                  color="#6B7280" 
                />
                <Text style={styles.feedbackTypeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Feedback
                </Text>
              </View>
              
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status || 'pending') }
              ]}>
                <Text style={styles.statusText}>
                  {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
                </Text>
              </View>
            </View>

            {/* Original Message Preview */}
            <View style={styles.originalMessageContainer}>
              <Text style={styles.originalMessageLabel}>Your feedback:</Text>
              <Text 
                style={styles.originalMessage}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.message}
              </Text>
            </View>

            {/* Admin Reply */}
            <View style={styles.adminReplyContainer}>
              <View style={styles.adminReplyHeader}>
                <Ionicons name="person-circle-outline" size={20} color="#B22020" />
                <Text style={styles.adminReplyLabel}>Admin Response</Text>
                {item.responded_at && (
                  <Text style={styles.replyTime}>
                    {formatTimeAgo(item.responded_at)}
                  </Text>
                )}
              </View>
              
              <Text style={styles.adminReplyText}>
                {item.admin_response}
              </Text>
            </View>

            {/* Show rating if it exists */}
            {item.rating && item.type === 'general' && (
              <View style={styles.ratingDisplayContainer}>
                <Text style={styles.ratingDisplayLabel}>Your rating: </Text>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= item.rating! ? 'star' : 'star-outline'}
                    size={14}
                    color={star <= item.rating! ? '#FFD700' : '#D1D5DB'}
                    style={styles.ratingDisplayStar}
                  />
                ))}
                <Text style={styles.ratingDisplayValue}>({item.rating}/5)</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      {/* Header */}
      <LinearGradient colors={['#B22020', '#4C0E0E']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {showReplies ? 'Admin Replies' : 'Feedback'}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => setShowReplies(!showReplies)}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showReplies ? "create-outline" : "chatbubbles-outline"} 
              size={20} 
              color="white" 
            />
            {feedbackWithReplies.length > 0 && showReplies && (
              <View style={styles.replyBadge}>
                <Text style={styles.replyBadgeText}>{feedbackWithReplies.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerDescriptionContainer}>
          <Text style={styles.headerDescription}>
            {showReplies 
              ? 'View responses from our admin team'
              : 'Help us improve VALET by sharing your thoughts and experiences'
            }
          </Text>
        </View>

        {/* Tab Indicator */}
        <View style={styles.tabIndicatorContainer}>
          <TouchableOpacity 
            style={[styles.tabIndicator, !showReplies && styles.activeTabIndicator]}
            onPress={() => setShowReplies(false)}
          >
            <Text style={[styles.tabIndicatorText, !showReplies && styles.activeTabIndicatorText]}>
              New Feedback
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabIndicator, showReplies && styles.activeTabIndicator]}
            onPress={() => setShowReplies(true)}
          >
            <Text style={[styles.tabIndicatorText, showReplies && styles.activeTabIndicatorText]}>
              Replies {feedbackWithReplies.length > 0 && `(${feedbackWithReplies.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      {showReplies ? (
        renderAdminReplies()
      ) : (
        <KeyboardAvoidingView
          style={styles.contentContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
          >
            
            {/* Feedback Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What type of feedback do you have?</Text>
              <View style={styles.feedbackTypesContainer}>
                {feedbackTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.feedbackTypeCard,
                      feedbackType === type.value && styles.selectedFeedbackTypeCard
                    ]}
                    onPress={() => setFeedbackType(type.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.feedbackTypeIcon,
                      feedbackType === type.value && styles.selectedFeedbackTypeIcon
                    ]}>
                      <Ionicons 
                        name={type.icon as any} 
                        size={24} 
                        color={feedbackType === type.value ? 'white' : '#B22020'} 
                      />
                    </View>
                    <Text style={[
                      styles.feedbackTypeLabel,
                      feedbackType === type.value && styles.selectedFeedbackTypeLabel
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rating Section (only for general feedback) */}
            {feedbackType === 'general' && (
              <View style={styles.section}>
                <View style={styles.card}>
                  {renderStarRating()}
                </View>
              </View>
            )}

            {/* Common Issues (for bug reports and parking issues) */}
            {(feedbackType === 'bug' || feedbackType === 'parking') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Related Issues (Optional)</Text>
                <Text style={styles.sectionSubtitle}>
                  Select any that apply to help us understand your issue better
                </Text>
                <View style={styles.card}>
                  <View style={styles.chipsContainer}>
                    {commonIssues.map((issue) => (
                      <TouchableOpacity
                        key={issue}
                        style={[
                          styles.chip,
                          selectedIssues.includes(issue) && styles.selectedChip
                        ]}
                        onPress={() => handleIssueToggle(issue)}
                        activeOpacity={0.7}
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

            {/* Message Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Message *</Text>
              <Text style={styles.sectionSubtitle}>
                Please provide detailed feedback to help us understand your experience
              </Text>
              <View style={styles.card}>
                <TextInput
                  placeholder={getPlaceholderText()}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  style={styles.textInput}
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.characterCount}>
                  {message.length}/1000 characters
                </Text>
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email (Optional)</Text>
              <Text style={styles.sectionSubtitle}>
                Leave your email if you'd like us to follow up with you
              </Text>
              <View style={styles.emailCard}>
                <View style={styles.emailInputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#666" style={styles.emailIcon} />
                  <TextInput
                    placeholder="your.email@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.emailInput}
                    placeholderTextColor="#999"
                    maxLength={100}
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <View style={styles.submitSection}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.submitButton, loading && styles.disabledButton]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#999', '#666'] : ['#B22020', '#4C0E0E']}
                  style={styles.submitButtonGradient}
                >
                  <View style={styles.submitButtonContent}>
                    {loading ? (
                      <ActivityIndicator size="small" color="white" style={styles.submitButtonIcon} />
                    ) : (
                      <Ionicons 
                        name="send" 
                        size={20} 
                        color="white" 
                        style={styles.submitButtonIcon}
                      />
                    )}
                    <Text style={styles.submitButtonText}>
                      {loading ? 'Submitting...' : 'Submit Feedback'}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Contact Info Card */}
            <View style={styles.section}>
              <View style={[styles.card, styles.contactCard]}>
                <View style={styles.contactHeader}>
                  <Ionicons name="headset" size={24} color="#B22020" />
                  <Text style={styles.contactTitle}>Need immediate assistance?</Text>
                </View>
                <Text style={styles.contactText}>
                  Contact our support team for urgent issues:
                </Text>
                <View style={styles.contactMethods}>
                  <TouchableOpacity style={styles.contactMethod} activeOpacity={0.7}>
                    <Ionicons name="mail" size={16} color="#666" />
                    <Text style={styles.contactMethodText}>support@valet-parking.com</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactMethod} activeOpacity={0.7}>
                    <Ionicons name="call" size={16} color="#666" />
                    <Text style={styles.contactMethodText}>+63 919 929 6588</Text>
                  </TouchableOpacity>
                  <View style={styles.contactMethod}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.contactMethodText}>24/7 Support Available</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Privacy Notice */}
            <View style={styles.section}>
              <View style={[styles.card, styles.privacyCard]}>
                <View style={styles.privacyHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#059669" />
                  <Text style={styles.privacyTitle}>Privacy Notice</Text>
                </View>
                <Text style={styles.privacyText}>
                  Your feedback is important to us. We collect device information to help us improve our service. 
                  Your email will only be used to follow up on your feedback if requested.
                </Text>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default FeedbackScreen;