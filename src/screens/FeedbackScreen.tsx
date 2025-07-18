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
import FirebaseService, { FeedbackData } from '../services/FirebaseService';
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

  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  useEffect(() => {
    const testFirebaseConnection = async () => {
      try {
        console.log('Testing Firebase connection...');
        const isConnected = await FirebaseService.testConnection();
        console.log('Firebase connection test result:', isConnected);
        
        if (!isConnected) {
          Alert.alert(
            'Connection Issue',
            'Unable to connect to the feedback system. Please check your internet connection.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Firebase connection test failed:', error);
      }
    };

    testFirebaseConnection();
  }, []);

  const feedbackTypes: FeedbackType[] = [
    { value: 'general', label: 'General Feedback', icon: 'chatbubble-outline' },
    { value: 'bug', label: 'Report Bug', icon: 'bug-outline' },
    { value: 'feature', label: 'Feature Request', icon: 'bulb-outline' },
    { value: 'parking', label: 'Parking Issue', icon: 'car-outline' },
  ];

  // Common issues for bug reports and parking issues
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

  // Rating handler
  const handleRatingPress = (value: number) => {
    setRating(value);
  };

  // Issue toggle handler
  const handleIssueToggle = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  // Form validation
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

    // Email validation if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address');
        return false;
      }
    }

    return true;
  };

  // Reset form to initial state
  const resetForm = () => {
    setMessage('');
    setEmail('');
    setRating(0);
    setSelectedIssues([]);
    setFeedbackType('general');
  };

  // Main submit handler
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get device information
      const deviceInfo = await getBasicDeviceInfo();

      // Prepare feedback data - only include defined values
      const feedbackData: any = {
        type: feedbackType,
        message: message.trim(),
        deviceInfo: {
          platform: deviceInfo.platform,
          version: deviceInfo.version,
          model: deviceInfo.model,
        },
      };

      // Only add rating if it's for general feedback and has a value
      if (feedbackType === 'general' && rating > 0) {
        feedbackData.rating = rating;
      }

      // Only add email if it's provided
      if (email.trim()) {
        feedbackData.email = email.trim();
      }

      // Only add issues if any are selected
      if (selectedIssues.length > 0) {
        feedbackData.issues = selectedIssues;
      }

      console.log('Submitting feedback data:', feedbackData);

      // Submit to Firebase
      const feedbackId = await FirebaseService.submitFeedback(feedbackData);
      
      console.log('Feedback submitted successfully with ID:', feedbackId);

      // Reset form
      resetForm();

      // Show success message
      Alert.alert(
        'Thank You! 🙏',
        'Your feedback has been submitted successfully. We appreciate your input and will use it to improve VALET!\n\nFeedback ID: ' + feedbackId.substring(0, 8),
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
      Alert.alert(
        'Submission Failed',
        'An error occurred while submitting your feedback. Please check your internet connection and try again.\n\nError: ' + (error instanceof Error ? error.message : String(error)),
        [
          { text: 'Retry', onPress: handleSubmit },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Get placeholder text based on feedback type
  const getPlaceholderText = (): string => {
    switch (feedbackType) {
      case 'general':
        return "Tell us what you think about the VALET app. What do you like? What could be improved?";
      case 'bug':
        return "Describe the bug you encountered. Please include when it happened and what you were trying to do.";
      case 'feature':
        return "What feature would you like to see in VALET? How would it help you?";
      case 'parking':
        return "Describe the parking issue you experienced. Which floor/section was affected?";
      default:
        return "Please share your feedback with us...";
    }
  };

  // Render star rating component
  const renderStarRating = () => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>How would you rate your experience?</Text>
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
              {rating === 1 && '😞 Poor'}
              {rating === 2 && '😐 Fair'}
              {rating === 3 && '🙂 Good'}
              {rating === 4 && '😊 Very Good'}
              {rating === 5 && '🤩 Excellent'}
            </Text>
          </View>
        )}
      </View>
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
            <Text style={styles.headerTitle}>Feedback</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
        
        <View style={styles.headerDescriptionContainer}>
          <Text style={styles.headerDescription}>
            Help us improve VALET by sharing your thoughts and experiences
          </Text>
        </View>
      </LinearGradient>

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
    </View>
  );
};


export default FeedbackScreen;