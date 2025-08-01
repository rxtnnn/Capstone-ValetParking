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
import { styles } from './styles/NotifOverlay.style';

interface NotificationOverlayProps {
  visible: boolean;
  onClose: () => void;
  userId?: number;
}

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

  const SWIPE_THRESHOLD = -80;
  const DELETE_THRESHOLD = -120;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return gestureState.dx < -10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderGrant: () => {
      translateX.stopAnimation();
      translateX.setOffset(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx <= 0) {
        translateX.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const swipeDistance = gestureState.dx;
      const swipeVelocity = gestureState.vx;

      if (swipeDistance <= DELETE_THRESHOLD || swipeVelocity < -0.5) {
        handleDelete();
      } else if (swipeDistance <= SWIPE_THRESHOLD) {
        setShowDeleteButton(true);
        Animated.spring(translateX, {
          toValue: SWIPE_THRESHOLD,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }).start();
      } else {
        resetSwipe();
      }
    },
    onPanResponderTerminate: () => {
      resetSwipe();
    },
  }), [translateX]);

  const resetSwipe = () => {
    setShowDeleteButton(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleDelete = () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    Animated.timing(translateX, {
      toValue: -Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onDelete(notification.id);
    });
  };

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
  const { checkForNewReplies, currentUserId, feedbackStats } = useFeedback();
  const [userInfo, setUserInfo] = useState<{ id: number | null; email?: string }>({ id: null });

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

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

      const unsubscribe = NotificationManager.subscribe(setNotifications);
      
      const effectiveUserId = userId || currentUserId || userInfo.id;
      if (effectiveUserId) {
        NotificationManager.checkForFeedbackReplies(effectiveUserId);
        checkForNewReplies();
      }

      return unsubscribe;
    } else {
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const effectiveUserId = userId || currentUserId || userInfo.id;
      
      if (effectiveUserId) {
        const [allFeedback, feedbackWithReplies] = await Promise.all([
          ApiService.getUserFeedback(effectiveUserId),
          ApiService.getUserFeedbackWithReplies(effectiveUserId)
        ]);
        
        if (allFeedback.length > 0) {
          await NotificationManager.processFeedbackReplies(allFeedback);
        }
        
        await checkForNewReplies();
      } else {
        console.warn('No user ID available for refresh');
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
    setRefreshing(false);
  };

  const handleRefreshIconPress = async () => {
    setIsRefreshIconLoading(true);
    
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
      const effectiveUserId = userId || currentUserId || userInfo.id;
      
      if (effectiveUserId) {
        await Promise.all([
          (async () => {
            try {
              const allFeedback = await ApiService.getUserFeedback(effectiveUserId);
              if (allFeedback.length > 0) {
                await NotificationManager.processFeedbackReplies(allFeedback);
              }
            } catch (error) {
              console.error('Error in comprehensive feedback refresh:', error);
            }
          })(),
          
          checkForNewReplies(),
          
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
      } else {
        console.warn('No user ID available for manual refresh');
      }
      
    } catch (error) {
      console.error('Error in manual refresh:', error);
    }
    
    setTimeout(() => {
      setIsRefreshIconLoading(false);
      spinAnimation.stop();
      spinAnim.stopAnimation();
    }, 1000);
  };

  const filteredNotifications = useMemo(() => {
    const effectiveUserId = userId || currentUserId || userInfo.id;
    
    let userNotifications = notifications;
    
    if (effectiveUserId) {
      userNotifications = notifications.filter(n => {
        const notifUserId = getNotificationUserId(n);
        return !notifUserId || notifUserId === effectiveUserId;
      });
    }
    
    switch (filter) {
      case 'unread':
        return userNotifications.filter(n => !n.isRead);
      case 'spots':
        return userNotifications.filter(
          n => n.type === 'spot_available' && n.data?.spotIds && n.data.spotIds.length > 0
        );
      case 'feedback':
        return userNotifications.filter(n => n.type === 'feedback_reply');
     default:
      return userNotifications.filter(
        n =>
          (n.type !== 'spot_available' || (n.data?.spotIds && n.data.spotIds.length > 0))
      );
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

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await NotificationManager.markAsRead(notification.id);
    }

    if (notification.type === 'feedback_reply') {
      const feedbackId = (notification.data as any)?.feedbackId;
      onClose();
      (navigation as any).navigate('Feedback', { showReplies: true, focusFeedbackId: feedbackId });
    } else if (notification.type === 'spot_available') {
      const floor = (notification.data as any)?.floor;
      onClose();
      (navigation as any).navigate('ParkingMap', floor ? { floor } : undefined);
    }
  };

  const handleNotificationDelete = async (notificationId: string) => {
    try {
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

  const getNotificationCount = (type?: string) => {
    const effectiveUserId = userId || currentUserId || userInfo.id;
    
    return notifications.filter(n => {
      const notifUserId = getNotificationUserId(n);
      const belongsToUser = !effectiveUserId || !notifUserId || notifUserId === effectiveUserId;
      
      if (!belongsToUser) return false;
      
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
                      label: 'Spots', 
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
                  </View>
                )}
              </ScrollView>

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

export default NotificationOverlay;