import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { styles } from './styles/RegisterScreen.style';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALERT_MESSAGES = {
  EMAIL_REQUIRED: 'Please enter your email address',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Please enter your password',
  LOGIN_FAILED: 'Login Failed',
  LOGIN_ERROR: 'Login Error',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
  FORGOT_PASSWORD: 'Forgot Password',
  FORGOT_PASSWORD_MSG: 'Please contact your administrator to reset your password.',
  CREATE_ACCOUNT: 'Create Account',
  CREATE_ACCOUNT_MSG: 'New accounts are created by administrators only. Please contact your administrator for access.',
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigation = useNavigation();
  const { login, isAuthenticated, loading, error, clearError } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigation.navigate('Home' as never);
    }
  }, [isAuthenticated, loading, navigation]);

  useEffect(() => {
    return clearError;
  }, [clearError]);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, clearError]);

  const validateForm = useCallback((): boolean => {
    if (!email.trim()) {
      Alert.alert('Error', ALERT_MESSAGES.EMAIL_REQUIRED);
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert('Error', ALERT_MESSAGES.INVALID_EMAIL);
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Error', ALERT_MESSAGES.PASSWORD_REQUIRED);
      return false;
    }
    return true;
  }, [email, password]);

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
        Alert.alert(
          ALERT_MESSAGES.LOGIN_FAILED,
          result.message || 'Invalid email or password. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        ALERT_MESSAGES.LOGIN_ERROR,
        ALERT_MESSAGES.UNEXPECTED_ERROR,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, clearError, login, email, password]);

  const handleForgotPassword = useCallback(() => {
    Alert.alert(
      ALERT_MESSAGES.FORGOT_PASSWORD,
      ALERT_MESSAGES.FORGOT_PASSWORD_MSG,
      [{ text: 'OK' }]
    );
  }, []);

  const handleCreateAccount = useCallback(() => {
    Alert.alert(
      ALERT_MESSAGES.CREATE_ACCOUNT,
      ALERT_MESSAGES.CREATE_ACCOUNT_MSG,
      [{ text: 'OK' }]
    );
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleRememberMe = useCallback(() => {
    setRememberMe(prev => !prev);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#B22020" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.image} 
              />
            </View>

            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome back</Text>
              <Text style={styles.welcomeSubtitle}>Login to your VALET account</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#B22020" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.textInputWithIcon]}
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

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.passwordInputWithIcon]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={toggleShowPassword}
                  disabled={isSubmitting}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#9CA3AF" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity 
                  style={styles.rememberMeContainer}
                  onPress={toggleRememberMe}
                  disabled={isSubmitting}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && (
                      <Ionicons name="checkmark" size={12} color="white" />
                    )}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleForgotPassword} disabled={isSubmitting}>
                  <Text style={styles.forgotPasswordText}>Forgot Password ?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]} 
                onPress={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loginButtonContent}>
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.loginButtonText}>Signing In...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.createAccountContainer}>
                <Text style={styles.createAccountText}>Need an account? </Text>
                <TouchableOpacity onPress={handleCreateAccount} disabled={isSubmitting}>
                  <Text style={styles.createAccountLink}>Contact Administrator</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;