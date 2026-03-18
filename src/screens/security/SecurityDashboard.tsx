import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { RfidSecurityService } from '../../services/RfidSecurityService';
import { SecurityDashboardStats, RfidScanEvent, getStatusColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';
import apiClient from '../../config/api';

type RootStackParamList = {
  SecurityDashboard: undefined;
  ScanMonitor: undefined;
  AlertsScreen: undefined;
  GuestManagement: undefined;
  ScanHistory: undefined;
  Profile: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'SecurityDashboard'>;

const SecurityDashboard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<SecurityDashboardStats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);

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

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;

      const unsubscribeStats = RfidSecurityService.onStatsUpdate((newStats) => {
        if (isMountedRef.current) {
          setStats(newStats);
          setLoading(false);
          setRefreshing(false);
        }
      });

      const unsubscribeConnection = RfidSecurityService.onConnectionStatus((status) => {
        if (isMountedRef.current) {
          setConnectionStatus(status);
        }
      });

      return () => {
        isMountedRef.current = false;
        unsubscribeStats();
        unsubscribeConnection();
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const newStats = await RfidSecurityService.getDashboardStats();
    if (isMountedRef.current) {
      setStats(newStats);
      setRefreshing(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: string;
    color: string;
    badge?: number;
    onPress?: () => void;
  }> = ({ title, value, icon, color, badge, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { width: (width - 48) / 2 }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color="#999" style={styles.statArrow} />
      )}
    </TouchableOpacity>
  );

  const LastScanCard: React.FC<{ scan: RfidScanEvent }> = ({ scan }) => (
    <View style={styles.lastScanCard}>
      <View style={styles.lastScanHeader}>
        <Text style={styles.lastScanTitle}>Latest Scan</Text>
        <View style={[styles.scanStatusBadge, { backgroundColor: getStatusColor(scan.status) }]}>
          <Text style={styles.scanStatusText}>
            {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.lastScanContent}>
        <View style={styles.lastScanRow}>
          <MaterialCommunityIcons name="card-account-details" size={18} color="#666" />
          <Text style={styles.lastScanUid}>{scan.rfid_uid}</Text>
        </View>
        {scan.user_name && (
          <View style={styles.lastScanRow}>
            <Ionicons name="person-outline" size={18} color="#666" />
            <Text style={styles.lastScanText}>{scan.user_name}</Text>
          </View>
        )}
        <View style={styles.lastScanRow}>
          <Ionicons name="location-outline" size={18} color="#666" />
          <Text style={styles.lastScanText}>{scan.reader_name}</Text>
        </View>
        <View style={styles.lastScanRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.lastScanText}>
            {new Date(scan.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    </View>
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
            <Text style={styles.headerTitle}>Security Dashboard</Text>
            <View style={styles.connectionIndicator}>
              <View style={[
                styles.connectionDot,
                { backgroundColor: connectionStatus === 'connected' ? '#48D666' : connectionStatus === 'error' ? '#FF6B6B' : '#9E9E9E' }
              ]} />
              <Text style={styles.connectionText}>
                {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
              </Text>
            </View>
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
        {/* Today's Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Entries"
              value={stats?.today_entries || 0}
              icon="enter-outline"
              color="#48D666"
            />
            <StatCard
              title="Exits"
              value={stats?.today_exits || 0}
              icon="exit-outline"
              color="#2196F3"
            />
            <StatCard
              title="Active Alerts"
              value={stats?.active_alerts || 0}
              icon="alert-circle"
              color="#FF6B6B"
              badge={stats?.active_alerts}
              onPress={() => navigation.navigate('AlertsScreen')}
            />
            <StatCard
              title="Pending Guests"
              value={stats?.pending_guests || 0}
              icon="people"
              color="#FF9801"
              badge={stats?.pending_guests}
              onPress={() => navigation.navigate('GuestManagement')}
            />
          </View>
        </View>

        {/* Parking Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parking Status</Text>
          <View style={styles.parkingCard}>
            <View style={styles.parkingRow}>
              <View style={styles.parkingItem}>
                <Ionicons name="car" size={32} color={COLORS.primary} />
                <Text style={styles.parkingValue}>{stats?.current_parked || 0}</Text>
                <Text style={styles.parkingLabel}>Currently Parked</Text>
              </View>
              <View style={styles.parkingDivider} />
              <View style={styles.parkingItem}>
                <Ionicons name="close-circle-outline" size={32} color="#FF6B6B" />
                <Text style={styles.parkingValue}>{stats?.invalid_scans_today || 0}</Text>
                <Text style={styles.parkingLabel}>Invalid Scans</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Last Scan */}
        {stats?.last_scan && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ScanMonitor')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <LastScanCard scan={stats.last_scan} />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              title="Live Monitor"
              icon="radio"
              color={COLORS.primary}
              onPress={() => navigation.navigate('ScanMonitor')}
            />
            <QuickActionButton
              title="View Alerts"
              icon="alert-circle"
              color="#FF6B6B"
              onPress={() => navigation.navigate('AlertsScreen')}
            />
            <QuickActionButton
              title="Guest Requests"
              icon="people"
              color="#FF9801"
              onPress={() => navigation.navigate('GuestManagement')}
            />
            <QuickActionButton
              title="Scan History"
              icon="time"
              color="#2196F3"
              onPress={() => navigation.navigate('ScanHistory')}
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
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
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
    marginBottom: 12,
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
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
  parkingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  parkingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  parkingItem: {
    alignItems: 'center',
    flex: 1,
  },
  parkingDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0',
  },
  parkingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  parkingLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  lastScanCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lastScanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastScanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  scanStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scanStatusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
  lastScanContent: {
    gap: 8,
  },
  lastScanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastScanUid: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    fontFamily: 'monospace',
  },
  lastScanText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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

export default SecurityDashboard;
