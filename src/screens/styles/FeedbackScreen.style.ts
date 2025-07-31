import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
    flex: 1,
    textAlign: 'left',
    marginHorizontal: 5,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B22020',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeTabText: {
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },

  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },

  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Feedback Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  typeCard: {
    width: (width - 52) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedTypeCard: {
    borderColor: '#B22020',
    backgroundColor: '#FEF7F7',
    transform: [{ scale: 0.98 }],
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedTypeIcon: {
    backgroundColor: '#B22020',
  },
  typeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedTypeLabel: {
    color: '#B22020',
  },
  typeDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedTypeDescription: {
    color: '#7C2D12',
  },

  // Rating Styles
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  ratingFeedback: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B22020',
    textAlign: 'center',
  },

  // Chips for Issues
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    margin: 4,
  },
  selectedChip: {
    backgroundColor: '#B22020',
    borderColor: '#B22020',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
  },
  selectedChipText: {
    color: 'white',
  },

  // Text Input Styles
  textInput: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    textAlignVertical: 'top',
    minHeight: 100,
    lineHeight: 20,
    borderWidth: 0,
    padding: 0,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
  },
  requiredIndicator: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#EF4444',
  },

  // Email Input
  emailInputCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    marginLeft: 12,
    paddingVertical: 8,
  },

  // Submit Button
  submitContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#B22020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
    marginLeft: 8,
  },

  // Contact Card
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    marginLeft: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  contactOptions: {
    gap: 8,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    marginLeft: 8,
  },

  // Admin Replies Styles
  repliesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  repliesContent: {
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAction: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#B22020',
  },
  emptyActionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B22020',
  },

  // Reply Card Styles
  replyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  replyTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyTypeText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginLeft: 6,
  },
  replyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  replyStatusText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
  originalFeedback: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  originalLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    lineHeight: 18,
  },
  adminResponse: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#059669',
    marginLeft: 6,
    flex: 1,
  },
  responseTime: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
  },
  adminText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    lineHeight: 18,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ratingDisplayLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginRight: 4,
  },
  ratingDisplayValue: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginLeft: 4,
  },

  // Custom Alert Styles - Designed to match your app's theme
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    minWidth: 300,
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 15,
  },
  alertIconContainer: {
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  alertMessage: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  alertButtonContainer: {
    width: '100%',
    gap: 12,
  },
  alertButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  alertPrimaryButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  alertCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  alertSingleButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  alertButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'white',
    textAlign: 'center',
  },
  alertPrimaryButtonText: {
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
  },
  alertCancelButtonText: {
    color: '#9CA3AF',
    fontFamily: 'Poppins_400Regular',
  },
});