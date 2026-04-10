import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RfidAdminService } from '../../services/RfidAdminService';
import { RfidTag, getStatusColor } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';

type RootStackParamList = {
  RfidTagList: undefined;
  RfidTagDetail: { tagId: number };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'RfidTagDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'RfidTagDetail'>;

const RfidTagDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { tagId } = route.params;

  const [tag, setTag] = useState<RfidTag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTag();
  }, [tagId]);

  const loadTag = async () => {
    try {
      const tagData = await RfidAdminService.getTagById(tagId);
      setTag(tagData);
    } catch (error) {
      console.log('Error loading tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const InfoRow: React.FC<{
    icon: string;
    iconFamily?: 'ionicons' | 'material';
    label: string;
    value: string | number | null | undefined;
  }> = ({ icon, iconFamily = 'ionicons', label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        {iconFamily === 'ionicons' ? (
          <Ionicons name={icon as any} size={20} color="#666" />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={20} color="#666" />
        )}
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tag details...</Text>
      </View>
    );
  }

  if (!tag) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="card-off-outline" size={64} color="#CCC" />
        <Text style={styles.errorTitle}>Tag Not Found</Text>
        <TouchableOpacity
          style={styles.backButtonLarge}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Tag Details</Text>
          <View style={styles.editButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tag UID Card */}
        <View style={styles.uidCard}>
          <MaterialCommunityIcons name="card-account-details" size={48} color={COLORS.primary} />
          <Text style={styles.uidText}>{tag.uid}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tag.status) }]}>
            <Text style={styles.statusText}>
              {tag.status.charAt(0).toUpperCase() + tag.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* User Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline" label="Name" value={tag.user_name} />
            <InfoRow icon="mail-outline" label="Email" value={tag.user_email} />
            <InfoRow icon="id-card-outline" label="Employee ID" value={tag.user_employee_id} />
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="car-outline" label="Plate Number" value={tag.vehicle_plate} />
            <InfoRow icon="car-sport-outline" label="Model" value={tag.vehicle_model} />
            <InfoRow icon="color-palette-outline" label="Color" value={tag.vehicle_color} />
          </View>
        </View>

        {/* Tag Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag Details</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon="calendar-outline"
              label="Expiry Date"
              value={tag.expiry_date ? new Date(tag.expiry_date).toLocaleDateString() : 'No expiry'}
            />
            <InfoRow
              icon="time-outline"
              label="Created"
              value={new Date(tag.created_at).toLocaleString()}
            />
            <InfoRow
              icon="refresh-outline"
              label="Last Updated"
              value={new Date(tag.updated_at).toLocaleString()}
            />
            {tag.notes && (
              <View style={styles.notesRow}>
                <View style={styles.infoLabel}>
                  <Ionicons name="document-text-outline" size={20} color="#666" />
                  <Text style={styles.infoLabelText}>Notes</Text>
                </View>
                <Text style={styles.notesText}>{tag.notes}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  backButtonLarge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
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
  editButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  uidCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  uidText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace',
    marginTop: 12,
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabelText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  notesRow: {
    paddingVertical: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
});

export default RfidTagDetailScreen;
