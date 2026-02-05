import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RfidAdminService } from '../../services/RfidAdminService';
import { RfidTag, RfidTagStatus, getStatusColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';

type RootStackParamList = {
  RfidTagList: undefined;
  RfidTagDetail: { tagId: number };
  RfidTagForm: { tagId?: number };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'RfidTagList'>;

const STATUS_FILTERS: { label: string; value: RfidTagStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Lost', value: 'lost' },
];

const RfidTagListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [tags, setTags] = useState<RfidTag[]>([]);
  const [filteredTags, setFilteredTags] = useState<RfidTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RfidTagStatus | 'all'>('all');

  const loadTags = async () => {
    try {
      const response = await RfidAdminService.getAllTags();
      if (response.success) {
        setTags(response.data);
      }
    } catch (error) {
      console.log('Error loading tags:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTags();
    }, [])
  );

  useEffect(() => {
    filterTags();
  }, [tags, searchQuery, activeFilter]);

  const filterTags = () => {
    let filtered = [...tags];

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(tag => tag.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tag =>
        tag.uid.toLowerCase().includes(query) ||
        tag.user_name?.toLowerCase().includes(query) ||
        tag.vehicle_plate?.toLowerCase().includes(query) ||
        tag.user_email?.toLowerCase().includes(query)
      );
    }

    setFilteredTags(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTags();
  };

  const handleDeactivate = (tag: RfidTag) => {
    Alert.alert(
      'Deactivate Tag',
      `Are you sure you want to deactivate tag ${tag.uid}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            const result = await RfidAdminService.deactivateTag(tag.id);
            if (result.success) {
              loadTags();
            } else {
              Alert.alert('Error', result.message || 'Failed to deactivate tag');
            }
          },
        },
      ]
    );
  };

  const renderTagItem = ({ item }: { item: RfidTag }) => (
    <TouchableOpacity
      style={styles.tagCard}
      onPress={() => navigation.navigate('RfidTagDetail', { tagId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.tagHeader}>
        <View style={styles.tagUidContainer}>
          <MaterialCommunityIcons name="card-account-details" size={20} color="#666" />
          <Text style={styles.tagUid}>{item.uid}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.tagInfo}>
        {item.user_name && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{item.user_name}</Text>
          </View>
        )}
        {item.vehicle_plate && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{item.vehicle_plate}</Text>
          </View>
        )}
        {item.expiry_date && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Expires: {new Date(item.expiry_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tagActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('RfidTagForm', { tagId: item.id })}
        >
          <Ionicons name="create-outline" size={18} color="#2196F3" />
          <Text style={[styles.actionText, { color: '#2196F3' }]}>Edit</Text>
        </TouchableOpacity>
        {item.status === 'active' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeactivate(item)}
          >
            <Ionicons name="ban-outline" size={18} color="#FF6B6B" />
            <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Deactivate</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="card-off-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Tags Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || activeFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Add your first RFID tag to get started'}
      </Text>
      {!searchQuery && activeFilter === 'all' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('RfidTagForm', {})}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyButtonText}>Add New Tag</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tags...</Text>
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
          <Text style={styles.headerTitle}>RFID Tags</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('RfidTagForm', {})}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by UID, name, or plate..."
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

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.value && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'} found
        </Text>
      </View>

      {/* Tags List */}
      <FlatList
        data={filteredTags}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTagItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
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
  addButton: {
    padding: 4,
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
  filterContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  tagCard: {
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
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagUidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagUid: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
  tagInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tagActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
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
    paddingHorizontal: 40,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  emptyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RfidTagListScreen;
