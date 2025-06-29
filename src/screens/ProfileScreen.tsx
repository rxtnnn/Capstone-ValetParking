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
    <View key={achievement.id} style={[
      styles.achievementItem,
      { opacity: achievement.unlocked ? 1 : 0.5 }
    ]}>
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
            Unlocked: {new Date(achievement.dateUnlocked).toLocaleDateString()}
          </Text>
        )}
      </View>
      {achievement.unlocked && (
        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Animatable.View animation="fadeInDown" delay={200}>
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <TouchableOpacity style={styles.avatar} onPress={handleEditProfile}>
                <MaterialIcons name="person" size={50} color="#B71C1C" />
                <View style={styles.editBadge}>
                  <MaterialIcons name="edit" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.userName}>VALET User</Text>
              <Text style={styles.userEmail}>user@example.com</Text>
              <View style={styles.membershipInfo}>
                <Chip style={styles.memberChip} textStyle={styles.memberChipText}>
                  Premium Member
                </Chip>
                <Text style={styles.userSince}>Member since January 2025</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Parking Statistics */}
      <Animatable.View animation="fadeInUp" delay={400}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="analytics" size={24} color="#B71C1C" />
              <Text style={styles.sectionTitle}>Your Parking Analytics</Text>
              <TouchableOpacity onPress={handleShareStats} style={styles.shareButton}>
                <MaterialIcons name="share" size={20} color="#B71C1C" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MaterialIcons name="local-parking" size={24} color="#4CAF50" />
                <Text style={styles.statNumber}>{userStats.timesParked}</Text>
                <Text style={styles.statLabel}>Times Parked</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="schedule" size={24} color="#2196F3" />
                <Text style={styles.statNumber}>{userStats.averageHours}</Text>
                <Text style={styles.statLabel}>Avg. Hours</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="favorite" size={24} color="#E91E63" />
                <Text style={styles.statNumber}>{userStats.favoriteFloor}</Text>
                <Text style={styles.statLabel}>Favorite Floor</Text>
              </View>
            </View>

            <View style={styles.additionalStats}>
              <View style={styles.additionalStatItem}>
                <MaterialIcons name="eco" size={20} color="#4CAF50" />
                <Text style={styles.additionalStatText}>
                  {userStats.co2Saved}kg CO2 saved by efficient parking
                </Text>
              </View>
              <View style={styles.additionalStatItem}>
                <MaterialIcons name="access-time" size={20} color="#FF9800" />
                <Text style={styles.additionalStatText}>
                  {userStats.totalHours} total hours parked
                </Text>
              </View>
              <View style={styles.additionalStatItem}>
                <MaterialIcons name="account-balance-wallet" size={20} color="#9C27B0" />
                <Text style={styles.additionalStatText}>
                  ₱{userStats.moneySpent.toLocaleString()} total spent
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Achievements */}
      <Animatable.View animation="fadeInUp" delay={600}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="emoji-events" size={24} color="#B71C1C" />
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.achievementProgress}>
                <Text style={styles.achievementProgressText}>
                  {achievements.filter(a => a.unlocked).length}/{achievements.length}
                </Text>
              </View>
            </View>

            <View style={styles.achievementsList}>
              {achievements.map(renderAchievement)}
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Quick Actions */}
      <Animatable.View animation="fadeInUp" delay={800}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="speed" size={24} color="#B71C1C" />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={handleViewHistory}>
                <MaterialIcons name="history" size={24} color="#4CAF50" />
                <Text style={styles.quickActionText}>View History</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Settings')}>
                <MaterialIcons name="settings" size={24} color="#2196F3" />
                <Text style={styles.quickActionText}>Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Feedback')}>
                <MaterialIcons name="feedback" size={24} color="#FF9800" />
                <Text style={styles.quickActionText}>Feedback</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Account Management */}
      <Animatable.View animation="fadeInUp" delay={1000}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="account-circle" size={24} color="#B71C1C" />
              <Text style={styles.sectionTitle}>Account Management</Text>
            </View>
            
            <List.Item
              title="Edit Profile"
              description="Update your personal information and preferences"
              left={() => <MaterialIcons name="edit" size={24} color="#2196F3" />}
              onPress={handleEditProfile}
            />
            
            <Divider />
            
            <List.Item
              title="Parking Preferences"
              description="Set your default parking preferences"
              left={() => <MaterialIcons name="tune" size={24} color="#4CAF50" />}
              onPress={() => Alert.alert('Preferences', 'Set your preferred floor, notification timing, and parking duration preferences.')}
            />

            <Divider />
            
            <List.Item
              title="Privacy Settings"
              description="Manage your privacy and data settings"
              left={() => <MaterialIcons name="privacy-tip" size={24} color="#9C27B0" />}
              onPress={() => Alert.alert('Privacy Settings', 'Control what data is collected and how it\'s used to improve your parking experience.')}
            />

            <Divider />
            
            <List.Item
              title="Export Data"
              description="Download your parking data and statistics"
              left={() => <MaterialIcons name="download" size={24} color="#FF9800" />}
              onPress={() => Alert.alert('Export Data', 'Download your complete parking history and statistics as a CSV file.')}
            />

            <Divider />
            
            <List.Item
              title="Delete Account"
              description="Permanently delete your account and data"
              left={() => <MaterialIcons name="delete-forever" size={24} color="#F44336" />}
              onPress={() => Alert.alert(
                'Delete Account',
                'This action cannot be undone. All your data will be permanently deleted.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive' },
                ]
              )}
            />
          </Card.Content>
        </Card>
      </Animatable.View>

      {/* Sign Out Button */}
      <Animatable.View animation="fadeInUp" delay={1200}>
        <Button
          mode="outlined"
          onPress={handleSignOut}
          loading={loading}
          style={styles.signOutButton}
          icon={() => <MaterialIcons name="logout" size={20} color="#F44336" />}
          textColor="#F44336"
        >
          {loading ? 'Signing Out...' : 'Sign Out'}
        </Button>
      </Animatable.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileCard: {
    margin: 20,
    elevation: 6,
    backgroundColor: '#FFEBEE',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#B71C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  membershipInfo: {
    alignItems: 'center',
  },
  memberChip: {
    backgroundColor: '#B71C1C',
    marginBottom: 8,
  },
  memberChipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  userSince: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  card: {
    margin: 20,
    marginBottom: 10,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  shareButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B71C1C',
    marginTop: 8,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  additionalStats: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 15,
    gap: 10,
  },
  additionalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalStatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  achievementProgress: {
    backgroundColor: '#B71C1C',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  achievementProgressText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    padding: 15,
    flex: 1,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  signOutButton: {
    margin: 20,
    marginTop: 10,
    marginBottom: 40,
    borderColor: '#F44336',
  },
});

export default ProfileScreen;