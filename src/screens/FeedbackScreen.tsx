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
  description: string;
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

  // 🔥 UPDATED: More descriptive feedback types
  const feedbackTypes: FeedbackType[] = [
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

  const commonIssues = [
    'Sensor accuracy',
    'App crashes',
    'Slow loading',
    'Wrong spot status',
    'Map navigation',
    'Notifications',
    'Login issues',
    'Data sync',
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
      Alert.alert('Required Field', 'Please share your feedback with us');
      return false;
    }

    if (message.trim().length < 10) {
      Alert.alert('More Details Needed', 'Please provide more detailed feedback (at least 10 characters)');
      return false;
    }

    if (feedbackType === 'general' && rating === 0) {
      Alert.alert('Rating Required', 'Please rate your experience');
      return false;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
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
      await refreshFeedback();

      Alert.alert(
        'Thank You! 🙏',
        `Your feedback has been submitted successfully.\n\n`,
        [
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
      
      let errorMessage = 'Failed to submit your feedback. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed')) {
          errorMessage = 'Authentication error. Please contact support.';
        } else if (error.message.includes('Validation failed')) {
          errorMessage = 'Please check your input and try again.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection.';
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
        return "Tell us about your experience with VALET. What did you like? What could be improved?";
      case 'parking':
        return "Describe the parking issue you encountered. Which floor or area was affected?";
      case 'technical':
        return "What technical problem did you experience? When did it happen?";
      case 'suggestion':
        return "What new feature would you like to see? How would it improve your experience?";
      default:
        return "Share your thoughts with us...";
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
      return `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}m ago`;
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
        return 'star-outline';
      case 'technical':
        return 'bug-outline';
      case 'suggestion':
        return 'bulb-outline';
      case 'parking':
        return 'car-outline';
      default:
        return 'chatbubble-outline';
    }
  };

  const renderStarRating = () => {
    return (
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
            {rating === 1 && 'Very Poor 😞'}
            {rating === 2 && 'Poor 😐'}
            {rating === 3 && 'Average 🙂'}
            {rating === 4 && 'Good 😊'}
            {rating === 5 && 'Excellent 🤩'}
          </Text>
        )}
      </View>
    );
  };

  const renderAdminReplies = () => {
    if (feedbackWithReplies.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#B22020" />
          </View>
          <Text style={styles.emptyTitle}>No replies yet</Text>
          <Text style={styles.emptySubtitle}>
            Admin responses to your feedback will appear here
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
          <RefreshControl refreshing={repliesLoading} onRefresh={refreshFeedback} />
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
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B22020" />
      
      {/* Header */}
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

      {/* Content */}
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
            
            {/* Feedback Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What would you like to share?</Text>
              <View style={styles.typeGrid}>
                {feedbackTypes.map((type) => (
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

            {/* Rating Section */}
            {feedbackType === 'general' && (
              <View style={styles.section}>
                <View style={styles.card}>
                  {renderStarRating()}
                </View>
              </View>
            )}

            {/* Common Issues */}
            {(feedbackType === 'technical' || feedbackType === 'parking') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Related Issues</Text>
                <Text style={styles.sectionSubtitle}>
                  Select any that apply (optional)
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

            {/* Email Input */}
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

            {/* Submit Button */}
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

            {/* Quick Contact */}
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
                    <Text style={styles.contactText}>+63 919 929 6588</Text>
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