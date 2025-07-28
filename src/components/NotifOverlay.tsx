
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
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { AppNotification, getNotificationUserId } from '../types/NotifTypes';
import { NotificationManager } from '../services/NotifManager';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFeedback } from '../hooks/useFeedback';
import ApiService from '../services/ApiService';
import { useNavigation } from '@react-navigation/native';

interface NotificationOverlayProps {
  visible: boolean;
  onClose: () => void;
  userId?: number;
}

// 🔥 FIXED: Swipeable Notification Item Component
interface SwipeableNotificationItemProps {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
  onDelete: (notificationId: string) => void;
  getNotificationIcon: (type: AppNotification['type']) => React.ReactNode;
  formatTime: (timestamp: number) => string;
}

const SwipeableNotificationItem: React.FC<SwipeableNotificationItemProps> = ({
  notification,
  onPress,
  onDelete,
  getNotificationIcon,
  formatTime,
}) => {
  const [translateX] = useState(new Animated.Value(0));
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);

  const SWIPE_THRESHOLD = -80; // Minimum swipe distance to show delete
  const DELETE_THRESHOLD = -120; // Swipe distance to auto-delete

  // 🔥 FIXED: Create PanResponder for swipe handling
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Activate when swiping left with sufficient movement
      return gestureState.dx < -10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderGrant: () => {
      // Set initial value without offset to avoid accumulation
      translateX.stopAnimation();
      translateX.setOffset(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Only allow left swipes (negative values)
      if (gestureState.dx <= 0) {
        translateX.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const swipeDistance = gestureState.dx;
      const swipeVelocity = gestureState.vx;

      // Consider velocity for more responsive interaction
      if (swipeDistance <= DELETE_THRESHOLD || swipeVelocity < -0.5) {
        // Auto-delete if swiped far enough or fast enough
        handleDelete();
      } else if (swipeDistance <= SWIPE_THRESHOLD) {
        // Show delete button
        setShowDeleteButton(true);
        Animated.spring(translateX, {
          toValue: SWIPE_THRESHOLD,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }).start();
      } else {
        // Snap back to original position
        resetSwipe();
      }
    },
    onPanResponderTerminate: () => {
      resetSwipe();
    },
  }), [translateX]);

  // 🔥 FIXED: Reset swipe position
  const resetSwipe = () => {
    setShowDeleteButton(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  // 🔥 FIXED: Handle delete action
  const handleDelete = () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    // Animate item sliding out
    Animated.timing(translateX, {
      toValue: -Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onDelete(notification.id);
    });
  };

  // 🔥 FIXED: Handle notification press (prevent when swiped)
  const handleNotificationPress = () => {
    if (showDeleteButton) {
      resetSwipe();
    } else {
      onPress(notification);
    }
  };

  const notificationData = notification.data as any;
  const isFeedbackReply = notification.type === 'feedback_reply';
  const isSpotAvailable = notification.type === 'spot_available';

  return (
    <View style={styles.swipeContainer}>
      {/* 🔥 FIXED: Delete button background */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={20} color="white" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* 🔥 FIXED: Swipeable notification content */}
      <Animated.View
        style={[
          styles.swipeableContent,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !notification.isRead && styles.unreadNotification,
            isDeleting && styles.deletingNotification,
          ]}
          onPress={handleNotificationPress}
          activeOpacity={0.8}
          disabled={isDeleting}
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
              {!notification.isRead && (
                <View style={styles.unreadDot} />
              )}
              {/* 🔥 FIXED: Swipe indicator */}
              <View style={styles.swipeIndicator}>
                <Ionicons name="chevron-back" size={12} color="#ccc" />
              </View>
            </View>
            
            <Text style={[
              styles.notificationMessage,
              !notification.isRead && styles.unreadText
            ]}>
              {notification.message}
            </Text>

            {/* Enhanced details for feedback replies */}
            {isFeedbackReply && notificationData?.feedbackId && (
              <View style={styles.feedbackDetails}>
                <View style={styles.feedbackIdContainer}>
                  <Text style={styles.feedbackIdText}>
                    Feedback #{notificationData.feedbackId}
                  </Text>
                </View>
                {notificationData.feedbackPreview && (
                  <Text style={styles.feedbackPreview}>
                    Re: "{notificationData.feedbackPreview}"
                  </Text>
                )}
                <Text style={styles.actionHint}>
                  Tap to view reply in Feedback screen
                </Text>
              </View>
            )}

            {/* Enhanced details for parking notifications */}
            {isSpotAvailable && (
              <View style={styles.parkingDetails}>
                {notificationData?.floor && (
                  <Text style={styles.floorInfo}>
                    Floor {notificationData.floor}
                  </Text>
                )}
                {notificationData?.spotsAvailable && (
                  <Text style={styles.spotsInfo}>
                    {notificationData.spotsAvailable} spot{notificationData.spotsAvailable > 1 ? 's' : ''} available
                  </Text>
                )}
                <Text style={styles.actionHint}>
                  Tap to view parking map
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshIconLoading, setIsRefreshIconLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'spots' | 'feedback'>('all');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [spinAnim] = useState(new Animated.Value(0));

  const navigation = useNavigation();

  // Use feedback hook for API integration
  const { checkForNewReplies, currentUserId, feedbackStats } = useFeedback();
  
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
        console.log('🔔 NotificationOverlay: Checking for feedback replies for user:', effectiveUserId);
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

  // Enhanced refresh with comprehensive API integration
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const effectiveUserId = userId || currentUserId || userInfo.id;
      
      if (effectiveUserId) {
        console.log('🔄 NotificationOverlay: Comprehensive refresh for user:', effectiveUserId);
        
        // Get ALL feedback to catch new replies
        const [allFeedback, feedbackWithReplies] = await Promise.all([
          ApiService.getUserFeedback(effectiveUserId),
          ApiService.getUserFeedbackWithReplies(effectiveUserId)
        ]);
        
        console.log(`📊 Refresh results: ${allFeedback.length} total feedback, ${feedbackWithReplies.length} with replies`);
        
        // Process all feedback for potential new notifications
        if (allFeedback.length > 0) {
          await NotificationManager.processFeedbackReplies(allFeedback);
        }
        
        // Also check using the hook for additional safety
        await checkForNewReplies();
        
        console.log(`✅ Notification refresh completed`);
      } else {
        console.warn('⚠️ No user ID available for refresh');
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
    setRefreshing(false);
  };

  // Enhanced refresh icon with comprehensive refresh
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
      console.log('🔄 Manual notification refresh triggered...');
      
      const effectiveUserId = userId || currentUserId || userInfo.id;
      
      if (effectiveUserId) {
        // Comprehensive refresh with multiple API calls
        await Promise.all([
          // Get fresh feedback data and process for notifications
          (async () => {
            try {
              const allFeedback = await ApiService.getUserFeedback(effectiveUserId);
              if (allFeedback.length > 0) {
                await NotificationManager.processFeedbackReplies(allFeedback);
                console.log(`📱 Processed ${allFeedback.length} feedback items for notifications`);
              }
            } catch (error) {
              console.error('Error in comprehensive feedback refresh:', error);
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
        
        console.log('✅ Comprehensive manual refresh completed for user:', effectiveUserId);
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

  // Enhanced filtering
  const filteredNotifications = useMemo(() => {
    const effectiveUserId = userId || currentUserId || userInfo.id;
    
    let userNotifications = notifications;
    
    // Filter by user ID if available
    if (effectiveUserId) {
      userNotifications = notifications.filter(n => {
        const notifUserId = getNotificationUserId(n);
        return !notifUserId || notifUserId === effectiveUserId;
      });
    }
    
    // Apply type filter
    switch (filter) {
      case 'unread':
        return userNotifications.filter(n => !n.isRead);
      case 'spots':
        return userNotifications.filter(n => n.type === 'spot_available');
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

  // Handle notification press with navigation
  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await NotificationManager.markAsRead(notification.id);
    }

    // Handle different notification types with proper navigation
    if (notification.type === 'feedback_reply') {
      const feedbackId = (notification.data as any)?.feedbackId;
      console.log(`📱 Feedback reply notification pressed - Feedback ID: ${feedbackId}`);
      
      onClose(); // Close overlay
      
      // Navigate to feedback screen and show replies
      (navigation as any).navigate('Feedback', { showReplies: true, focusFeedbackId: feedbackId });
    } else if (notification.type === 'spot_available') {
      const floor = (notification.data as any)?.floor;
      const spotsAvailable = (notification.data as any)?.spotsAvailable;
      console.log(`🚗 Parking spots notification pressed - Floor: ${floor}, Spots: ${spotsAvailable}`);
      
      onClose(); // Close overlay
      
      // Navigate to parking map (with floor info if available)
      (navigation as any).navigate('ParkingMap', floor ? { floor } : undefined);
    }
  };

  // 🔥 FIXED: Handle notification deletion
  const handleNotificationDelete = async (notificationId: string) => {
    try {
      console.log(`🗑️ Deleting notification: ${notificationId}`);
      await NotificationManager.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
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

  // Helper function for counting user-specific notifications
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
        case 'spots':
          return n.type === 'spot_available';
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
                  {/* 🔥 FIXED: Swipe hint */}
                  <Text style={styles.swipeHint}>
                    Swipe left to delete notifications
                  </Text>
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

              {/* Filter tabs */}
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
                      key: 'spots',
                      label: 'Parking Spots', 
                      count: getNotificationCount('spots')
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

              {/* 🔥 FIXED: Notifications List with swipe-to-delete */}
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
                  filteredNotifications.map(notification => (
                    <SwipeableNotificationItem
                      key={notification.id}
                      notification={notification}
                      onPress={handleNotificationPress}
                      onDelete={handleNotificationDelete}
                      getNotificationIcon={getNotificationIcon}
                      formatTime={formatTime}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="notifications-off" size={32} color="#ccc" />
                    <Text style={styles.emptyStateText}>
                      {filter === 'all' 
                        ? 'No notifications yet' 
                        : filter === 'spots'
                        ? 'No parking spot notifications'
                        : `No ${filter} notifications`}
                    </Text>
                    {filter === 'spots' && (
                      <Text style={styles.emptyStateSubtext}>
                        You'll be notified when new parking spots become available
                      </Text>
                    )}
                    {filter === 'feedback' && (
                      <Text style={styles.emptyStateSubtext}>
                        Submit feedback to receive admin replies here
                      </Text>
                    )}
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

// 🔥 FIXED: Complete styles with swipe-to-delete functionality
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
  // 🔥 FIXED: Swipe hint
  swipeHint: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#999',
    marginTop: 2,
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
  
  // 🔥 FIXED: Swipe container styles
  swipeContainer: {
    position: 'relative',
    backgroundColor: '#EF4444', // Red background for delete
    overflow: 'hidden',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
  },
  // 🔥 FIXED: Swipeable content
  swipeableContent: {
    backgroundColor: 'white',
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
    borderLeftWidth: 3,
    borderLeftColor: '#B22020',
  },
  // 🔥 FIXED: Deleting state
  deletingNotification: {
    opacity: 0.5,
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B22020',
    marginTop: 4,
    marginRight: 8,
  },
  // 🔥 FIXED: Swipe indicator
  swipeIndicator: {
    marginLeft: 8,
    opacity: 0.3,
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
  
  // Enhanced styles for feedback details
  feedbackDetails: {
    marginLeft: 32,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  feedbackIdContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  feedbackIdText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B22020',
  },
  feedbackPreview: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  actionHint: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#999',
    marginTop: 4,
  },
  
  // Enhanced styles for parking details
  parkingDetails: {
    marginLeft: 32,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  floorInfo: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#48D666',
    marginBottom: 2,
  },
  spotsInfo: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Mark all as read button
  markAllReadButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  markAllReadText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B22020',
  },
});

export default NotificationOverlay;