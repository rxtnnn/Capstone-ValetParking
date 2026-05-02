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
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RfidSecurityService } from '../../services/RfidSecurityService';
import { GuestAccess, getStatusColor } from '../../types/rfid';
import { COLORS, API_ENDPOINTS } from '../../constants/AppConst';
import { styles } from '../styles/GuestManagementScreen.style';
import apiClient from '../../config/api';

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
  const [newGuestModal, setNewGuestModal] = useState(false);
  const [newGuestLoading, setNewGuestLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: '',
    vehicle_plate: '',
    phone: '',
    purpose: '',
    valid_hours: '24',
    notes: '',
    _purposeOpen: false,
  });
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

  const handleCreateGuest = async () => {
    if (!newGuest.name.trim() || !newGuest.vehicle_plate.trim()) {
      Alert.alert('Required', 'Guest name and vehicle plate are required.');
      return;
    }
    const hours = parseInt(newGuest.valid_hours, 10);
    if (isNaN(hours) || hours < 1 || hours > 168) {
      Alert.alert('Invalid Duration', 'Valid duration must be between 1 and 168 hours.');
      return;
    }
    setNewGuestLoading(true);
    try {
      const valid_from = startDate;
      const valid_until = new Date(valid_from.getTime() + hours * 60 * 60 * 1000);
      await apiClient.post(API_ENDPOINTS.guestAccess, {
        name: newGuest.name.trim(),
        vehicle_plate: newGuest.vehicle_plate.trim().toUpperCase(),
        phone: newGuest.phone.trim() || null,
        purpose: newGuest.purpose.trim() || null,
        valid_from: valid_from.toISOString(),
        valid_until: valid_until.toISOString(),
        notes: newGuest.notes.trim() || null,
      });
      setNewGuestModal(false);
      setNewGuest({ name: '', vehicle_plate: '', phone: '', purpose: '', valid_hours: '24', notes: '', _purposeOpen: false });
      setStartDate(new Date());
      loadGuests();
    } catch {
      Alert.alert('Error', 'Failed to create guest pass. Please try again.');
    } finally {
      setNewGuestLoading(false);
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
      active: 'Active',
      used: 'Used',
      cancelled: 'Cancelled',
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
          <TouchableOpacity
            style={styles.headerBadge}
            onPress={() => setNewGuestModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
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

      {/* New Guest Pass Modal */}
      <Modal
        visible={newGuestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setNewGuestModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNewGuestModal(false)}>
          <View style={styles.newGuestOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.newGuestSheet}>
                  {/* Header */}
                  <View style={styles.newGuestHeader}>
                    <Ionicons name="person-add-outline" size={20} color="#333" />
                    <Text style={styles.newGuestTitle}>New Guest Pass</Text>
                    <TouchableOpacity onPress={() => setNewGuestModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                    {/* Guest Name */}
                    <Text style={styles.fieldLabel}>Guest Name <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="Enter guest name"
                      placeholderTextColor="#aaa"
                      value={newGuest.name}
                      onChangeText={v => setNewGuest(p => ({ ...p, name: v }))}
                    />

                    {/* Vehicle Plate + Phone */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Vehicle Plate <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="ABC 1234"
                          placeholderTextColor="#aaa"
                          value={newGuest.vehicle_plate}
                          onChangeText={v => setNewGuest(p => ({ ...p, vehicle_plate: v }))}
                          autoCapitalize="characters"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Phone Number</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="Optional"
                          placeholderTextColor="#aaa"
                          value={newGuest.phone}
                          onChangeText={v => setNewGuest(p => ({ ...p, phone: v }))}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>

                    {/* Purpose */}
                    <Text style={styles.fieldLabel}>Purpose of Visit</Text>
                    <TouchableOpacity
                      style={[styles.fieldInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => setNewGuest(p => ({ ...p, _purposeOpen: !p._purposeOpen } as any))}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 14, color: newGuest.purpose ? '#333' : '#aaa' }}>
                        {newGuest.purpose || '-- Select Purpose --'}
                      </Text>
                      <Ionicons name={(newGuest as any)._purposeOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
                    </TouchableOpacity>
                    {(newGuest as any)._purposeOpen && (
                      <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: -8, marginBottom: 12, backgroundColor: '#fff', overflow: 'hidden' }}>
                        {(['Student Drop-off / Pick-up', 'Parent-Teacher Meeting', 'School Event / Program', 'Meeting with Faculty / Staff', 'Job Interview', 'Delivery / Service', 'Campus Tour / Inquiry', 'Maintenance / Repair', 'Other'] as const).map((opt, i) => (
                          <TouchableOpacity
                            key={opt}
                            onPress={() => setNewGuest(p => ({ ...p, purpose: opt, _purposeOpen: false } as any))}
                            style={{
                              paddingVertical: 11,
                              paddingHorizontal: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderTopWidth: i === 0 ? 0 : 1,
                              borderTopColor: '#F0F0F0',
                              backgroundColor: newGuest.purpose === opt ? COLORS.primary + '10' : '#fff',
                            }}
                          >
                            <Text style={{ fontSize: 14, color: newGuest.purpose === opt ? COLORS.primary : '#333' }}>{opt}</Text>
                            {newGuest.purpose === opt && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Start Date + Valid Duration */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Start Date <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
                        <TouchableOpacity
                          style={[styles.fieldInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                          onPress={() => setShowDatePicker(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 14, color: '#333' }}>
                            {`${String(startDate.getMonth() + 1).padStart(2, '0')}/${String(startDate.getDate()).padStart(2, '0')}/${startDate.getFullYear()}`}
                          </Text>
                          <Ionicons name="calendar-outline" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Valid Duration <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={[styles.fieldInput, { flex: 1 }]}
                            placeholder="24"
                            placeholderTextColor="#aaa"
                            value={newGuest.valid_hours}
                            onChangeText={v => setNewGuest(p => ({ ...p, valid_hours: v.replace(/[^0-9]/g, '') }))}
                            keyboardType="numeric"
                          />
                          <Text style={{ fontSize: 14, color: '#666' }}>hrs</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Max: 168 hours (1 week)</Text>

                    {showDatePicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        minimumDate={new Date()}
                        onChange={(_, selected) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (selected) setStartDate(selected);
                        }}
                      />
                    )}

                    {/* Notes */}
                    <Text style={styles.fieldLabel}>Notes</Text>
                    <TextInput
                      style={[styles.fieldInput, { minHeight: 70, textAlignVertical: 'top' }]}
                      placeholder="Additional notes..."
                      placeholderTextColor="#aaa"
                      value={newGuest.notes}
                      onChangeText={v => setNewGuest(p => ({ ...p, notes: v }))}
                      multiline
                    />
                  </ScrollView>

                  {/* Buttons */}
                  <View style={styles.newGuestFooter}>
                    <TouchableOpacity
                      style={styles.newGuestCancelBtn}
                      onPress={() => setNewGuestModal(false)}
                    >
                      <Text style={styles.newGuestCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.newGuestCreateBtn, { opacity: newGuestLoading ? 0.7 : 1 }]}
                      onPress={handleCreateGuest}
                      disabled={newGuestLoading}
                    >
                      {newGuestLoading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Ionicons name="save-outline" size={16} color="#fff" />}
                      <Text style={styles.newGuestCreateText}>Create Pass</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
      </Modal>

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
