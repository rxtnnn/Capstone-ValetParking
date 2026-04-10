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
import { SecurityDashboardStats, RfidScanEvent, GuestAccess, getStatusColor } from '../../types/rfid';
import { COLORS, API_ENDPOINTS } from '../../constants/AppConst';
import { useVerifyVehicle } from '../../hooks/useVerifyVehicle';
import apiClient from '../../config/api';

type RootStackParamList = {
  SecurityDashboard: undefined;
  ScanMonitor: undefined;
  AlertsScreen: undefined;
  GuestManagement: undefined;
  ScanHistory: undefined;
  IncidentReport: undefined;
  IncidentLog: undefined;
  Profile: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'SecurityDashboard'>;

const SecurityDashboard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<SecurityDashboardStats | null>(null);
  const [activeGuests, setActiveGuests] = useState<GuestAccess[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  const {
    showVerifyModal, setShowVerifyModal,
    verifyMode, setVerifyMode,
    verifyInput, setVerifyInput,
    verifyLoading,
    verifyResult, setVerifyResult,
    handleVerify,
  } = useVerifyVehicle();

  const loadActiveGuests = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.guestAccess, { params: { status: 'active' } });
      const list: any[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      if (isMountedRef.current) {
        setActiveGuests(list.map((g: any): GuestAccess => ({
          id: g.id,
          guest_id: g.guest_id ?? String(g.id),
          name: g.name ?? '',
          vehicle_plate: g.vehicle_plate ?? '',
          phone: g.phone ?? '',
          purpose: g.purpose ?? '',
          valid_from: g.valid_from ?? '',
          valid_until: g.valid_until ?? '',
          status: g.status ?? 'active',
          approved_by: g.approved_by ?? null,
          notes: g.notes ?? null,
          created_by: g.created_by ?? 0,
          created_by_name: g.created_by ?? undefined,
          created_at: g.created_at ?? '',
          updated_at: g.updated_at ?? g.created_at ?? '',
        })));
      }
    } catch {
      // silent fail — list stays empty
    }
  };

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadActiveGuests();

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
    loadActiveGuests();
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
                { backgroundColor: connectionStatus === 'connected' ? COLORS.green : connectionStatus === 'error' ? '#FF6B6B' : '#9E9E9E' }
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
              color={COLORS.green}
            />
            <StatCard
              title="Exits"
              value={stats?.today_exits || 0}
              icon="exit-outline"
              color={COLORS.blue}
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
              color={COLORS.limited}
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

        {/* Active Guests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Guests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('GuestManagement')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {activeGuests.length === 0 ? (
            <View style={styles.emptyGuests}>
              <Ionicons name="people-outline" size={32} color="#CCC" />
              <Text style={styles.emptyGuestsText}>No active guests</Text>
            </View>
          ) : (
            activeGuests.map((guest) => {
              const until = guest.valid_until ? new Date(guest.valid_until) : null;
              const minsLeft = until ? Math.max(0, Math.round((until.getTime() - Date.now()) / 60000)) : null;
              const timeLabel = minsLeft !== null
                ? minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left` : `${minsLeft}m left`
                : null;
              return (
                <View key={guest.id} style={styles.guestCard}>
                  <View style={styles.guestCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guestName}>{guest.name}</Text>
                      {guest.phone ? <Text style={styles.guestPhone}>{guest.phone}</Text> : null}
                    </View>
                    <View style={[styles.guestStatusBadge, { backgroundColor: COLORS.green + '22' }]}>
                      <Text style={[styles.guestStatusText, { color: COLORS.green }]}>Active</Text>
                    </View>
                  </View>
                  <View style={styles.guestRow}>
                    <Ionicons name="car-outline" size={14} color="#888" />
                    <Text style={styles.guestMeta}>{guest.vehicle_plate}</Text>
                    <Text style={styles.guestPassId}>{guest.guest_id}</Text>
                  </View>
                  {guest.purpose ? (
                    <View style={styles.guestRow}>
                      <Ionicons name="information-circle-outline" size={14} color="#888" />
                      <Text style={styles.guestMeta}>{guest.purpose}</Text>
                    </View>
                  ) : null}
                  {until ? (
                    <View style={styles.guestRow}>
                      <Ionicons name="time-outline" size={14} color="#888" />
                      <Text style={styles.guestMeta}>
                        Until {until.toLocaleDateString()} {until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {timeLabel ? `  ·  ${timeLabel}` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

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
              color={COLORS.limited}
              onPress={() => navigation.navigate('GuestManagement')}
            />
            <QuickActionButton
              title="Scan History"
              icon="time"
              color={COLORS.blue}
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
            <QuickActionButton
              title="File Incident"
              icon="warning"
              color="#E65100"
              onPress={() => navigation.navigate('IncidentReport')}
            />
            <QuickActionButton
              title="Incident Log"
              icon="document-text"
              color="#5C6BC0"
              onPress={() => navigation.navigate('IncidentLog')}
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
        <View style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setShowVerifyModal(false)}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, pointerEvents: 'box-none' }}
          >
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
                          {verifyResult.is_guest ? (
                            <>
                              {verifyResult.user_name && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Guest: {verifyResult.user_name}</Text>}
                              {verifyResult.vehicle_plate && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Plate: {verifyResult.vehicle_plate}</Text>}
                              {verifyResult.purpose && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Purpose: {verifyResult.purpose}</Text>}
                              {verifyResult.valid_from && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>From: {new Date(verifyResult.valid_from).toLocaleString()}</Text>}
                              {verifyResult.valid_until && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Until: {new Date(verifyResult.valid_until).toLocaleString()}</Text>}
                              {verifyResult.status && <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Status: {verifyResult.status}</Text>}
                            </>
                          ) : (
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
          </KeyboardAvoidingView>
        </View>
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
  emptyGuests: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  emptyGuestsText: {
    fontSize: 14,
    color: '#AAA',
  },
  guestCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    gap: 6,
  },
  guestCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  guestPhone: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  guestStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  guestStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestMeta: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  guestPassId: {
    fontSize: 11,
    color: '#AAA',
    fontWeight: '600',
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
