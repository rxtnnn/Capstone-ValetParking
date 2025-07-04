import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card, List, Button, Divider, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

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

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

interface UserStats {
  timesParked: number;
  averageHours: number;
  favoriteFloor: string;
  totalHours: number;
  co2Saved: number;
  moneySpent: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  dateUnlocked?: string;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [userStats, setUserStats] = useState<UserStats>({
    timesParked: 42,
    averageHours: 8.5,
    favoriteFloor: '2nd',
    totalHours: 357,
    co2Saved: 24.8,
    moneySpent: 2840,
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: '1',
      title: 'Early Adopter',
      description: 'One of the first users of VALET',
      icon: 'star',
      color: '#FFD700',
      unlocked: true,
      dateUnlocked: '2025-01-15',
    },
    {
      id: '2',
      title: 'Eco Parker',
      description: 'Saved 20kg+ CO2 by using smart parking',
      icon: 'eco',
      color: '#4CAF50',
      unlocked: true,
      dateUnlocked: '2025-01-20',
    },
    {
      id: '3',
      title: 'Regular',
      description: 'Parked 50+ times using VALET',
      icon: 'local-parking',
      color: '#2196F3',
      unlocked: false,
    },
    {
      id: '4',
      title: 'Time Saver',
      description: 'Saved 100+ hours finding parking',
      icon: 'schedule',
      color: '#FF9800',
      unlocked: false,
    },
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // TODO: Load user data from your API or AsyncStorage
      console.log('Loading user profile data...');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleEditProfile = () => {
    Alert.alert(
      'Edit Profile',
      'Profile editing feature coming soon! 🚧\n\nYou\'ll be able to:\n• Update personal information\n• Change profile picture\n• Set parking preferences',
      [{ text: 'OK' }]
    );
  };

  const handleViewHistory = () => {
    Alert.alert(
      'Parking History',
      '📊 History feature coming soon!\n\nYou\'ll be able to view:\n• Past parking sessions\n• Time spent per session\n• Favorite spots\n• Monthly statistics',
      [{ text: 'OK' }]
    );
  };

  const handleShareStats = () => {
    Alert.alert(
      'Share Your Stats',
      `🚗 My VALET Parking Stats:\n\n• Parked ${userStats.timesParked} times\n• Saved ${userStats.co2Saved}kg CO2\n• ${userStats.totalHours} hours total\n• Favorite: ${userStats.favoriteFloor} Floor\n\n#SmartParking #VALET`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => Alert.alert('Shared!', 'Stats shared successfully! 📱') },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your VALET account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              Alert.alert('Signed Out', 'You have been signed out successfully. See you next time! 👋');
            }, 1000);
          },
        },
      ]
    );
  };

  const renderAchievement = (achievement: Achievement) => (
    <TouchableOpacity 
      key={achievement.id} 
      style={[
        styles.achievementItem,
        { opacity: achievement.unlocked ? 1 : 0.6 }
      ]}
      activeOpacity={0.7}
    >
      <View style={[styles.achievementIcon, { backgroundColor: achievement.color }]}>
        <MaterialIcons
          name={achievement.icon as any}
          size={20}
          color="#FFFFFF"
        />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementTitle}>{achievement.title}</Text>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
        {achievement.unlocked && achievement.dateUnlocked && (
          <Text style={styles.achievementDate}>
            {new Date(achievement.dateUnlocked).toLocaleDateString()}
          </Text>
        )}
      </View>
      {achievement.unlocked && (
        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={40} color="#B22020" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>John Doe</Text>
                <Text style={styles.userEmail}>john.doe@example.com</Text>
                <View style={styles.membershipBadge}>
                  <Text style={styles.roleText}>STUDENT</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View>
          <View style={styles.quickStatsContainer}>
            <View style={styles.statCard}>
              <MaterialIcons name="local-parking" size={24} color="#B22020" />
              <Text style={styles.statNumber}>{userStats.timesParked}</Text>
              <Text style={styles.statLabel}>Times Parked</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="schedule" size={24} color="#B22020" />
              <Text style={styles.statNumber}>{userStats.averageHours}</Text>
              <Text style={styles.statLabel}>Avg Hours</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="eco" size={24} color="#B22020" />
              <Text style={styles.statNumber}>{userStats.co2Saved}</Text>
              <Text style={styles.statLabel}>CO2 Saved</Text>
            </View>
          </View>
        </View>

        {/* Menu Options */}
        <View>
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewHistory}>
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="history" size={24} color="#B22020" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Parking History</Text>
                <Text style={styles.menuSubtitle}>View your past parking sessions</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Feedback')}>
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="feedback" size={24} color="#B22020" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Feedback</Text>
                <Text style={styles.menuSubtitle}>Help us improve VALET</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleShareStats}>
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="share" size={24} color="#B22020" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Share Stats</Text>
                <Text style={styles.menuSubtitle}>Share your parking achievements</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

  
        {/* Account Management */}
        <View>
          <View style={styles.accountSection}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('Privacy Settings', 'Manage your privacy and data settings')}
            >
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="privacy-tip" size={24} color="#B22020" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Privacy Settings</Text>
                <Text style={styles.menuSubtitle}>Control your data and privacy</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('Export Data', 'Download your parking data')}
            >
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="download" size={24} color="#B22020" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Export Data</Text>
                <Text style={styles.menuSubtitle}>Download your parking statistics</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <View>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={loading}
          >
            <MaterialIcons name="logout" size={20} color="#B22020" />
            <Text style={styles.signOutText}>
              {loading ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#B22020',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4C0E0E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4C0E0E',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 68,
  },
  achievementsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4C0E0E',
  },
  achievementCounter: {
    backgroundColor: '#B22020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  achievementCounterText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  achievementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  accountSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B22020',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  signOutText: {
    fontSize: 16,
    color: '#B22020',
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});

export default ProfileScreen;