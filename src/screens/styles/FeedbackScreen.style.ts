import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
    marginRight: 0,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'flex-start'
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
  headerPlaceholder: {
    width: 34,
  },
  headerDescriptionContainer: {
    alignItems: 'center',
  },
  headerDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  feedbackTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFeedbackTypeCard: {
    borderColor: '#B22020',
    backgroundColor: '#FEF2F2',
  },
  feedbackTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedFeedbackTypeIcon: {
    backgroundColor: '#B22020',
  },
  feedbackTypeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    textAlign: 'center',
  },
  selectedFeedbackTypeLabel: {
    color: '#B22020',
    fontFamily: 'Poppins_600SemiBold',
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingTextContainer: {
    marginTop: 8,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B22020',
    textAlign: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedChip: {
    backgroundColor: '#B22020',
    borderColor: '#B22020',
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
  },
  selectedChipText: {
    color: 'white',
  },
  textInput: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    textAlignVertical: 'top',
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 0,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
    textAlign: 'right',
  },
  emailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailIcon: {
    marginRight: 12,
    marginLeft: 8,
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    height: 44,
    paddingVertical: 10,
  },
  submitSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
  contactCard: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    marginLeft: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactMethods: {
    gap: 12,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactMethodText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    marginLeft: 8,
  },
  privacyCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#065F46',
    marginLeft: 8,
  },
  privacyText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#047857',
    lineHeight: 18,
  },
});