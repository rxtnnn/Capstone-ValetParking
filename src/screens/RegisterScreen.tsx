import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { styles } from './styles/RegisterScreen.style';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigation = useNavigation();
  const { login, isAuthenticated, loading, error, clearError } = useAuth();

  // Navigate to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigation.navigate('Home' as never);
    }
  }, [isAuthenticated, loading, navigation]);

  // Clear error when component unmounts or email changes
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, clearError]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      const result = await login({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (result.success) {
        // Clear form
        setEmail('');
        setPassword('');
        
        // Navigate to home (this will be handled by useEffect above)
        console.log('Login successful');
      } else {
        Alert.alert(
          'Login Failed',
          result.message || 'Invalid email or password. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Login Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert('Coming Soon', 'Google login will be available in a future update.');
  };

  const handleFacebookLogin = () => {
    Alert.alert('Coming Soon', 'Facebook login will be available in a future update.');
  };

  const handleAppleLogin = () => {
    Alert.alert('Coming Soon', 'Apple login will be available in a future update.');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact your administrator to reset your password.',
      [{ text: 'OK' }]
    );
  };

  const handleCreateAccount = () => {
    Alert.alert(
      'Create Account',
      'New accounts are created by administrators only. Please contact your administrator for access.',
      [{ text: 'OK' }]
    );
  };

  // Test login with demo credentials
  const handleTestLogin = () => {
    setEmail('user@valet.com');
    setPassword('password123');
  };

  // Show loading screen if checking authentication
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
        {/* Main content */}
        <View style={styles.content}>
          <View>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.image} 
            />
          </View>

          {/* Welcome */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>Login to your VALET account</Text>
          </View>

          {/* Error display */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#B22020" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form starts here */}
          <View style={styles.form}>
            {/* Email starts here*/}
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

            {/* Password starts here */}
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
                onPress={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>

            {/* Remember me and Forgot password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
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

            {/* Login button */}
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

            {/* Test login button (for development) */}
            {__DEV__ && (
              <TouchableOpacity 
                style={styles.testLoginButton} 
                onPress={handleTestLogin}
                disabled={isSubmitting}
              >
                <Text style={styles.testLoginButtonText}>Fill Test Credentials</Text>
              </TouchableOpacity>
            )}

            {/* OR line */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social login buttons */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity 
                style={[styles.socialButton, isSubmitting && styles.socialButtonDisabled]} 
                onPress={handleGoogleLogin}
                disabled={isSubmitting}
              >
                <Text style={styles.socialButtonText}>G</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.socialButton, isSubmitting && styles.socialButtonDisabled]} 
                onPress={handleFacebookLogin}
                disabled={isSubmitting}
              >
                <Text style={styles.socialButtonTextFacebook}>f</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.socialButton, isSubmitting && styles.socialButtonDisabled]} 
                onPress={handleAppleLogin}
                disabled={isSubmitting}
              >
                <Ionicons name="logo-apple" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Create account */}
            <View style={styles.createAccountContainer}>
              <Text style={styles.createAccountText}>Need an account? </Text>
              <TouchableOpacity onPress={handleCreateAccount} disabled={isSubmitting}>
                <Text style={styles.createAccountLink}>Contact Administrator</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;