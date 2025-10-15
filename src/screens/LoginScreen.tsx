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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { createResponsiveStyles, createCustomAlertStyles } from './styles/LoginScreen.style';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALERT_MESSAGES = {
  EMAIL_REQUIRED: 'Please enter your email address',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Please enter your password',
  LOGIN_FAILED: 'Login Failed',
  LOGIN_FAILED_MSG: 'Invalid email or password. Please try again.',
  ACCNT_INACTIVE: 'Account Inactive',
  LOGIN_INACTIVE: 'Your account is inactive. Please contact your administrator to reactivate your account.',
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
  const alertStyles = createCustomAlertStyles({ width });

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

  const responsiveStyles = createResponsiveStyles({ width, height });

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
            ALERT_MESSAGES.ACCNT_INACTIVE,
            ALERT_MESSAGES.LOGIN_INACTIVE,
            'OK'
          );
          setIsSubmitting(false);
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
              <Text style={responsiveStyles.welcomeTitle}>Welcome</Text>
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