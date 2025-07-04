import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
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

// Define types locally
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

const FeedbackScreen: React.FC<Props> = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [feedbackType, setFeedbackType] = useState('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  if (!fontsLoaded) return null;

  const feedbackTypes = [
    { value: 'general', label: 'General Feedback', icon: 'chatbubble-outline' },
    { value: 'bug', label: 'Report Bug', icon: 'bug-outline' },
    { value: 'feature', label: 'Feature Request', icon: 'bulb-outline' },
    { value: 'parking', label: 'Parking Issue', icon: 'car-outline' },
  ];

  const commonIssues = [
    'Sensor not working',
    'App performance',
    'Incorrect spot status',
    'Navigation issues',
    'Notification problems',
    'UI/UX concerns',
  ];

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

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }

    if (feedbackType === 'general' && rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const feedbackData = {
        type: feedbackType,
        message: message.trim(),
        rating: feedbackType === 'general' ? rating : undefined,
        email: email.trim() || undefined,
        issues: selectedIssues.length > 0 ? selectedIssues : undefined,
        timestamp: new Date().toISOString(),
      };

      console.log('Feedback submitted:', feedbackData);

      Alert.alert(
        'Thank You! 🙏',
        'Your feedback has been submitted successfully. We appreciate your input and will use it to improve VALET!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'An error occurred while submitting feedback.');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.ratingText}>
            {rating === 1 && '😞 Poor'}
            {rating === 2 && '😐 Fair'}
            {rating === 3 && '🙂 Good'}
            {rating === 4 && '😊 Very Good'}
            {rating === 5 && '🤩 Excellent'}
          </Text>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
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
            <View style={styles.card}>
              <TextInput
                placeholder={
                  feedbackType === 'general' 
                    ? "Tell us what you think about the VALET app..."
                    : feedbackType === 'bug'
                    ? "Describe the bug you encountered and when it happened..."
                    : feedbackType === 'feature'
                    ? "What feature would you like to see in VALET..."
                    : "Describe the parking issue you experienced..."
                }
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                style={styles.textInput}
                placeholderTextColor="#999"
              />
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
                  style={styles.emailInput}
                  placeholderTextColor="#999"
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
            >
              <LinearGradient
                colors={loading ? ['#999', '#666'] : ['#B22020', '#4C0E0E']}
                style={styles.submitButtonGradient}
              >
                <View style={styles.submitButtonContent}>
                  <Ionicons 
                    name={loading ? "hourglass-outline" : "send"} 
                    size={20} 
                    color="white" 
                    style={styles.submitButtonIcon}
                  />
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
                <View style={styles.contactMethod}>
                  <Ionicons name="mail" size={16} color="#666" />
                  <Text style={styles.contactMethodText}>support@valet-parking.com</Text>
                </View>
                <View style={styles.contactMethod}>
                  <Ionicons name="call" size={16} color="#666" />
                  <Text style={styles.contactMethodText}>+63 919 929 6588</Text>
                </View>
                <View style={styles.contactMethod}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.contactMethodText}>24/7 Support Available</Text>
                </View>
              </View>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    alignItems: 'flex-start',
    color: 'white',
  },
  headerPlaceholder: {
    width: 34,
  },
  headerDescriptionContainer: {
    alignItems: 'center',
  },
  headerDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  feedbackTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFeedbackTypeCard: {
    borderColor: '#B22020',
    backgroundColor: '#FEF2F2',
  },
  feedbackTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedFeedbackTypeIcon: {
    backgroundColor: '#B22020',
  },
  feedbackTypeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    textAlign: 'center',
  },
  selectedFeedbackTypeLabel: {
    color: '#B22020',
    fontFamily: 'Poppins_600SemiBold',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B22020',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedChip: {
    backgroundColor: '#B22020',
    borderColor: '#B22020',
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
  },
  selectedChipText: {
    color: 'white',
  },
  textInput: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  emailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailIcon: {
    marginRight: 8,
    marginLeft: 10
  },
  emailInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    height: 40,
    marginTop: 5
  },
  submitSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
  contactCard: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    marginLeft: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  contactMethods: {
    gap: 12,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactMethodText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    marginLeft: 8,
  },
  thankYouCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 40,
  },
  thankYouHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  thankYouTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#065F46',
    marginLeft: 8,
  },
  thankYouText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#047857',
    lineHeight: 22,
  },
});

export default FeedbackScreen;