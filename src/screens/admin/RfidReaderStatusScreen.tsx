import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RfidAdminService } from '../../services/RfidAdminService';
import { RfidReader, getReaderStatusColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';

type RootStackParamList = {
  AdminDashboard: undefined;
  RfidReaderStatus: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'RfidReaderStatus'>;

const RfidReaderStatusScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [readers, setReaders] = useState<RfidReader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restartingReader, setRestartingReader] = useState<string | null>(null);

  const loadReaders = async () => {
    try {
      const readerList = await RfidAdminService.getReaders();
      setReaders(readerList);
    } catch (error) {
      console.log('Error loading readers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReaders();

      // Auto-refresh every 10 seconds
      const interval = setInterval(loadReaders, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadReaders();
  };

  const handleRestartReader = (reader: RfidReader) => {
    Alert.alert(
      'Restart Reader',
      `Are you sure you want to restart "${reader.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: async () => {
            setRestartingReader(reader.id);
            try {
              const result = await RfidAdminService.restartReader(reader.id);
              if (result.success) {
                Alert.alert('Success', 'Reader restart initiated');
                loadReaders();
              } else {
                Alert.alert('Error', result.message || 'Failed to restart reader');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to restart reader');
            } finally {
              setRestartingReader(null);
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: RfidReader['status']) => {
    switch (status) {
      case 'online':
        return 'checkmark-circle';
      case 'offline':
        return 'remove-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getTimeSinceHeartbeat = (lastHeartbeat: string): string => {
    const now = new Date();
    const heartbeat = new Date(lastHeartbeat);
    const diffMs = now.getTime() - heartbeat.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const renderReaderItem = ({ item }: { item: RfidReader }) => (
    <View style={styles.readerCard}>
      <View style={styles.readerHeader}>
        <View style={styles.readerInfo}>
          <View style={styles.readerNameRow}>
            <MaterialCommunityIcons
              name={item.type === 'entry' ? 'location-enter' : 'location-exit'}
              size={24}
              color="#666"
            />
            <Text style={styles.readerName}>{item.name}</Text>
          </View>
          <Text style={styles.readerLocation}>{item.location}</Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: getReaderStatusColor(item.status) }]}>
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={16}
            color="#FFF"
          />
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.readerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.scan_count_today}</Text>
          <Text style={styles.statLabel}>Scans Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, item.error_count_today > 0 && styles.statValueError]}>
            {item.error_count_today}
          </Text>
          <Text style={styles.statLabel}>Errors</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{getTimeSinceHeartbeat(item.last_heartbeat)}</Text>
          <Text style={styles.statLabel}>Last Heartbeat</Text>
        </View>
      </View>

      <View style={styles.readerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="hardware-chip-outline" size={16} color="#666" />
          <Text style={styles.detailText}>MAC: {item.mac_address}</Text>
        </View>
        {item.ip_address && (
          <View style={styles.detailRow}>
            <Ionicons name="globe-outline" size={16} color="#666" />
            <Text style={styles.detailText}>IP: {item.ip_address}</Text>
          </View>
        )}
        {item.firmware_version && (
          <View style={styles.detailRow}>
            <Ionicons name="code-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Firmware: v{item.firmware_version}</Text>
          </View>
        )}
      </View>

      {(item.status === 'offline' || item.status === 'error') && (
        <TouchableOpacity
          style={styles.restartButton}
          onPress={() => handleRestartReader(item)}
          disabled={restartingReader === item.id}
        >
          {restartingReader === item.id ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.restartButtonText}>Restart Reader</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSummary = () => {
    const online = readers.filter(r => r.status === 'online').length;
    const offline = readers.filter(r => r.status === 'offline').length;
    const error = readers.filter(r => r.status === 'error').length;

    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#48D666' }]} />
          <Text style={styles.summaryValue}>{online}</Text>
          <Text style={styles.summaryLabel}>Online</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#9E9E9E' }]} />
          <Text style={styles.summaryValue}>{offline}</Text>
          <Text style={styles.summaryLabel}>Offline</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.summaryValue}>{error}</Text>
          <Text style={styles.summaryLabel}>Error</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading readers...</Text>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reader Status</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={readers}
        keyExtractor={(item) => item.id}
        renderItem={renderReaderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderSummary}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="access-point-off" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Readers Found</Text>
            <Text style={styles.emptySubtitle}>
              No RFID readers have been configured yet
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      />
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
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  refreshButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  readerCard: {
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
  readerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  readerInfo: {
    flex: 1,
  },
  readerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  readerLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginLeft: 32,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  readerStats: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statValueError: {
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  readerDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  restartButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default RfidReaderStatusScreen;
