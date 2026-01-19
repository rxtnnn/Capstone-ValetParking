import { StyleSheet } from 'react-native';

export const createResponsiveStyles = (width: number, height: number) => {
  const isSmallScreen = width < 360;
  const isLargeScreen = width >= 410;
  const isTablet = width >= 768;
  const isLandscape = width > height;

  const getResponsiveSize = (small: number, medium: number, large: number, tablet: number) => {
    if (isTablet) return tablet;
    if (isLargeScreen) return large;
    if (isSmallScreen) return small;
    return medium; 
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    
    header: {
      paddingTop: isLandscape ? height * 0.025 : height * 0.0625, 
      paddingHorizontal: width * 0.056,
      paddingBottom: height * 0.025,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: height * 0.01,
    },
    backButton: {
      padding: width * 0.022, 
      marginLeft: -width * 0.022,
    },
    headerTitle: {
      fontSize: getResponsiveSize(18, 20, 21, 24),
      fontFamily: 'Poppins_600SemiBold',
      color: 'white',
      flex: 1,
      textAlign: 'left',
      marginHorizontal: width * 0.014, 
    },
    toggleButton: {
      padding: width * 0.022, 
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
      fontSize: getResponsiveSize(9, 10, 10, 11),
      fontFamily: 'Poppins_600SemiBold',
      color: 'COLORS.primary',
    },
    headerSubtitle: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
      marginBottom: height * 0.02,
      lineHeight: getResponsiveSize(16, 20, 21, 22),
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: height * 0.01,
      paddingHorizontal: width * 0.025,
      borderRadius: 8,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    tabText: {
      fontSize: getResponsiveSize(11, 12, 13, 14),
      fontFamily: 'Poppins_500Medium',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    activeTabText: {
      color: 'white',
      fontFamily: 'Poppins_600SemiBold',
    },
    contentContainer: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingVertical: height * 0.025,
    },
    section: {
      paddingHorizontal: width * 0.056,
      marginBottom: height * 0.03,
    },
    sectionTitle: {
      fontSize: getResponsiveSize(16, 18, 19, 22),
      fontFamily: 'Poppins_600SemiBold',
      color: '#1F2937',
      marginBottom: height * 0.005,
    },
    sectionSubtitle: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: '#6B7280',
      marginBottom: height * 0.015,
      lineHeight: getResponsiveSize(16, 20, 21, 22),
    },
    card: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: width * 0.056,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -width * 0.017, 
    },
    typeCard: {
      width: (width - (width * 0.112 + width * 0.034)) / 2,
      backgroundColor: 'white',
      borderRadius: 16,
      padding: width * 0.044, 
      margin: width * 0.017,
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
      borderColor: 'COLORS.primary',
      backgroundColor: '#FEF7F7',
      transform: [{ scale: 0.98 }],
    },
    typeIcon: {
      width: getResponsiveSize(35, 40, 42, 48),
      height: getResponsiveSize(35, 40, 42, 48),
      borderRadius: getResponsiveSize(17.5, 20, 21, 24),
      backgroundColor: '#FEF7F7',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: height * 0.01,
    },
    selectedTypeIcon: {
      backgroundColor: 'COLORS.primary',
    },
    typeLabel: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_600SemiBold',
      color: '#374151',
      textAlign: 'center',
      marginBottom: height * 0.005,
    },
    selectedTypeLabel: {
      color: 'COLORS.primary',
    },
    typeDescription: {
      fontSize: getResponsiveSize(10, 12, 13, 14),
      fontFamily: 'Poppins_400Regular',
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: getResponsiveSize(14, 16, 17, 18),
    },
    selectedTypeDescription: {
      color: '#7C2D12',
    },
    ratingContainer: {
      alignItems: 'center',
      paddingVertical: height * 0.01,
    },
    ratingLabel: {
      fontSize: getResponsiveSize(14, 16, 17, 18),
      fontFamily: 'Poppins_500Medium',
      color: '#374151',
      marginBottom: height * 0.02,
      textAlign: 'center',
    },
    starsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: height * 0.015,
    },
    starButton: {
      padding: width * 0.022, 
      marginHorizontal: width * 0.006, 
    },
    ratingFeedback: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_600SemiBold',
      color: 'COLORS.primary',
      textAlign: 'center',
    },

    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -width * 0.011, 
    },
    chip: {
      paddingHorizontal: width * 0.033, 
      paddingVertical: height * 0.01,
      borderRadius: 20,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      margin: width * 0.011, 
    },
    selectedChip: {
      backgroundColor: 'COLORS.primary',
      borderColor: 'COLORS.primary',
    },
    chipText: {
      fontSize: getResponsiveSize(10, 12, 13, 14),
      fontFamily: 'Poppins_500Medium',
      color: '#64748B',
    },
    selectedChipText: {
      color: 'white',
    },

    textInput: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: '#374151',
      textAlignVertical: 'top',
      minHeight: height * 0.125,
      lineHeight: getResponsiveSize(16, 20, 21, 22),
      borderWidth: 0,
      padding: 0,
    },
    inputFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: height * 0.015,
      paddingTop: height * 0.015,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
    },
    characterCount: {
      fontSize: getResponsiveSize(10, 12, 13, 14),
      fontFamily: 'Poppins_400Regular',
      color: '#9CA3AF',
    },
    requiredIndicator: {
      fontSize: getResponsiveSize(10, 12, 13, 14),
      fontFamily: 'Poppins_500Medium',
      color: '#EF4444',
    },
    emailInputCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      paddingHorizontal: width * 0.044,
      paddingVertical: height * 0.005,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    emailInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: height * 0.01,
    },
    emailInput: {
      flex: 1,
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: '#374151',
      marginLeft: width * 0.033, 
      paddingVertical: height * 0.01,
    },
    submitContainer: {
      paddingHorizontal: width * 0.056, 
      marginBottom: height * 0.02,
    },
    submitButton: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: 'COLORS.primary',
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
      paddingVertical: height * 0.02,
      paddingHorizontal: width * 0.067, 
    },
    submitText: {
      fontSize: getResponsiveSize(14, 16, 17, 18),
      fontFamily: 'Poppins_600SemiBold',
      color: 'white',
      marginLeft: width * 0.022,
    },
    contactCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: width * 0.056, 
      borderWidth: 1,
      borderColor: '#E0F2FE',
    },
    contactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: height * 0.01,
    },
    contactTitle: {
      fontSize: getResponsiveSize(14, 16, 17, 18),
      fontFamily: 'Poppins_600SemiBold',
      color: '#1F2937',
      marginLeft: width * 0.022, 
    },
    contactSubtitle: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: '#6B7280',
      marginBottom: height * 0.015,
    },
    contactOptions: {
      gap: height * 0.01,
    },
    contactOption: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    contactText: {
      fontSize: getResponsiveSize(11, 13, 14, 15),
      fontFamily: 'Poppins_500Medium',
      color: '#374151',
      marginLeft: width * 0.022,
    },
    repliesContainer: {
      flex: 1,
      paddingHorizontal: width * 0.056, 
    },
    repliesContent: {
      paddingVertical: height * 0.025,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: width * 0.111, 
    },
    emptyIconContainer: {
      width: getResponsiveSize(70, 80, 85, 90),
      height: getResponsiveSize(70, 80, 85, 90),
      borderRadius: getResponsiveSize(35, 40, 42.5, 45),
      backgroundColor: '#FEF7F7',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: height * 0.025,
    },
    emptyTitle: {
      fontSize: getResponsiveSize(18, 20, 21, 24),
      fontFamily: 'Poppins_600SemiBold',
      color: '#374151',
      marginBottom: height * 0.01,
    },
    emptySubtitle: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: getResponsiveSize(16, 20, 21, 22),
      marginBottom: height * 0.03,
    },
    emptyAction: {
      backgroundColor: 'white',
      paddingHorizontal: width * 0.056,
      paddingVertical: height * 0.015,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: 'COLORS.primary',
    },
    emptyActionText: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_600SemiBold',
      color: 'COLORS.primary',
    },
    replyCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: width * 0.044,
      marginBottom: height * 0.02,
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
      marginBottom: height * 0.015,
    },
    replyTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    replyTypeText: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_500Medium',
      color: '#6B7280',
      marginLeft: width * 0.017,
    },
    replyStatus: {
      paddingHorizontal: width * 0.022,
      paddingVertical: height * 0.005,
      borderRadius: 12,
    },
    replyStatusText: {
      fontSize: getResponsiveSize(10, 11, 12, 13),
      fontFamily: 'Poppins_600SemiBold',
      color: 'white',
    },
    originalFeedback: {
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      padding: width * 0.033, 
      marginBottom: height * 0.015,
      borderLeftWidth: 3,
      borderLeftColor: '#E2E8F0',
    },
    originalLabel: {
      fontSize: getResponsiveSize(10, 12, 13, 14),
      fontFamily: 'Poppins_500Medium',
      color: '#6B7280',
      marginBottom: height * 0.005,
    },
    originalText: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: '#374151',
      lineHeight: getResponsiveSize(16, 18, 19, 20),
    },
    adminResponse: {
      backgroundColor: '#F0FDF4',
      borderRadius: 12,
      padding: width * 0.033,
      borderLeftWidth: 3,
      borderLeftColor: '#22C55E',
    },
    adminHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: height * 0.0075,
    },
    adminLabel: {
      fontSize: getResponsiveSize(11, 13, 14, 15),
      fontFamily: 'Poppins_600SemiBold',
      color: '#059669',
      marginLeft: width * 0.017, 
      flex: 1,
    },
    responseTime: {
      fontSize: getResponsiveSize(10, 11, 12, 13),
      fontFamily: 'Poppins_400Regular',
      color: '#6B7280',
    },
    adminText: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      fontFamily: 'Poppins_400Regular',
      color: '#374151',
      lineHeight: getResponsiveSize(16, 18, 19, 20),
    },
    ratingDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: height * 0.015,
      paddingTop: height * 0.015,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
    },
    ratingDisplayLabel: {
      fontSize: getResponsiveSize(10, 12, 13, 14),
      fontFamily: 'Poppins_500Medium',
      color: '#6B7280',
      marginRight: width * 0.011, 
    },
    ratingDisplayValue: {
      fontSize: getResponsiveSize(10, 12, 13, 14),
      fontFamily: 'Poppins_500Medium',
      color: '#6B7280',
      marginLeft: width * 0.011, 
    },
  });
};
export const createCustomAlertStyles = (width: number, height: number) => {
 
  const isSmallScreen = width < 360;
  const isLargeScreen = width >= 410;
  const isTablet = width >= 768;

  const getResponsiveSize = (small: number, medium: number, large: number, tablet: number) => {
    if (isTablet) return tablet;
    if (isLargeScreen) return large;
    if (isSmallScreen) return small;
    return medium;
  };

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: width * 0.067, 
    },
    container: {
      backgroundColor: 'white',
      borderRadius: 20,
      paddingVertical: height * 0.04, 
      paddingHorizontal: width * 0.078, 
      minWidth: Math.min(width * 0.83, 300), 
      maxWidth: Math.min(width * 0.9, 360),
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 15,
    },
    title: {
      fontSize: getResponsiveSize(18, 20, 21, 24),
      fontFamily: 'Poppins_600SemiBold',
      color: '#1F2937',
      textAlign: 'center',
      marginBottom: height * 0.015,
      lineHeight: getResponsiveSize(24, 26, 27, 30),
    },
    message: {
      fontSize: getResponsiveSize(13, 15, 16, 17),
      fontFamily: 'Poppins_400Regular',
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: getResponsiveSize(20, 22, 23, 24),
      marginBottom: height * 0.035,
    },
    buttonContainer: {
      width: '100%',
      gap: 12,
    },
    button: {
      backgroundColor: '#F3F4F6',
      paddingVertical: height * 0.0175, 
      paddingHorizontal: width * 0.078, 
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: getResponsiveSize(44, 48, 50, 52),
    },
    primaryButton: {
      backgroundColor: '#007AFF',
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    singleButton: {
      backgroundColor: '#007AFF',
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonText: {
      fontSize: getResponsiveSize(14, 16, 17, 18),
      fontFamily: 'Poppins_500Medium',
      color: 'white',
      textAlign: 'center',
    },
    primaryButtonText: {
      color: 'white',
      fontFamily: 'Poppins_600SemiBold',
    },
    cancelButtonText: {
      color: '#9CA3AF',
      fontFamily: 'Poppins_400Regular',
    },
  });
};