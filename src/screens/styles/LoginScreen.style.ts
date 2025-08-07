import { StyleSheet } from 'react-native';

interface ResponsiveStylesParams {
  width: number;
  height: number;
}

export const createResponsiveStyles = ({ width, height }: ResponsiveStylesParams) => {
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
      backgroundColor: '#ffffff',
    },
    content: {
      flex: 1,
      paddingHorizontal: width * 0.055,
      justifyContent: isLandscape ? 'flex-start' : 'center',
      paddingTop: isLandscape ? height * 0.02 : 0,
    },
    image: {
      width: isTablet 
        ? Math.min(width * 0.4, 300)
        : isLandscape 
          ? Math.min(width * 0.25, 200)
          : Math.min(width * 0.75, 280),
      height: isTablet 
        ? Math.min(width * 0.4, 300)
        : isLandscape 
          ? Math.min(width * 0.25, 200)
          : Math.min(width * 0.75, 280),
      alignSelf: 'center',
      marginBottom: isLandscape ? height * 0.02 : height * 0.03,
      marginTop: isLandscape ? height * 0.01 : height * 0.06,
    },
    welcomeSection: {
      marginBottom: isLandscape ? height * 0.03 : height * 0.05,
      alignItems: 'center',
    },
    welcomeTitle: {
      fontSize: getResponsiveSize(24, 28, 30, 34),
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: height * 0.01,
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: getResponsiveSize(14, 16, 17, 20),
      color: '#6B7280',
      fontWeight: '400',
      textAlign: 'center',
    },
    form: {
      flex: 1,
    },
    inputContainer: {
      position: 'relative',
      marginBottom: isLandscape ? height * 0.025 : height * 0.025,
    },
    textInput: {
      height: getResponsiveSize(45, 50, 52, 56),
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: width * 0.044,
      fontSize: getResponsiveSize(14, 16, 17, 18),
      color: '#000000',
      backgroundColor: '#ffffff',
    },
    textInputWithIcon: {
      paddingLeft: width * 0.133,
    },
    passwordInputWithIcon: {
      paddingLeft: width * 0.133,
      paddingRight: width * 0.139,
    },
    inputIcon: {
      position: 'absolute',
      left: width * 0.044,
      top: (getResponsiveSize(45, 50, 52, 56) - 20) / 2,
      zIndex: 1,
    },
    eyeIcon: {
      position: 'absolute',
      right: width * 0.042,
      top: (getResponsiveSize(45, 50, 52, 56) - 20) / 2,
      padding: 5,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
      borderWidth: 1,
      borderRadius: 8,
      padding: width * 0.033,
      marginBottom: width * 0.044,
    },
    errorText: {
      color: '#C53030',
      fontSize: getResponsiveSize(12, 14, 15, 16),
      marginLeft: width * 0.022,
      flex: 1,
      lineHeight: getResponsiveSize(16, 20, 21, 22),
    },
    optionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isLandscape ? height * 0.035 : height * 0.035,
    },
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: getResponsiveSize(16, 18, 19, 20),
      height: getResponsiveSize(16, 18, 19, 20),
      borderWidth: 2,
      borderColor: '#D1D5DB',
      borderRadius: 3,
      marginRight: width * 0.022,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
    },
    checkboxChecked: {
      backgroundColor: '#C53030',
      borderColor: '#C53030',
    },
    rememberMeText: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      color: '#374151',
    },
    forgotPasswordText: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      color: '#C53030',
      fontWeight: '500',
    },
    loginButton: {
      height: getResponsiveSize(45, 50, 52, 56),
      backgroundColor: '#C53030',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isLandscape ? height * 0.035 : height * 0.035,
    },
    loginButtonDisabled: {
      opacity: 0.7,
      backgroundColor: '#9CA3AF',
    },
    loginButtonText: {
      color: '#ffffff',
      fontSize: getResponsiveSize(14, 16, 17, 18),
      fontWeight: '600',
    },
    loginButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: isLandscape ? height * 0.035 : height * 0.035,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#D1D5DB',
    },
    dividerText: {
      marginHorizontal: width * 0.044,
      fontSize: getResponsiveSize(12, 14, 15, 16),
      color: '#6B7280',
      fontWeight: '500',
    },
    createAccountContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: height * 0.025,
    },
    createAccountText: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      color: '#6B7280',
    },
    createAccountLink: {
      fontSize: getResponsiveSize(12, 14, 15, 16),
      color: '#C53030',
      fontWeight: '600',
    },
  });
};

export const createCustomAlertStyles = ({ width }: { width: number }) => {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: width * 0.1,
    },
    alertcontainer: {
      backgroundColor: 'white',
      borderRadius: 12,
      paddingVertical: width * 0.06,
      paddingHorizontal: width * 0.06,
      width: '100%',
      maxWidth: Math.min(width * 0.8, 300),
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    title: {
      fontSize: Math.min(width * 0.045, 18),
      fontWeight: '600',
      color: '#1F2937',
      textAlign: 'center',
      marginBottom: width * 0.03,
    },
    message: {
      fontSize: Math.min(width * 0.035, 14),
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: Math.min(width * 0.05, 20),
      marginBottom: width * 0.05,
    },
    button: {
      backgroundColor: '#3B82F6',
      paddingVertical: width * 0.03,
      paddingHorizontal: width * 0.08,
      borderRadius: 8,
      minWidth: width * 0.2,
    },
    buttonText: {
      color: 'white',
      fontSize: Math.min(width * 0.04, 16),
      fontWeight: '500',
      textAlign: 'center',
    },
  });
};