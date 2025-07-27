import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from '../hooks/useFeedback';
import { FeedbackData } from '../types/feedback';
import { FeedbackNotificationHelper } from '../utils/feedbackNotif';
import { adminRepliesStyles } from './styles/AdminRepliesSection.style';

interface AdminRepliesSectionProps {
  onRefresh?: () => void;
}

const AdminRepliesSection: React.FC<AdminRepliesSectionProps> = ({ onRefresh }) => {
  const { feedback, loading, refreshFeedback } = useFeedback();

  // Filter feedback that has admin responses
  const feedbackWithReplies = feedback.filter(item => 
    item.admin_response && item.admin_response.trim().length > 0
  );

  // ✅ NEW: Process feedback for notifications whenever feedback data changes
  useEffect(() => {
    if (feedback && feedback.length > 0) {
      // Process feedback replies to create notifications for admin responses
      FeedbackNotificationHelper.processFeedbackArray(feedback);
    }
  }, [feedback]);

  const handleRefresh = async () => {
    await refreshFeedback();
    
    // ✅ NEW: After refreshing feedback, process for new notifications
    if (feedback && feedback.length > 0) {
      await FeedbackNotificationHelper.processFeedbackArray(feedback);
    }
    
    onRefresh?.();
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

  // ✅ NEW: Manual test function to create notification
  const handleTestNotification = async () => {
    await FeedbackNotificationHelper.createTestNotification();
    console.log('🧪 Test feedback notification created manually');
  };

  if (feedbackWithReplies.length === 0) {
    return (
      <View style={adminRepliesStyles.container}>
        <View style={adminRepliesStyles.header}>
          <Ionicons name="chatbubbles-outline" size={24} color="#B22020" />
          <Text style={adminRepliesStyles.headerTitle}>Admin Replies</Text>
          <TouchableOpacity onPress={handleRefresh} style={adminRepliesStyles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <View style={adminRepliesStyles.emptyState}>
          <Ionicons name="mail-open-outline" size={48} color="#D1D5DB" />
          <Text style={adminRepliesStyles.emptyStateTitle}>No replies yet</Text>
          <Text style={adminRepliesStyles.emptyStateText}>
            When admins respond to your feedback, their replies will appear here and you'll get a notification
          </Text>
          
          {/* ✅ NEW: Test button for development */}
          {__DEV__ && (
            <TouchableOpacity 
              onPress={handleTestNotification}
              style={{
                marginTop: 16,
                backgroundColor: '#B22020',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white', fontSize: 12 }}>
                🧪 Test Notification
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={adminRepliesStyles.container}>

      <ScrollView 
        style={adminRepliesStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {feedbackWithReplies.map((item, index) => (
          <View key={item.id || index} style={adminRepliesStyles.replyCard}>
            {/* Original Feedback Header */}
            <View style={adminRepliesStyles.originalFeedbackHeader}>
              <View style={adminRepliesStyles.feedbackTypeContainer}>
                <Ionicons 
                  name={getTypeIcon(item.type) as any} 
                  size={16} 
                  color="#6B7280" 
                />
                <Text style={adminRepliesStyles.feedbackType}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Feedback
                </Text>
              </View>
              
              <View style={[
                adminRepliesStyles.statusBadge,
                { backgroundColor: getStatusColor(item.status || 'pending') }
              ]}>
                <Text style={adminRepliesStyles.statusText}>
                  {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
                </Text>
              </View>
            </View>

            {/* Original Message Preview */}
            <View style={adminRepliesStyles.originalMessageContainer}>
              <Text style={adminRepliesStyles.originalMessageLabel}>Your feedback:</Text>
              <Text 
                style={adminRepliesStyles.originalMessage}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.message}
              </Text>
            </View>

            {/* Admin Reply */}
            <View style={adminRepliesStyles.adminReplyContainer}>
              <View style={adminRepliesStyles.adminReplyHeader}>
                <Ionicons name="person-circle-outline" size={20} color="#B22020" />
                <Text style={adminRepliesStyles.adminReplyLabel}>Admin Response</Text>
                {item.responded_at && (
                  <Text style={adminRepliesStyles.replyTime}>
                    {formatTimeAgo(item.responded_at)}
                  </Text>
                )}
              </View>
              
              <Text style={adminRepliesStyles.adminReplyText}>
                {item.admin_response}
              </Text>

              {/* ✅ NEW: Notification indicator */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#f0f0f0',
              }}>
                <Ionicons name="notifications-outline" size={14} color="#B22020" />
                <Text style={{
                  fontSize: 11,
                  color: '#666',
                  marginLeft: 4,
                  fontStyle: 'italic',
                }}>
                  You were notified about this reply
                </Text>
              </View>
            </View>

            {/* Show rating if it exists */}
            {item.rating && item.type === 'general' && (
              <View style={adminRepliesStyles.ratingContainer}>
                <Text style={adminRepliesStyles.ratingLabel}>Your rating: </Text>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= item.rating! ? 'star' : 'star-outline'}
                    size={14}
                    color={star <= item.rating! ? '#FFD700' : '#D1D5DB'}
                    style={adminRepliesStyles.ratingStar}
                  />
                ))}
                <Text style={adminRepliesStyles.ratingValue}>({item.rating}/5)</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default AdminRepliesSection;