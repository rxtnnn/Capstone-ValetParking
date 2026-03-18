import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RfidAdminService } from '../../services/RfidAdminService';
import { RfidDashboardStats, getReaderStatusColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';
import apiClient from '../../config/api';

type RootStackParamList = {
  AdminDashboard: undefined;
  RfidTagList: undefined;
  RfidTagForm: { tagId?: number };
  RfidReaderStatus: undefined;
  Settings: undefined;
  Profile: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'AdminDashboard'>;

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<RfidDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Verify Vehicle modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMode, setVerifyMode] = useState<'rfid' | 'plate'>('rfid');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  type VerifyResult = { found: boolean; valid?: boolean; status?: string; message: string; user_name?: string; user_role?: string; vehicle_plate?: string; vehicle_make?: string; vehicle_model?: string; uid?: string; expiry_date?: string };
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const handleVerify = async () => {
    const value = verifyInput.trim();
    if (!value) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await apiClient.post('/public/verify-vehicle', { mode: verifyMode, value });
      setVerifyResult(res.data);
    } catch {
      setVerifyResult({ found: false, message: 'Verification failed. Check connection.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const dashboardStats = await RfidAdminService.getDashboardStats();
      setStats(dashboardStats);
    } catch (error) {
      console.log('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: string;
    iconFamily?: 'ionicons' | 'material';
    color: string;
    onPress?: () => void;
  }> = ({ title, value, icon, iconFamily = 'ionicons', color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { width: (width - 48) / 2 }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        {iconFamily === 'ionicons' ? (
          <Ionicons name={icon as any} size={24} color={color} />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color="#999" style={styles.statArrow} />
      )}
    </TouchableOpacity>
  );

  const QuickActionButton: React.FC<{
    title: string;
    icon: string;
    color: string;
    onPress: () => void;
  }> = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={22} color="#FFF" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.secondary, COLORS.primary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>RFID Management System</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={36} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* RFID Tags Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RFID Tags Overview</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RfidTagList')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Tags"
              value={stats?.total_tags || 0}
              icon="card"
              iconFamily="material"
              color="#2196F3"
              onPress={() => navigation.navigate('RfidTagList')}
            />
            <StatCard
              title="Active"
              value={stats?.active_tags || 0}
              icon="checkmark-circle"
              color="#48D666"
              onPress={() => navigation.navigate('RfidTagList')}
            />
            <StatCard
              title="Expired"
              value={stats?.expired_tags || 0}
              icon="time"
              color="#FF6B6B"
              onPress={() => navigation.navigate('RfidTagList')}
            />
            <StatCard
              title="Expiring Soon"
              value={stats?.expiring_soon || 0}
              icon="warning"
              color="#FF9801"
              onPress={() => navigation.navigate('RfidTagList')}
            />
          </View>
        </View>

        {/* Reader Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reader Status</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RfidReaderStatus')}>
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.readerStatusCard}>
            <View style={styles.readerStatusRow}>
              <View style={styles.readerStatusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#48D666' }]} />
                <Text style={styles.readerStatusValue}>{stats?.readers_online || 0}</Text>
                <Text style={styles.readerStatusLabel}>Online</Text>
              </View>
              <View style={styles.readerStatusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#9E9E9E' }]} />
                <Text style={styles.readerStatusValue}>{stats?.readers_offline || 0}</Text>
                <Text style={styles.readerStatusLabel}>Offline</Text>
              </View>
              <View style={styles.readerStatusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#FF6B6B' }]} />
                <Text style={styles.readerStatusValue}>{stats?.readers_error || 0}</Text>
                <Text style={styles.readerStatusLabel}>Error</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Today's Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={styles.activityItem}>
                <Ionicons name="enter-outline" size={24} color="#48D666" />
                <Text style={styles.activityValue}>{stats?.today_entries || 0}</Text>
                <Text style={styles.activityLabel}>Entries</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Ionicons name="exit-outline" size={24} color="#2196F3" />
                <Text style={styles.activityValue}>{stats?.today_exits || 0}</Text>
                <Text style={styles.activityLabel}>Exits</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Ionicons name="close-circle-outline" size={24} color="#FF6B6B" />
                <Text style={styles.activityValue}>{stats?.today_invalid_scans || 0}</Text>
                <Text style={styles.activityLabel}>Invalid</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Ionicons name="car" size={24} color="#FF9801" />
                <Text style={styles.activityValue}>{stats?.current_parked || 0}</Text>
                <Text style={styles.activityLabel}>Parked</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              title="Add New Tag"
              icon="add-circle"
              color={COLORS.primary}
              onPress={() => navigation.navigate('RfidTagForm', {})}
            />
            <QuickActionButton
              title="View All Tags"
              icon="list"
              color="#2196F3"
              onPress={() => navigation.navigate('RfidTagList')}
            />
            <QuickActionButton
              title="Reader Status"
              icon="hardware-chip-outline"
              color="#48D666"
              onPress={() => navigation.navigate('RfidReaderStatus')}
            />
            <QuickActionButton
              title="Settings"
              icon="settings"
              color="#9E9E9E"
              onPress={() => navigation.navigate('Settings')}
            />
            <QuickActionButton
              title="Verify Vehicle"
              icon="search"
              color="#9C27B0"
              onPress={() => {
                setVerifyMode('rfid');
                setVerifyInput('');
                setVerifyResult(null);
                setShowVerifyModal(true);
              }}
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Verify Vehicle Modal */}
      <Modal
        visible={showVerifyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerifyModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowVerifyModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, overflow: 'hidden' }}>

                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10 }}>
                  <Ionicons name="search" size={22} color="#333" />
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#333' }}>Verify Vehicle</Text>
                  <TouchableOpacity onPress={() => setShowVerifyModal(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={{ padding: 16 }}>
                  {/* Tab switcher */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 16, padding: 3 }}>
                    {(['rfid', 'plate'] as const).map(mode => (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => { setVerifyMode(mode); setVerifyInput(''); setVerifyResult(null); }}
                        style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                          paddingVertical: 9, borderRadius: 6,
                          backgroundColor: verifyMode === mode ? '#333' : 'transparent',
                        }}
                      >
                        <Ionicons
                          name={mode === 'rfid' ? 'card-outline' : 'person-outline'}
                          size={15}
                          color={verifyMode === mode ? '#fff' : '#888'}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: verifyMode === mode ? '#fff' : '#888' }}>
                          {mode === 'rfid' ? 'RFID' : 'Guest'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Input */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6 }}>
                    {verifyMode === 'rfid' ? 'RFID Tag' : 'Plate Number'}
                  </Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333', marginBottom: 12 }}
                    placeholder={verifyMode === 'rfid' ? 'Enter RFID tag to verify...' : 'Enter plate number'}
                    placeholderTextColor="#aaa"
                    value={verifyInput}
                    onChangeText={t => { setVerifyInput(t); setVerifyResult(null); }}
                    autoCapitalize="characters"
                    returnKeyType="search"
                    onSubmitEditing={handleVerify}
                  />

                  {/* Result */}
                  {verifyResult && (
                    <View style={{
                      borderRadius: 10, padding: 14, marginBottom: 12,
                      backgroundColor: verifyResult.found && verifyResult.valid ? '#e8f5e9' : verifyResult.found ? '#fff8e1' : '#ffebee',
                      borderWidth: 1,
                      borderColor: verifyResult.found && verifyResult.valid ? '#a5d6a7' : verifyResult.found ? '#ffe082' : '#ef9a9a',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Ionicons
                          name={verifyResult.found && verifyResult.valid ? 'checkmark-circle' : verifyResult.found ? 'warning' : 'close-circle'}
                          size={20}
                          color={verifyResult.found && verifyResult.valid ? '#388e3c' : verifyResult.found ? '#f57f17' : '#c62828'}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: verifyResult.found && verifyResult.valid ? '#388e3c' : verifyResult.found ? '#f57f17' : '#c62828', flex: 1 }}>
                          {verifyResult.message}
                        </Text>
                      </View>
                      {verifyResult.found && (
                        <>
                          {verifyResult.user_name && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Owner: {verifyResult.user_name} {verifyResult.user_role ? `(${verifyResult.user_role})` : ''}</Text>}
                          {verifyResult.vehicle_plate && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Plate: {verifyResult.vehicle_plate}</Text>}
                          {(verifyResult.vehicle_make || verifyResult.vehicle_model) && (
                            <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Vehicle: {[verifyResult.vehicle_make, verifyResult.vehicle_model].filter(Boolean).join(' ')}</Text>
                          )}
                          {verifyResult.uid && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>RFID UID: {verifyResult.uid}</Text>}
                          {verifyResult.expiry_date && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Expiry: {new Date(verifyResult.expiry_date).toLocaleDateString()}</Text>}
                        </>
                      )}
                    </View>
                  )}

                  {/* Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => setShowVerifyModal(false)}
                      style={{ flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: '#e0e0e0', alignItems: 'center' }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: '#444', fontWeight: '600', fontSize: 14 }}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleVerify}
                      disabled={verifyLoading || !verifyInput.trim()}
                      style={{ flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: verifyLoading || !verifyInput.trim() ? 0.6 : 1 }}
                      activeOpacity={0.8}
                    >
                      {verifyLoading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><Ionicons name="search" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Verify</Text></>}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  statArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  readerStatusCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  readerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  readerStatusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  readerStatusValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  readerStatusLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityItem: {
    alignItems: 'center',
    flex: 1,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  activityLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activityDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickAction: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  bottomPadding: {
    height: 100,
  },
});

export default AdminDashboard;
