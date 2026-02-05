import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RfidAdminService } from '../../services/RfidAdminService';
import { RfidTag, RfidTagStatus, RfidTagFormData } from '../../types/rfid';
import { COLORS } from '../../constants/AppConst';

type RootStackParamList = {
  RfidTagList: undefined;
  RfidTagDetail: { tagId: number };
  RfidTagForm: { tagId?: number };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'RfidTagForm'>;
type RouteProps = RouteProp<RootStackParamList, 'RfidTagForm'>;

const STATUS_OPTIONS: { label: string; value: RfidTagStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Lost', value: 'lost' },
];

const RfidTagFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const tagId = route.params?.tagId;
  const isEditing = !!tagId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<RfidTagFormData>({
    uid: '',
    status: 'active',
    expiry_date: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing) {
      loadTag();
    }
  }, [tagId]);

  const loadTag = async () => {
    try {
      const tag = await RfidAdminService.getTagById(tagId!);
      if (tag) {
        setFormData({
          uid: tag.uid,
          user_id: tag.user_id || undefined,
          vehicle_id: tag.vehicle_id || undefined,
          status: tag.status,
          expiry_date: tag.expiry_date || '',
          notes: tag.notes || '',
        });
      }
    } catch (error) {
      console.log('Error loading tag:', error);
      Alert.alert('Error', 'Failed to load tag data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.uid.trim()) {
      newErrors.uid = 'UID is required';
    } else if (formData.uid.length < 4) {
      newErrors.uid = 'UID must be at least 4 characters';
    } else if (!/^[A-Fa-f0-9]+$/.test(formData.uid)) {
      newErrors.uid = 'UID must contain only hexadecimal characters (0-9, A-F)';
    }

    if (formData.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.expiry_date)) {
      newErrors.expiry_date = 'Date must be in YYYY-MM-DD format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      let result;
      if (isEditing) {
        result = await RfidAdminService.updateTag(tagId!, {
          ...formData,
          uid: formData.uid.toUpperCase(),
        });
      } else {
        result = await RfidAdminService.createTag({
          ...formData,
          uid: formData.uid.toUpperCase(),
        });
      }

      if (result.success) {
        Alert.alert(
          'Success',
          isEditing ? 'Tag updated successfully' : 'Tag created successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        if (result.errors) {
          setErrors(
            Object.fromEntries(
              Object.entries(result.errors).map(([key, value]) => [key, value[0]])
            )
          );
        }
        Alert.alert('Error', result.message || 'Failed to save tag');
      }
    } catch (error) {
      console.log('Error saving tag:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const InputField: React.FC<{
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    error?: string;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'email-address' | 'numeric';
    multiline?: boolean;
    editable?: boolean;
  }> = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    autoCapitalize = 'none',
    keyboardType = 'default',
    multiline = false,
    editable = true,
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tag data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[COLORS.secondary, COLORS.primary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Tag' : 'Add New Tag'}
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* UID Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag Information</Text>
          <View style={styles.formCard}>
            <InputField
              label="RFID UID *"
              value={formData.uid}
              onChangeText={(text) => setFormData({ ...formData, uid: text.toUpperCase() })}
              placeholder="e.g., A1B2C3D4"
              error={errors.uid}
              autoCapitalize="characters"
              editable={!isEditing} // UID should not be editable when editing
            />
            {isEditing && (
              <Text style={styles.helperText}>UID cannot be changed after creation</Text>
            )}
          </View>
        </View>

        {/* Status Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  formData.status === option.value && styles.statusOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, status: option.value })}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    formData.status === option.value && styles.statusOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Expiry Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expiry Date</Text>
          <View style={styles.formCard}>
            <InputField
              label="Expiry Date"
              value={formData.expiry_date || ''}
              onChangeText={(text) => setFormData({ ...formData, expiry_date: text })}
              placeholder="YYYY-MM-DD (e.g., 2026-12-31)"
              error={errors.expiry_date}
            />
            <Text style={styles.helperText}>
              Leave empty for no expiration
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <View style={styles.formCard}>
            <InputField
              label="Notes"
              value={formData.notes || ''}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Any additional information..."
              multiline
            />
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>User & Vehicle Assignment</Text>
            <Text style={styles.infoText}>
              User and vehicle assignment will be available when the backend API is integrated.
              For now, tags can be created with UID and status only.
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  saveButton: {
    padding: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputDisabled: {
    backgroundColor: '#EEEEEE',
    color: '#999',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  statusOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: COLORS.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 100,
  },
});

export default RfidTagFormScreen;
