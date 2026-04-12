import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RfidSecurityService } from '../../services/RfidSecurityService';
import { GuestAccess, getStatusColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';
import { styles } from '../styles/GuestManagementScreen.style';

type RootStackParamList = {
  SecurityDashboard: undefined;
  GuestManagement: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'GuestManagement'>;

const GuestManagementScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [guests, setGuests] = useState<GuestAccess[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [denyModal, setDenyModal] = useState<{ visible: boolean; guest: GuestAccess | null }>({
    visible: false,
    guest: null,
  });
  const [denyReason, setDenyReason] = useState('');
  const isMountedRef = useRef(true);

  const loadGuests = async () => {
    const response = await RfidSecurityService.getAllGuests();
    if (isMountedRef.current && response.success) {
      setGuests(response.data);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadGuests();

      return () => {
        isMountedRef.current = false;
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadGuests();
  };

  const handleApprove = (guest: GuestAccess) => {
    Alert.alert(
      'Approve Guest',
      `Approve access for ${guest.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const result = await RfidSecurityService.approveGuest(guest.id);
            if (result.success) {
              loadGuests();
            } else {
              Alert.alert('Error', result.message || 'Failed to approve guest');
            }
          },
        },
      ]
    );
  };

  const handleDeny = async () => {
    if (!denyModal.guest) return;

    const result = await RfidSecurityService.denyGuest(
      denyModal.guest.id,
      denyReason || undefined
    );

    if (result.success) {
      setDenyModal({ visible: false, guest: null });
      setDenyReason('');
      loadGuests();
    } else {
      Alert.alert('Error', result.message || 'Failed to deny guest');
    }
  };

  const getStatusLabel = (status: GuestAccess['status']): string => {
    const labels: Record<GuestAccess['status'], string> = {
      pending: 'Pending',
      approved: 'Approved',
      denied: 'Denied',
      expired: 'Expired',
      checked_in: 'Checked In',
      checked_out: 'Checked Out',
    };
    return labels[status] || status;
  };

  const filteredGuests = activeTab === 'pending'
    ? guests.filter(g => g.status === 'pending')
    : guests;

  const renderGuestItem = ({ item }: { item: GuestAccess }) => (
    <View style={styles.guestCard}>
      <View style={styles.guestHeader}>
        <View>
          <Text style={styles.guestName}>{item.name}</Text>
          <Text style={styles.guestId}>{item.guest_id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.guestInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="car-outline" size={18} color="#666" />
          <Text style={styles.infoText}>{item.vehicle_plate}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color="#666" />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="document-text-outline" size={18} color="#666" />
          <Text style={styles.infoText}>{item.purpose}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.infoText}>
            Valid: {new Date(item.valid_from).toLocaleTimeString()} - {new Date(item.valid_until).toLocaleTimeString()}
          </Text>
        </View>
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={() => setDenyModal({ visible: true, guest: item })}
          >
            <Ionicons name="close" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Deny</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'approved' && item.approved_by_name && (
        <View style={styles.approvedInfo}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
          <Text style={styles.approvedText}>
            Approved by {item.approved_by_name}
          </Text>
        </View>
      )}

      <View style={styles.guestFooter}>
        <Text style={styles.footerText}>
          Created by {item.created_by_name || 'Admin'} • {new Date(item.created_at).toLocaleDateString()}
        </Text>
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
          <Text style={styles.headerTitle}>Guest Management</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {guests.filter(g => g.status === 'pending').length}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({guests.filter(g => g.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Guests ({guests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredGuests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGuestItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'pending' ? 'checkmark-circle-outline' : 'people-outline'}
              size={64}
              color="#CCC"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'No Pending Requests' : 'No Guests'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending'
                ? 'All guest requests have been processed'
                : 'No guest access requests yet'}
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

      {/* Deny Modal */}
      <Modal
        visible={denyModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDenyModal({ visible: false, guest: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Deny Guest Access</Text>
            <Text style={styles.modalSubtitle}>
              Deny access for {denyModal.guest?.name}?
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for denial (optional)"
              placeholderTextColor="#999"
              value={denyReason}
              onChangeText={setDenyReason}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDenyModal({ visible: false, guest: null });
                  setDenyReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDenyButton}
                onPress={handleDeny}
              >
                <Text style={styles.modalDenyText}>Deny Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GuestManagementScreen;
