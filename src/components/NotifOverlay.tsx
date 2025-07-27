// Updated NotificationOverlay.tsx - Fixed TypeScript types

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  RefreshControl,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNotification, getNotificationUserId } from '../types/NotifTypes'; // 🔥 UPDATED: Import helper function
import { NotificationManager } from '../services/NotifManager';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFeedback } from '../hooks/useFeedback';
import ApiService from '../services/ApiService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
interface NotificationOverlayProps {
  visible: boolean;
  onClose: () => void;
  userId?: number;
}

const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  visible,
  onClose,
  userId,
}) => {
  type FeedbackScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Feedback'>;
  const navigation = useNavigation<FeedbackScreenNavigationProp>();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshIconLoading, setIsRefreshIconLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'parking' | 'feedback'>('all');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const spinAnim = useState(new Animated.Value(0))[0];

  // Use feedback hook for API integration
  const { checkForNewReplies, currentUserId } = useFeedback();
  
  // State for user info display
  const [userInfo, setUserInfo] = useState<{ id: number | null; email?: string }>({ id: null });

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  // Get user info when overlay opens
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const info = await ApiService.getCurrentUserInfo();
        setUserInfo(info);
      } catch (error) {
        console.error('Error getting user info:', error);
      }
    };

    if (visible) {
      getUserInfo();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Subscribe to notifications
      const unsubscribe = NotificationManager.subscribe(setNotifications);
      
      // Check for new feedback replies with proper user ID
      const effectiveUserId = userId || currentUserId || userInfo.id;
      if (effectiveUserId) {
        console.log('🔔 Checking for feedback replies for user:', effectiveUserId);
        NotificationManager.checkForFeedbackReplies(effectiveUserId);
        checkForNewReplies();
      }

      return unsubscribe;
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, userId, currentUserId, userInfo.id, fadeAnim, scaleAnim, checkForNewReplies]);

  // Enhanced refresh with API integration
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const effectiveUserId = userId || currentUserId || userInfo.id;
      
      if (effectiveUserId) {
        console.log('🔄 Refreshing notifications for user:', effectiveUserId);
        
        // Get fresh feedback data from API
        const feedbackWithReplies = await ApiService.getUserFeedbackWithReplies(effectiveUserId);
        
        // Process the feedback for notifications
        if (feedbackWithReplies.length > 0) {
          await NotificationManager.processFeedbackReplies(feedbackWithReplies);
        }
        
        // Also check using the hook
        await checkForNewReplies();
        
        console.log(`✅ Found ${feedbackWithReplies.length} feedback items with replies`);
      } else {
        console.warn('⚠️ No user ID available for refresh');
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
    setRefreshing(false);
  };

  // Enhanced refresh icon with API calls
  const handleRefreshIconPress = async () => {
    setIsRefreshIconLoading(true);
    
    // Start spinning animation
    spinAnim.setValue(0);
    const spinAnimation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    
    try {
      console.log('🔄 Manual refresh triggered...');
      
      const effectiveUserId = userId || currentUserId || userInfo.id;
      
      if (effectiveUserId) {
        // Comprehensive refresh with multiple API calls
        await Promise.all([
          // Check for new feedback replies via API
          (async () => {
            try {
              const feedbackWithReplies = await ApiService.getUserFeedbackWithReplies(effectiveUserId);
              if (feedbackWithReplies.length > 0) {
                await NotificationManager.processFeedbackReplies(feedbackWithReplies);
              }
            } catch (error) {
              console.error('Error fetching feedback replies:', error);
            }
          })(),
          
          // Check via hook
          checkForNewReplies(),
          
          // Force parking service update if available
          (async () => {
            try {
              if (typeof window !== 'undefined' && (window as any).RealTimeParkingService) {
                await (window as any).RealTimeParkingService.forceUpdate();
              }
            } catch (error) {
              console.error('Error updating parking service:', error);
            }
          })(),
        ]);
        
        console.log('✅ Manual refresh completed for user:', effectiveUserId);
      } else {
        console.warn('⚠️ No user ID available for manual refresh');
      }
      
    } catch (error) {
      console.error('❌ Error in manual refresh:', error);
    }
    
    // Keep loading state for at least 1 second for visual feedback
    setTimeout(() => {
      setIsRefreshIconLoading(false);
      spinAnimation.stop();
      spinAnim.stopAnimation();
    }, 1000);
  };

  // 🔥 UPDATED: Enhanced filtering with proper type checking
  const filteredNotifications = useMemo(() => {
    const effectiveUserId = userId || currentUserId || userInfo.id;
    
    let userNotifications = notifications;
    
    // Filter by user ID if available
    if (effectiveUserId) {
      userNotifications = notifications.filter(n => {
        const notifUserId = getNotificationUserId(n); // 🔥 FIXED: Use helper function
        return !notifUserId || notifUserId === effectiveUserId;
      });
    }
    
    // Apply type filter
    switch (filter) {
      case 'unread':
        return userNotifications.filter(n => !n.isRead);
      case 'parking':
        return userNotifications.filter(n => 
          n.type === 'spot_available' || 
          n.type === 'floor_update'
        );
      case 'feedback':
        return userNotifications.filter(n => n.type === 'feedback_reply');
      default:
        return userNotifications;
    }
  }, [notifications, filter, userId, currentUserId, userInfo.id]);

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'spot_available':
        return <Ionicons name="car" size={20} color="#48D666" />;
      case 'floor_update':
        return <Ionicons name="layers" size={20} color="#2196F3" />;
      case 'feedback_reply':
        return <Ionicons name="chatbubble" size={20} color="#B22020" />;
      default:
        return <Ionicons name="notifications" size={20} color="#666" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await NotificationManager.markAsRead(notification.id);
    }

    if (notification.type === 'feedback_reply') {
      onClose(); // close overlay
      navigation.navigate('Feedback', { showReplies: true }); // ✅ navigate to AdminReplies screen, type assertion to fix TS error
    }
  };

  const handleMarkAllRead = () => {
    NotificationManager.markAllAsRead();
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderNotificationItem = (notification: AppNotification) => {
    const notificationData = notification.data as any; // Type assertion for mixed data types

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          !notification.isRead && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.8}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <View style={styles.iconContainer}>
              {getNotificationIcon(notification.type)}
            </View>
            <View style={styles.notificationTextContainer}>
              <Text style={[
                styles.notificationTitle,
                !notification.isRead && styles.unreadText
              ]}>
                {notification.title}
              </Text>
              <Text style={styles.notificationTime}>
                {formatTime(notification.timestamp)}
              </Text>
            </View>
          </View>
          
          <Text style={[
            styles.notificationMessage,
            !notification.isRead && styles.unreadText
          ]}>
            {notification.message}
          </Text>
          
          {/* Show feedback ID for feedback replies (debug mode) */}
          {__DEV__ && notification.type === 'feedback_reply' && notificationData?.feedbackId && (
            <Text style={styles.debugText}>
              Feedback ID: {notificationData.feedbackId}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 🔥 UPDTED: Helper function for counting user-specific notifications
  const getNotificationCount = (type?: string) => {
    const effectiveUserId = userId || currentUserId || userInfo.id;
    
    return notifications.filter(n => {
      // Filter by user ID
      const notifUserId = getNotificationUserId(n);
      const belongsToUser = !effectiveUserId || !notifUserId || notifUserId === effectiveUserId;
      
      if (!belongsToUser) return false;
      
      // Filter by type
      switch (type) {
        case 'unread':
          return !n.isRead;
        case 'parking':
          return n.type === 'spot_available' || n.type === 'floor_update';
        case 'feedback':
          return n.type === 'feedback_reply';
        default:
          return true;
      }
    }).length;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View style={[
              styles.container,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }
            ]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>Notifications</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleRefreshIconPress} 
                  style={[styles.refreshButton, isRefreshIconLoading && styles.refreshButtonLoading]}
                  disabled={isRefreshIconLoading}
                >
                  <Animated.View
                    style={[
                      isRefreshIconLoading && { transform: [{ rotate: spin }] }
                    ]}
                  >
                    <Ionicons 
                      name="refresh" 
                      size={20} 
                      color={isRefreshIconLoading ? "#B22020" : "#666"} 
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* 🔥 UPDATED: Filter tabs with proper counts */}
              <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { 
                      key: 'all', 
                      label: 'All', 
                      count: getNotificationCount() 
                    },
                    { 
                      key: 'unread', 
                      label: 'Unread', 
                      count: getNotificationCount('unread')
                    },
                    { 
                      key: 'parking', 
                      label: 'Parking', 
                      count: getNotificationCount('parking')
                    },
                    { 
                      key: 'feedback', 
                      label: 'Feedback', 
                      count: getNotificationCount('feedback')
                    },
                  ].map(tab => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.filterTab,
                        filter === tab.key && styles.activeFilterTab
                      ]}
                      onPress={() => setFilter(tab.key as any)}
                    >
                      <Text style={[
                        styles.filterTabText,
                        filter === tab.key && styles.activeFilterTabText
                      ]}>
                        {tab.label} ({tab.count})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Notifications List */}
              <ScrollView
                style={styles.notificationsList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#B22020']}
                    tintColor="#B22020"
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map(renderNotificationItem)
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="notifications-off" size={32} color="#ccc" />
                    <Text style={styles.emptyStateText}>
                      {filter === 'all' 
                        ? 'No notifications yet' 
                        : `No ${filter} notifications`}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Mark all as read button */}
              {getNotificationCount('unread') > 0 && (
                <TouchableOpacity
                  style={styles.markAllReadButton}
                  onPress={handleMarkAllRead}
                >
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Enhanced styles with debug elements
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '90%',
    minHeight: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  // Debug text styles
  userDebugText: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
  },
  debugText: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
  },
  refreshButtonLoading: {
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: '#B22020',
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#666',
  },
  activeFilterTabText: {
    color: 'white',
  },
  notificationsList: {
    flex: 1,
    maxHeight: 300,
  },
  notificationItem: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  unreadNotification: {
    backgroundColor: '#fafafa',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#999',
  },
  notificationMessage: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    lineHeight: 16,
    marginLeft: 32,
  },
  unreadText: {
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  // Empty state subtext for debugging
  emptyStateSubtext: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  markAllReadButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  markAllReadText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    textDecorationLine: 'underline',
  },
});

export default NotificationOverlay;