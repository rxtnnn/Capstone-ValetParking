import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IncidentService } from '../../services/IncidentService';
import {
  IncidentCategory,
  IncidentFormData,
  INCIDENT_CATEGORY_LABELS,
  FLOOR_LEVELS,
} from '../../types/incident';
import { COLORS } from '../../constants/AppConst';
import { styles } from '../styles/IncidentReportScreen.style';

type RootStackParamList = {
  SecurityDashboard: undefined;
  IncidentLog: undefined;
  IncidentReport: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'IncidentReport'>;

const CATEGORIES = Object.entries(INCIDENT_CATEGORY_LABELS) as [
  IncidentCategory,
  string,
][];

const IncidentReportScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [floorLevel, setFloorLevel] = useState('');
  const [category, setCategory] = useState<IncidentCategory | ''>('');
  const [spaceCode, setSpaceCode] = useState('');
  const [incidentAt, setIncidentAt] = useState('');
  const [involvedParty, setInvolvedParty] = useState('');
  const [notes, setNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [floorPickerVisible, setFloorPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const canSubmit = floorLevel.trim() !== '' && category !== '';

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload: IncidentFormData = {
      floor_level: floorLevel,
      category: category as IncidentCategory,
      ...(spaceCode.trim() && { space_code: spaceCode.trim() }),
      ...(incidentAt.trim() && { incident_at: incidentAt.trim() }),
      ...(involvedParty.trim() && { involved_party: involvedParty.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
      ...(actionTaken.trim() && { action_taken: actionTaken.trim() }),
    };

    setSubmitting(true);
    const result = await IncidentService.create(payload);
    setSubmitting(false);

    if (result.success) {
      Alert.alert(
        'Incident Filed',
        'Your incident report has been submitted successfully.',
        [
          {
            text: 'View Log',
            onPress: () => navigation.replace('IncidentLog'),
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } else {
      Alert.alert(
        'Submission Failed',
        result.message || 'Unable to file the incident report. Please try again.',
      );
    }
  };

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
            <Text style={styles.headerTitle}>Incident Report</Text>
            <Text style={styles.headerSubtitle}>File a new incident</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Required Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Details</Text>
            <Text style={styles.requiredNote}>* Required fields</Text>

            {/* Floor Level */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Floor Level <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.picker, !floorLevel && styles.pickerEmpty]}
                onPress={() => setFloorPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !floorLevel && styles.pickerPlaceholder,
                  ]}
                >
                  {floorLevel || 'Select floor level'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.picker, !category && styles.pickerEmpty]}
                onPress={() => setCategoryPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !category && styles.pickerPlaceholder,
                  ]}
                >
                  {category
                    ? INCIDENT_CATEGORY_LABELS[category]
                    : 'Select category'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Space Code */}
            <View style={styles.field}>
              <Text style={styles.label}>Space Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2C2"
                placeholderTextColor="#aaa"
                value={spaceCode}
                onChangeText={setSpaceCode}
                autoCapitalize="characters"
              />
            </View>

            {/* Incident At */}
            <View style={styles.field}>
              <Text style={styles.label}>Time of Incident</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2026-04-05T14:30:00"
                placeholderTextColor="#aaa"
                value={incidentAt}
                onChangeText={setIncidentAt}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>
                ISO 8601 format — leave blank to use submission time
              </Text>
            </View>
          </View>

          {/* Optional Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details</Text>

            {/* Involved Party */}
            <View style={styles.field}>
              <Text style={styles.label}>Involved Party</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Plate no., person description"
                placeholderTextColor="#aaa"
                value={involvedParty}
                onChangeText={setInvolvedParty}
                autoCapitalize="characters"
              />
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Describe what happened..."
                placeholderTextColor="#aaa"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Action Taken */}
            <View style={styles.field}>
              <Text style={styles.label}>Action Taken</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Describe what was done in response..."
                placeholderTextColor="#aaa"
                value={actionTaken}
                onChangeText={setActionTaken}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                <Text style={styles.submitText}>Submit Incident Report</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floor Level Picker Modal */}
      <Modal
        visible={floorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFloorPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFloorPickerVisible(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Floor Level</Text>
            {FLOOR_LEVELS.map((floor) => (
              <TouchableOpacity
                key={floor}
                style={[
                  styles.pickerOption,
                  floorLevel === floor && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setFloorLevel(floor);
                  setFloorPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    floorLevel === floor && styles.pickerOptionTextSelected,
                  ]}
                >
                  {floor}
                </Text>
                {floorLevel === floor && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryPickerVisible(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Category</Text>
            {CATEGORIES.map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.pickerOption,
                  category === value && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setCategory(value);
                  setCategoryPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    category === value && styles.pickerOptionTextSelected,
                  ]}
                >
                  {label}
                </Text>
                {category === value && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default IncidentReportScreen;
