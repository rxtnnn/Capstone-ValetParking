import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Vibration,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RfidSecurityService } from '../../services/RfidSecurityService';
import { RfidScanEvent, getStatusColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';
import { styles } from '../styles/ScanMonitorScreen.style';

type RootStackParamList = {
  SecurityDashboard: undefined;
  ScanMonitor: undefined;
  ScanHistory: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ScanMonitor'>;

const ScanMonitorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [scans, setScans] = useState<RfidScanEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const isMountedRef = useRef(true);
  const lastScanCountRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;

      const unsubscribeScans = RfidSecurityService.onScanUpdate((newScans) => {
        if (isMountedRef.current) {
          // Check for new invalid scans
          if (newScans.length > lastScanCountRef.current) {
            const latestScan = newScans[0];
            if (latestScan && latestScan.status !== 'valid') {
              // Vibrate for invalid scans
              Vibration.vibrate(200);
              startPulseAnimation();
            }
          }
          lastScanCountRef.current = newScans.length;
          setScans(newScans);
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
        unsubscribeScans();
        unsubscribeConnection();
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const response = await RfidSecurityService.getRecentScans();
    if (isMountedRef.current && response.success) {
      setScans(response.data);
      setRefreshing(false);
    }
  };

  const getFilteredScans = (): RfidScanEvent[] => {
    switch (filter) {
      case 'valid':
        return scans.filter(s => s.status === 'valid');
      case 'invalid':
        return scans.filter(s => s.status !== 'valid');
      default:
        return scans;
    }
  };

  const getScanTypeIcon = (scanType: 'entry' | 'exit') => {
    return scanType === 'entry' ? 'enter-outline' : 'exit-outline';
  };

  const renderScanItem = ({ item, index }: { item: RfidScanEvent; index: number }) => {
    const isNew = index === 0;
    const AnimatedView = isNew ? Animated.View : View;
    const animStyle = isNew ? { transform: [{ scale: pulseAnim }] } : {};

    return (
      <AnimatedView style={[styles.scanCard, animStyle, isNew && styles.scanCardNew]}>
        <View style={styles.scanHeader}>
          <View style={styles.scanTypeContainer}>
            <Ionicons
              name={getScanTypeIcon(item.scan_type) as any}
              size={20}
              color={item.scan_type === 'entry' ? COLORS.green : COLORS.blue}
            />
            <Text style={styles.scanType}>
              {item.scan_type.charAt(0).toUpperCase() + item.scan_type.slice(1)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.scanContent}>
          <View style={styles.scanRow}>
            <MaterialCommunityIcons name="card-account-details" size={18} color="#666" />
            <Text style={styles.scanUid}>{item.rfid_uid}</Text>
          </View>

          {item.user_name && item.status === 'valid' && (
            <View style={styles.scanRow}>
              <Ionicons name="person-outline" size={18} color="#666" />
              <Text style={styles.scanText}>{item.user_name}</Text>
            </View>
          )}

          {item.vehicle_plate && item.status === 'valid' && (
            <View style={styles.scanRow}>
              <Ionicons name="car-outline" size={18} color="#666" />
              <Text style={styles.scanText}>{item.vehicle_plate}</Text>
            </View>
          )}

          <View style={styles.scanRow}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.scanText}>{item.reader_name}</Text>
          </View>

          {item.status !== 'valid' && (
            <View style={styles.messageContainer}>
              <Ionicons name="information-circle" size={16} color="#FF6B6B" />
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}
        </View>

        <View style={styles.scanFooter}>
          <Ionicons name="time-outline" size={14} color="#999" />
          <Text style={styles.timeText}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </AnimatedView>
    );
  };

  const FilterButton: React.FC<{
    label: string;
    value: 'all' | 'valid' | 'invalid';
    count: number;
  }> = ({ label, value, count }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
      <View style={[styles.filterBadge, filter === value && styles.filterBadgeActive]}>
        <Text style={[styles.filterBadgeText, filter === value && styles.filterBadgeTextActive]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filteredScans = getFilteredScans();

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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Live Monitor</Text>
            <View style={styles.connectionIndicator}>
              <View style={[
                styles.connectionDot,
                { backgroundColor: connectionStatus === 'connected' ? COLORS.green : connectionStatus === 'error' ? '#FF6B6B' : '#9E9E9E' }
              ]} />
              <Text style={styles.connectionText}>
                {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'error' ? 'Error' : 'Offline'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('ScanHistory')}
          >
            <Ionicons name="time-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton
          label="All"
          value="all"
          count={scans.length}
        />
        <FilterButton
          label="Valid"
          value="valid"
          count={scans.filter(s => s.status === 'valid').length}
        />
        <FilterButton
          label="Invalid"
          value="invalid"
          count={scans.filter(s => s.status !== 'valid').length}
        />
      </View>

      <FlatList
        data={filteredScans}
        keyExtractor={(item) => item.id}
        renderItem={renderScanItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="radar" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Scans Yet</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all'
                ? 'Waiting for RFID scans...'
                : `No ${filter} scans to display`}
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

export default ScanMonitorScreen;
