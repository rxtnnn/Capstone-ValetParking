import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IncidentService } from '../../services/IncidentService';
import {
  Incident,
  IncidentStatus,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
} from '../../types/incident';
import { COLORS } from '../../constants/AppConst';
import { styles, detailStyles } from '../styles/IncidentLogScreen.style';

type RootStackParamList = {
  SecurityDashboard: undefined;
  IncidentReport: undefined;
  IncidentLog: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'IncidentLog'>;

const STATUS_FILTERS: { label: string; value: IncidentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
];

const IncidentLogScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const isMountedRef = useRef(true);

  const loadIncidents = useCallback(async (status?: IncidentStatus | 'all') => {
    const filters = status && status !== 'all' ? { status } : undefined;
    const result = await IncidentService.list(filters);
    if (isMountedRef.current) {
      setIncidents(result.data ?? []);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      setLoading(true);
      loadIncidents(statusFilter);
      return () => {
        isMountedRef.current = false;
      };
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadIncidents(statusFilter);
  };

  const onFilterChange = (value: IncidentStatus | 'all') => {
    setStatusFilter(value);
    setLoading(true);
    loadIncidents(value);
  };

  const openDetail = (incident: Incident) => {
    setSelectedIncident(incident);
    setDetailVisible(true);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: Incident }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: INCIDENT_STATUS_COLORS[item.status] + '22' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: INCIDENT_STATUS_COLORS[item.status] },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: INCIDENT_STATUS_COLORS[item.status] },
              ]}
            >
              {INCIDENT_STATUS_LABELS[item.status]}
            </Text>
          </View>
          <Text style={styles.cardCategory}>
            {INCIDENT_CATEGORY_LABELS[item.category]}
          </Text>
        </View>
        <Text style={styles.cardId}>#{item.id}</Text>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color="#888" />
          <Text style={styles.metaText}>
            {item.floor_level}
            {item.space_code ? ` · ${item.space_code}` : ''}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color="#888" />
          <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      {item.notes && (
        <Text style={styles.cardNotes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetail}>View details</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

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
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Incident Log</Text>
            <Text style={styles.headerSubtitle}>Guard's logbook</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('IncidentReport')}
          >
            <Ionicons name="add" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Status filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterChip,
                statusFilter === f.value && styles.filterChipActive,
              ]}
              onPress={() => onFilterChange(f.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === f.value && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading incidents...</Text>
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>No incidents found</Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter !== 'all'
                  ? 'Try a different filter or file a new report.'
                  : 'No incident reports have been filed yet.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            {selectedIncident && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Sheet header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>
                    Incident #{selectedIncident.id}
                  </Text>
                  <TouchableOpacity onPress={() => setDetailVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* Status */}
                <View
                  style={[
                    styles.detailStatusBadge,
                    {
                      backgroundColor:
                        INCIDENT_STATUS_COLORS[selectedIncident.status] + '22',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          INCIDENT_STATUS_COLORS[selectedIncident.status],
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.detailStatusText,
                      {
                        color: INCIDENT_STATUS_COLORS[selectedIncident.status],
                      },
                    ]}
                  >
                    {INCIDENT_STATUS_LABELS[selectedIncident.status]}
                  </Text>
                </View>

                {/* Fields */}
                <DetailRow
                  label="Category"
                  value={INCIDENT_CATEGORY_LABELS[selectedIncident.category]}
                />
                <DetailRow label="Floor Level" value={selectedIncident.floor_level} />
                <DetailRow
                  label="Space Code"
                  value={selectedIncident.space_code}
                />
                <DetailRow
                  label="Time of Incident"
                  value={formatDate(selectedIncident.incident_at)}
                />
                <DetailRow
                  label="Involved Party"
                  value={selectedIncident.involved_party}
                />
                <DetailRow label="Notes" value={selectedIncident.notes} multiline />
                <DetailRow
                  label="Action Taken"
                  value={selectedIncident.action_taken}
                  multiline
                />
                {selectedIncident.reported_by_name && (
                  <DetailRow
                    label="Reported By"
                    value={selectedIncident.reported_by_name}
                  />
                )}
                <DetailRow
                  label="Filed At"
                  value={formatDate(selectedIncident.created_at)}
                />

                <TouchableOpacity
                  style={styles.closeDetailBtn}
                  onPress={() => setDetailVisible(false)}
                >
                  <Text style={styles.closeDetailText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailRow: React.FC<{
  label: string;
  value?: string | null;
  multiline?: boolean;
}> = ({ label, value, multiline }) => {
  if (!value) return null;
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, multiline && detailStyles.multiline]}>
        {value}
      </Text>
    </View>
  );
};

export default IncidentLogScreen;
