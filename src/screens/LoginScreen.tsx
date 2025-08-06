import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALERT_MESSAGES = {
  EMAIL_REQUIRED: 'Please enter your email address',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Please enter your password',
  LOGIN_FAILED: 'Login Failed',
  LOGIN_FAILED_MSG: 'Invalid email or password. Please try again.',
  LOGIN_ERROR: 'Login Error',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
  FORGOT_PASSWORD: 'Forgot Password',
  FORGOT_PASSWORD_MSG: 'Please contact your administrator to reset your password.',
  CREATE_ACCOUNT: 'Create Account',
  CREATE_ACCOUNT_MSG: 'New accounts are created by administrators only. Please contact your administrator for access.',
};

type RootStackParamList = {
  Home: undefined;
};

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, onClose, buttonText = "Cool!" }) => {
  const { width } = useWindowDimensions();
  
  const alertStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: width * 0.1, // 10% padding
    },
    alertcontainer: {
      backgroundColor: 'white',
      borderRadius: 12,
      paddingVertical: width * 0.06, // 6% of screen width
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
      fontSize: Math.min(width * 0.045, 18), // Responsive font size
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

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.alertcontainer}>
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity style={alertStyles.button} onPress={onClose}>
            <Text style={alertStyles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtonText, setAlertButtonText] = useState('Cool!');
  
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login, isAuthenticated, loading, error, clearError } = useAuth();
  const { width, height } = useWindowDimensions();

  // Responsive breakpoints
  const isSmallScreen = width < 360;
  const isLargeScreen = width >= 410;
  const isTablet = width >= 768;
  const isLandscape = width > height;

  // Responsive values based on screen size
  const getResponsiveSize = (small: number, medium: number, large: number, tablet: number) => {
    if (isTablet) return tablet;
    if (isLargeScreen) return large;
    if (isSmallScreen) return small;
    return medium; // Default for Realme C25S size (360px)
  };

  // Dynamic styles based on screen dimensions
  const responsiveStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    content: {
      flex: 1,
      paddingHorizontal: width * 0.055, // ~5.5% of screen width (20px on 360px)
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
      paddingHorizontal: width * 0.044, // ~16px on 360px
      fontSize: getResponsiveSize(14, 16, 17, 18),
      color: '#000000',
      backgroundColor: '#ffffff',
    },
    textInputWithIcon: {
      paddingLeft: width * 0.133, // ~48px on 360px
    },
    passwordInputWithIcon: {
      paddingLeft: width * 0.133, // ~48px on 360px
      paddingRight: width * 0.139, // ~50px on 360px
    },
    inputIcon: {
      position: 'absolute',
      left: width * 0.044, // ~16px on 360px
      top: (getResponsiveSize(45, 50, 52, 56) - 20) / 2, // Center vertically
      zIndex: 1,
    },
    eyeIcon: {
      position: 'absolute',
      right: width * 0.042, // ~15px on 360px
      top: (getResponsiveSize(45, 50, 52, 56) - 20) / 2, // Center vertically
      padding: 5,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
      borderWidth: 1,
      borderRadius: 8,
      padding: width * 0.033, // ~12px on 360px
      marginBottom: width * 0.044, // ~16px on 360px
    },
    errorText: {
      color: '#C53030',
      fontSize: getResponsiveSize(12, 14, 15, 16),
      marginLeft: width * 0.022, // ~8px on 360px
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
      marginRight: width * 0.022, // ~8px on 360px
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
      marginHorizontal: width * 0.044, // ~16px on 360px
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

  const showCustomAlert = useCallback((title: string, message: string, buttonText = 'Cool!') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtonText(buttonText);
    setAlertVisible(true);
  }, []);

  const hideCustomAlert = useCallback(() => {
    setAlertVisible(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });    
    }
  }, [isAuthenticated, loading, navigation]);

  useEffect(() => clearError, []);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, clearError]);

  const validateForm = useCallback((): boolean => {
    if (!email.trim()) {
      showCustomAlert('Error', ALERT_MESSAGES.EMAIL_REQUIRED, 'OK');
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      showCustomAlert('Error', ALERT_MESSAGES.INVALID_EMAIL, 'OK');
      return false;
    }
    if (!password.trim()) {
      showCustomAlert('Error', ALERT_MESSAGES.PASSWORD_REQUIRED, 'OK');
      return false;
    }
    return true;
  }, [email, password, showCustomAlert]);

  const handleLogin = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    clearError();

    try {
      const result = await login({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (result.success) {
        setEmail('');
        setPassword('');
      } else {
        showCustomAlert(
          ALERT_MESSAGES.LOGIN_FAILED, 
          ALERT_MESSAGES.LOGIN_FAILED_MSG,
          'Try Again'
        );
      }
    } catch (error) {
      showCustomAlert(
        ALERT_MESSAGES.LOGIN_ERROR,
        ALERT_MESSAGES.UNEXPECTED_ERROR,
        'OK'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, clearError, login, email, password, showCustomAlert]);

  const handleForgotPassword = useCallback(() => {
    showCustomAlert(
      ALERT_MESSAGES.FORGOT_PASSWORD,
      ALERT_MESSAGES.FORGOT_PASSWORD_MSG,
      'Got it!'
    );
  }, [showCustomAlert]);

  const handleCreateAccount = useCallback(() => {
    showCustomAlert(
      ALERT_MESSAGES.CREATE_ACCOUNT,
      ALERT_MESSAGES.CREATE_ACCOUNT_MSG,
      'Understood'
    );
  }, [showCustomAlert]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleRememberMe = useCallback(() => {
    setRememberMe(prev => !prev);
  }, []);

  if (loading) {
    return (
      <View style={[responsiveStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#B22020" />
        <Text style={{ 
          marginTop: height * 0.02, 
          fontSize: getResponsiveSize(14, 16, 17, 18), 
          color: '#666' 
        }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={responsiveStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={{ flex: 1 }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={responsiveStyles.content}>
            <View>
              <Image 
                source={require('../../assets/logo.png')} 
                style={responsiveStyles.image}
                resizeMode="contain"
              />
            </View>

            <View style={responsiveStyles.welcomeSection}>
              <Text style={responsiveStyles.welcomeTitle}>Welcome back</Text>
              <Text style={responsiveStyles.welcomeSubtitle}>Login to your VALET account</Text>
            </View>

            {error && (
              <View style={responsiveStyles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#B22020" />
                <Text style={responsiveStyles.errorText}>{error}</Text>
              </View>
            )}

            <View style={responsiveStyles.form}>
              <View style={responsiveStyles.inputContainer}>
                <Ionicons 
                  name="mail-outline" 
                  size={getResponsiveSize(18, 20, 21, 22)} 
                  color="#9CA3AF" 
                  style={responsiveStyles.inputIcon} 
                />
                <TextInput
                  style={[responsiveStyles.textInput, responsiveStyles.textInputWithIcon]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={responsiveStyles.inputContainer}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={getResponsiveSize(18, 20, 21, 22)} 
                  color="#9CA3AF" 
                  style={responsiveStyles.inputIcon} 
                />
                <TextInput
                  style={[responsiveStyles.textInput, responsiveStyles.passwordInputWithIcon]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={responsiveStyles.eyeIcon}
                  onPress={toggleShowPassword}
                  disabled={isSubmitting}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={getResponsiveSize(18, 20, 21, 22)} 
                    color="#9CA3AF" 
                  />
                </TouchableOpacity>
              </View>

              <View style={responsiveStyles.optionsRow}>
                <TouchableOpacity 
                  style={responsiveStyles.rememberMeContainer}
                  onPress={toggleRememberMe}
                  disabled={isSubmitting}
                >
                  <View style={[responsiveStyles.checkbox, rememberMe && responsiveStyles.checkboxChecked]}>
                    {rememberMe && (
                      <Ionicons name="checkmark" size={12} color="white" />
                    )}
                  </View>
                  <Text style={responsiveStyles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleForgotPassword} disabled={isSubmitting}>
                  <Text style={responsiveStyles.forgotPasswordText}>Forgot Password</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[responsiveStyles.loginButton, isSubmitting && responsiveStyles.loginButtonDisabled]} 
                onPress={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={responsiveStyles.loginButtonContent}>
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    <Text style={responsiveStyles.loginButtonText}>Signing In...</Text>
                  </View>
                ) : (
                  <Text style={responsiveStyles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>

              <View style={responsiveStyles.dividerContainer}>
                <View style={responsiveStyles.dividerLine} />
                <Text style={responsiveStyles.dividerText}>OR</Text>
                <View style={responsiveStyles.dividerLine} />
              </View>

              <View style={responsiveStyles.createAccountContainer}>
                <Text style={responsiveStyles.createAccountText}>Need an account? </Text>
                <TouchableOpacity onPress={handleCreateAccount} disabled={isSubmitting}>
                  <Text style={responsiveStyles.createAccountLink}>Contact Administrator</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttonText={alertButtonText}
        onClose={hideCustomAlert}
      />
    </SafeAreaView>
  );
};

export default LoginScreen;