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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TextInput, Button, Card, RadioButton, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

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
  const [feedbackType, setFeedbackType] = useState('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  const feedbackTypes = [
    { value: 'general', label: 'General Feedback' },
    { value: 'bug', label: 'Report Bug' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'parking', label: 'Parking Issue' },
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
              <MaterialIcons
                name={star <= rating ? 'star' : 'star-border'}
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInUp" delay={200}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.header}>
                <MaterialIcons name="feedback" size={40} color="#B71C1C" />
                <Text style={styles.title}>We'd love to hear from you!</Text>
              </View>
              <Text style={styles.subtitle}>
                Your feedback helps us improve the VALET experience and make parking easier for everyone.
              </Text>

              {/* Feedback Type Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What type of feedback do you have?</Text>
                <RadioButton.Group
                  onValueChange={setFeedbackType}
                  value={feedbackType}
                >
                  {feedbackTypes.map((type) => (
                    <View key={type.value} style={styles.radioItem}>
                      <RadioButton
                        value={type.value}
                        color="#B71C1C"
                      />
                      <Text style={styles.radioLabel}>{type.label}</Text>
                    </View>
                  ))}
                </RadioButton.Group>
              </View>

              {/* Rating Section (only for general feedback) */}
              {feedbackType === 'general' && (
                <Animatable.View animation="fadeIn" style={styles.section}>
                  {renderStarRating()}
                </Animatable.View>
              )}

              {/* Common Issues (for bug reports and parking issues) */}
              {(feedbackType === 'bug' || feedbackType === 'parking') && (
                <Animatable.View animation="fadeIn" style={styles.section}>
                  <Text style={styles.sectionTitle}>Related Issues (Optional)</Text>
                  <Text style={styles.sectionSubtitle}>
                    Select any that apply to help us understand your issue better
                  </Text>
                  <View style={styles.chipsContainer}>
                    {commonIssues.map((issue) => (
                      <Chip
                        key={issue}
                        selected={selectedIssues.includes(issue)}
                        onPress={() => handleIssueToggle(issue)}
                        style={[
                          styles.chip,
                          selectedIssues.includes(issue) && styles.selectedChip
                        ]}
                        textStyle={[
                          styles.chipText,
                          selectedIssues.includes(issue) && styles.selectedChipText
                        ]}
                      >
                        {issue}
                      </Chip>
                    ))}
                  </View>
                </Animatable.View>
              )}

              {/* Message Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Message *</Text>
                <TextInput
                  mode="outlined"
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
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#B71C1C"
                />
              </View>

              {/* Email Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Email (Optional)</Text>
                <Text style={styles.sectionSubtitle}>
                  Leave your email if you'd like us to follow up with you
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="your.email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#B71C1C"
                  left={<TextInput.Icon icon={() => <MaterialIcons name="email" size={20} color="#666" />} />}
                />
              </View>
            </Card.Content>
          </Card>
        </Animatable.View>

        {/* Submit Button */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.submitContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            buttonColor="#B71C1C"
            contentStyle={styles.submitButtonContent}
            icon={() => <MaterialIcons name="send" size={20} color="#FFFFFF" />}
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </Animatable.View>

        {/* Contact Info */}
        <Animatable.View animation="fadeInUp" delay={600}>
          <Card style={styles.contactCard}>
            <Card.Content>
              <View style={styles.contactHeader}>
                <MaterialIcons name="headset-mic" size={24} color="#B71C1C" />
                <Text style={styles.contactTitle}>Need immediate assistance?</Text>
              </View>
              <Text style={styles.contactText}>
                Contact our support team for urgent issues:
              </Text>
              <View style={styles.contactMethods}>
                <View style={styles.contactMethod}>
                  <MaterialIcons name="email" size={16} color="#666" />
                  <Text style={styles.contactMethodText}>support@valet-parking.com</Text>
                </View>
                <View style={styles.contactMethod}>
                  <MaterialIcons name="phone" size={16} color="#666" />
                  <Text style={styles.contactMethodText}>+63 123 456 7890</Text>
                </View>
                <View style={styles.contactMethod}>
                  <MaterialIcons name="schedule" size={16} color="#666" />
                  <Text style={styles.contactMethodText}>24/7 Support Available</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </Animatable.View>

        {/* Thank You Message */}
        <Animatable.View animation="fadeInUp" delay={800}>
          <Card style={styles.thankYouCard}>
            <Card.Content>
              <Text style={styles.thankYouText}>
                🚗 Thank you for helping us make VALET better! Your feedback is valuable to us and helps improve the parking experience for everyone at USJ-R.
              </Text>
            </Card.Content>
          </Card>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 20,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  starButton: {
    paddingHorizontal: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#B71C1C',
    fontWeight: 'bold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  selectedChip: {
    backgroundColor: '#B71C1C',
  },
  chipText: {
    color: '#333',
  },
  selectedChipText: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
  },
  submitContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  contactCard: {
    margin: 20,
    marginTop: 0,
    elevation: 2,
    backgroundColor: '#E3F2FD',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  contactMethods: {
    gap: 8,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactMethodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  thankYouCard: {
    margin: 20,
    marginTop: 0,
    marginBottom: 40,
    elevation: 2,
    backgroundColor: '#E8F5E8',
  },
  thankYouText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default FeedbackScreen;