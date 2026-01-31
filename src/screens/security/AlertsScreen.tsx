import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RfidSecurityService } from '../../services/RfidSecurityService';
import { RfidAlert, getStatusColor, getAlertSeverityColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';

type RootStackParamList = {
  SecurityDashboard: undefined;
  AlertsScreen: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'AlertsScreen'>;

const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [alerts, setAlerts] = useState<RfidAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [acknowledgeModal, setAcknowledgeModal] = useState<{
    visible: boolean;
    alert: RfidAlert | null;
  }>({ visible: false, alert: null });
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');
  const isMountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;

      const unsubscribeAlerts = RfidSecurityService.onAlertUpdate((newAlerts) => {
        if (isMountedRef.current) {
          setAlerts(newAlerts);
          setRefreshing(false);
        }
      });

      return () => {
        isMountedRef.current = false;
        unsubscribeAlerts();
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const alertList = await RfidSecurityService.getActiveAlerts();
    if (isMountedRef.current) {
      setAlerts(alertList);
      setRefreshing(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!acknowledgeModal.alert) return;

    const result = await RfidSecurityService.acknowledgeAlert(
      acknowledgeModal.alert.id,
      acknowledgeNotes || undefined
    );

    if (result.success) {
      setAcknowledgeModal({ visible: false, alert: null });
      setAcknowledgeNotes('');
    } else {
      Alert.alert('Error', result.message || 'Failed to acknowledge alert');
    }
  };

  const getAlertTypeLabel = (type: RfidAlert['alert_type']): string => {
    const labels: Record<RfidAlert['alert_type'], string> = {
      invalid_rfid: 'Invalid RFID',
      expired_rfid: 'Expired RFID',
      suspended_rfid: 'Suspended RFID',
      unknown_rfid: 'Unknown Card',
      suspicious_activity: 'Suspicious Activity',
    };
    return labels[type] || type;
  };

  const getAlertTypeIcon = (type: RfidAlert['alert_type']): string => {
    const icons: Record<RfidAlert['alert_type'], string> = {
      invalid_rfid: 'close-circle',
      expired_rfid: 'time',
      suspended_rfid: 'ban',
      unknown_rfid: 'help-circle',
      suspicious_activity: 'warning',
    };
    return icons[type] || 'alert-circle';
  };

  const filteredAlerts = showAcknowledged
    ? alerts
    : alerts.filter(a => !a.acknowledged);

  const renderAlertItem = ({ item }: { item: RfidAlert }) => (
    <View style={[styles.alertCard, item.acknowledged && styles.alertCardAcknowledged]}>
      <View style={styles.alertHeader}>
        <View style={styles.alertTypeContainer}>
          <View style={[styles.severityIndicator, { backgroundColor: getAlertSeverityColor(item.severity) }]}>
            <Ionicons
              name={getAlertTypeIcon(item.alert_type) as any}
              size={16}
              color="#FFF"
            />
          </View>
          <View>
            <Text style={styles.alertType}>{getAlertTypeLabel(item.alert_type)}</Text>
            <Text style={styles.alertSeverity}>
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} Priority
            </Text>
          </View>
        </View>
        {item.acknowledged ? (
          <View style={styles.acknowledgedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#48D666" />
            <Text style={styles.acknowledgedText}>Acknowledged</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.acknowledgeButton}
            onPress={() => setAcknowledgeModal({ visible: true, alert: item })}
          >
            <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.alertContent}>
        <View style={styles.alertRow}>
          <MaterialCommunityIcons name="card-account-details" size={18} color="#666" />
          <Text style={styles.alertUid}>{item.scan_event.rfid_uid}</Text>
        </View>

        <View style={styles.alertRow}>
          <Ionicons name="location-outline" size={18} color="#666" />
          <Text style={styles.alertText}>{item.scan_event.reader_name}</Text>
        </View>

        <View style={styles.alertRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.alertText}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{item.scan_event.message}</Text>
        </View>

        {item.acknowledged && item.acknowledged_by_name && (
          <View style={styles.acknowledgedInfo}>
            <Text style={styles.acknowledgedInfoText}>
              Acknowledged by {item.acknowledged_by_name} at{' '}
              {new Date(item.acknowledged_at!).toLocaleString()}
            </Text>
            {item.notes && (
              <Text style={styles.acknowledgedNotes}>Notes: {item.notes}</Text>
            )}
          </View>
        )}
      </View>
    </View>
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
          <Text style={styles.headerTitle}>Security Alerts</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {alerts.filter(a => !a.acknowledged).length}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Toggle */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !showAcknowledged && styles.filterButtonActive]}
          onPress={() => setShowAcknowledged(false)}
        >
          <Text style={[styles.filterText, !showAcknowledged && styles.filterTextActive]}>
            Active ({alerts.filter(a => !a.acknowledged).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, showAcknowledged && styles.filterButtonActive]}
          onPress={() => setShowAcknowledged(true)}
        >
          <Text style={[styles.filterText, showAcknowledged && styles.filterTextActive]}>
            All ({alerts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#48D666" />
            <Text style={styles.emptyTitle}>All Clear</Text>
            <Text style={styles.emptySubtitle}>
              {showAcknowledged
                ? 'No alerts to display'
                : 'No active alerts requiring attention'}
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

      {/* Acknowledge Modal */}
      <Modal
        visible={acknowledgeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAcknowledgeModal({ visible: false, alert: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Acknowledge Alert</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to acknowledge this alert?
            </Text>

            <TextInput
              style={styles.notesInput}
              placeholder="Add notes (optional)"
              placeholderTextColor="#999"
              value={acknowledgeNotes}
              onChangeText={setAcknowledgeNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setAcknowledgeModal({ visible: false, alert: null });
                  setAcknowledgeNotes('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleAcknowledge}
              >
                <Text style={styles.modalConfirmText}>Acknowledge</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  headerBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  alertCardAcknowledged: {
    borderLeftColor: '#48D666',
    opacity: 0.8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  alertSeverity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  acknowledgeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acknowledgeButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  acknowledgedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acknowledgedText: {
    fontSize: 12,
    color: '#48D666',
    marginLeft: 4,
    fontWeight: '500',
  },
  alertContent: {
    gap: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertUid: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    fontFamily: 'monospace',
  },
  alertText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  messageContainer: {
    backgroundColor: '#FFF0F0',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#FF6B6B',
  },
  acknowledgedInfo: {
    backgroundColor: '#F0FFF0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  acknowledgedInfoText: {
    fontSize: 12,
    color: '#48D666',
  },
  acknowledgedNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default AlertsScreen;
