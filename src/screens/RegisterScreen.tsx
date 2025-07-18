import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from './styles/RegisterScreen.style';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('testuser@gmail.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigation = useNavigation();

  const handleLogin = () => {
     navigation.navigate('Home' as never);
  };

  const handleGoogleLogin = () => {
    console.log('Google login pressed');
  };

  const handleFacebookLogin = () => {
    console.log('Facebook login pressed');
  };

  const handleAppleLogin = () => {
    console.log('Apple login pressed');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed');
  };

  const handleCreateAccount = () => {
    console.log('Create account pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Main content */}
      <View style={styles.content}>
        <View>
            <Image source={require('../../assets/logo.png')} 
            style={styles.image} 
            />
        </View>

        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSubtitle}>Login to your account</Text>
        </View>

        {/* Form starts here */}
        <View style={styles.form}>
          {/* Email starts here*/}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="testuser@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password starts here */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
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
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password ?</Text>
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          {/* OR line */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social login buttons */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
              <Text style={styles.socialButtonText}>G</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
              <Text style={styles.socialButtonTextFacebook}>f</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
              <Ionicons name="logo-apple" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* Create account */}
          <View style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>Don't have an Account? </Text>
            <TouchableOpacity onPress={handleCreateAccount}>
              <Text style={styles.createAccountLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};


export default LoginScreen;