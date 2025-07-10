import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');
import { useFonts } from 'expo-font';
import {
  Montserrat_100Thin,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleExploreNow = () => {
    navigation.navigate('Register' as never);
  };

  const [fontsLoaded] = useFonts({
    Montserrat_100Thin,
    Montserrat_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  if (!fontsLoaded) return null;
  
  return (
    <View style={styles.container}>
      {/* Main Image Placeholder */}
      <View>
        <Image source={require('../../assets/splash-car.png')} 
        style={styles.image} 
          />
      </View>

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image source={require('../../assets/logo.png')}
        style={styles.logo}/>
        <Text style={styles.appName}>VALET</Text>
        <Text style={styles.tagline}>
          Your Virtual Parking{'\n'}Buddy
        </Text>
      </View>

      {/* Indicator Dots */}
      <View style={styles.indicatorContainer}>
        <View style={[styles.dot, styles.firstDot]} />
        <View style={[styles.dot, styles.secDot]} />
      </View>

      {/* Explore Button */}
      <TouchableOpacity
        onPress={handleExploreNow}
        style={styles.exploreButton}
        activeOpacity={0.8}
      >
        <Text style={styles.exploreButtonText}>Explore Now</Text>
        <Text style={styles.exploreButtonArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  image:{
    width: 400,
    height: 400,
    alignItems: 'flex-start',
  },
  logo:{
    width:100,
    height: 100,
    borderRadius: 20,
  },
  logoSection: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logoHere: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  appName: {
    fontSize: 36,
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold'
  },
  tagline: {
    fontSize: 18,
    color: 'black',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular'
  },
  indicatorContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  firstDot: {
    backgroundColor: '#DC2626',
    width: 15,
  },
  secDot: {
    backgroundColor: '#DC2626',
    width: 50
  },
  exploreButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  exploreButtonArrow: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default SplashScreen;