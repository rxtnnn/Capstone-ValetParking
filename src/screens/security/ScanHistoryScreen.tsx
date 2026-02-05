import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
    type: 'all' | 'entry' | 'exit';
  }>({ status: 'all', type: 'all' });
  const isMountedRef = useRef(true);

  const loadScans = async () => {
    const filterParams: ScanHistoryFilters = {};

    if (filters.status !== 'all') {
      filterParams.status = filters.status === 'valid' ? 'valid' : undefined;
    }
    if (filters.type !== 'all') {
      filterParams.scan_type = filters.type;
    }
    if (searchQuery.trim()) {
      filterParams.search = searchQuery.trim();
    }

    const response = await RfidSecurityService.getRecentScans(filterParams);
    if (isMountedRef.current && response.success) {
      let filteredData = response.data;

      // Additional client-side filtering for status
      if (filters.status === 'invalid') {
        filteredData = filteredData.filter(s => s.status !== 'valid');
      } else if (filters.status === 'valid') {
        filteredData = filteredData.filter(s => s.status === 'valid');
      }

      setScans(filteredData);
      setRefreshing(false);
    }
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
            name={item.scan_type === 'entry' ? 'enter-outline' : 'exit-outline'}
            size={18}
            color={item.scan_type === 'entry' ? '#48D666' : '#2196F3'}
          />
          <Text style={styles.scanTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
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
          <MaterialCommunityIcons name="card-account-details" size={16} color="#666" />
          <Text style={styles.scanUid}>{item.rfid_uid}</Text>
        </View>

        {item.user_name && (
          <View style={styles.scanRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.scanText}>{item.user_name}</Text>
          </View>
        )}

        <View style={styles.scanRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.scanText}>{item.reader_name}</Text>
        </View>
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
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterChips}>
            <FilterChip
              label="All"
              active={filters.status === 'all'}
              onPress={() => setFilters({ ...filters, status: 'all' })}
            />
            <FilterChip
              label="Valid"
              active={filters.status === 'valid'}
              onPress={() => setFilters({ ...filters, status: 'valid' })}
            />
            <FilterChip
              label="Invalid"
              active={filters.status === 'invalid'}
              onPress={() => setFilters({ ...filters, status: 'invalid' })}
            />
          </View>
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: '#666',
    width: 50,
  },
  filterChips: {
    flexDirection: 'row',
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    paddingLeft: 4,
  },
  scanCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scanTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanTime: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '500',
  },
  scanContent: {
    gap: 4,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanUid: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  scanText: {
    fontSize: 13,
    color: '#666',
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
    textAlign: 'center',
  },
});

export default ScanHistoryScreen;
