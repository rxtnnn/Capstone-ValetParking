import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RfidSecurityService } from '../../services/RfidSecurityService';
import { RfidScanEvent, getStatusColor, ScanHistoryFilters } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';
import { styles } from '../styles/ScanHistoryScreen.style';

type RootStackParamList = {
  SecurityDashboard: undefined;
  ScanHistory: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ScanHistory'>;

const ScanHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [scans, setScans] = useState<RfidScanEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    status: 'all' | 'valid' | 'invalid';
    type: 'all' | 'entry' | 'exit' | 'parked';
  }>({ status: 'all', type: 'all' });
  const isMountedRef = useRef(true);

  const loadScans = async () => {
    const filterParams: ScanHistoryFilters = {};
    if (filters.status !== 'all') {
      filterParams.status = filters.status === 'valid' ? 'valid' : undefined;
    }
    if (filters.type !== 'all' && filters.type !== 'parked') {
      filterParams.scan_type = filters.type;
    }
    if (searchQuery.trim()) {
      filterParams.search = searchQuery.trim();
    }

    const [scansResponse, parkedResponse] = await Promise.all([
      filters.type === 'parked' ? Promise.resolve({ success: true, data: [] as RfidScanEvent[] }) : RfidSecurityService.getRecentScans(filterParams),
      (filters.type === 'all' || filters.type === 'parked') ? RfidSecurityService.getParkedUsers() : Promise.resolve({ success: true, data: [] as RfidScanEvent[] }),
    ]);

    if (!isMountedRef.current) return;

    let filteredData = [...(scansResponse.data ?? []), ...(parkedResponse.data ?? [])].filter(s => s.status === 'valid' || (s as any).scan_type === 'parked');

    if (filters.status === 'valid') {
      filteredData = filteredData.filter(s => s.status === 'valid');
    }

    filteredData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setScans(filteredData);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadScans();

      return () => {
        isMountedRef.current = false;
      };
    }, [filters, searchQuery])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadScans();
  };

  const groupScansByDate = (scans: RfidScanEvent[]): Map<string, RfidScanEvent[]> => {
    const grouped = new Map<string, RfidScanEvent[]>();

    scans.forEach(scan => {
      const date = new Date(scan.timestamp).toLocaleDateString();
      const existing = grouped.get(date) || [];
      grouped.set(date, [...existing, scan]);
    });

    return grouped;
  };

  const renderScanItem = ({ item }: { item: RfidScanEvent }) => (
    <View style={styles.scanCard}>
      <View style={styles.scanHeader}>
        <View style={styles.scanTypeContainer}>
          <Ionicons
            name={(item as any).scan_type === 'parked' ? 'car-outline' : item.scan_type === 'entry' ? 'enter-outline' : 'exit-outline'}
            size={18}
            color={(item as any).scan_type === 'parked' ? COLORS.limited : item.scan_type === 'entry' ? COLORS.green : COLORS.blue}
          />
          <Text style={styles.scanTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {item.status === 'valid' && (
            <View style={[styles.statusBadge, {
              backgroundColor:
                (item as any).scan_type === 'parked' ? '#F5A623' :
                item.scan_type === 'entry' ? COLORS.green : '#FF6B6B',
            }]}>
              <Text style={styles.statusText}>
                {(item as any).scan_type === 'parked' ? 'Parked' : item.scan_type === 'entry' ? 'Entry' : 'Exit'}
              </Text>
            </View>
          )}
          {item.status !== 'valid' && (
            <View style={[styles.statusBadge, {
              backgroundColor: (item.status as any) === 'already_inside' ? '#F5A623' : '#FF6B6B',
            }]}>
              <Text style={styles.statusText}>
                {(item.status as any) === 'already_inside' ? 'Already Inside' : 'Not Registered'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.scanContent}>
        {item.user_name && (
          <View style={styles.scanRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.scanText}>{item.user_name}</Text>
          </View>
        )}
        {item.vehicle_plate && (
          <View style={styles.scanRow}>
            <Ionicons name="car-outline" size={16} color="#666" />
            <Text style={styles.scanText}>{item.vehicle_plate}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const FilterChip: React.FC<{
    label: string;
    active: boolean;
    onPress: () => void;
  }> = ({ label, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const groupedScans = groupScansByDate(scans);
  const dateGroups = Array.from(groupedScans.entries());

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
          <Text style={styles.headerTitle}>Scan History</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by UID or name..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Type:</Text>
          <View style={styles.filterChips}>
            <FilterChip
              label="All"
              active={filters.type === 'all'}
              onPress={() => setFilters({ ...filters, type: 'all' })}
            />
            <FilterChip
              label="Entry"
              active={filters.type === 'entry'}
              onPress={() => setFilters({ ...filters, type: 'entry' })}
            />
            <FilterChip
              label="Exit"
              active={filters.type === 'exit'}
              onPress={() => setFilters({ ...filters, type: 'exit' })}
            />
            <FilterChip
              label="Parked"
              active={filters.type === 'parked'}
              onPress={() => setFilters({ ...filters, type: 'parked' })}
            />
          </View>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {scans.length} {scans.length === 1 ? 'scan' : 'scans'} found
        </Text>
      </View>

      <FlatList
        data={dateGroups}
        keyExtractor={([date]) => date}
        renderItem={({ item: [date, dateScans] }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{date}</Text>
            {dateScans.map(scan => (
              <View key={scan.id}>
                {renderScanItem({ item: scan })}
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Scans Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filters.status !== 'all' || filters.type !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No scan history available'}
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

export default ScanHistoryScreen;
