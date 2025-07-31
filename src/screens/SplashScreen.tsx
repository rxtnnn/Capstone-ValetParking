import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Montserrat_100Thin,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { styles } from './styles/SplashScreen.style';

const REQUIRED_FONTS = {
  Montserrat_100Thin,
  Montserrat_700Bold,
  Poppins_400Regular,
  Poppins_600SemiBold,
};

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts(REQUIRED_FONTS);

  const handleExploreNow = () => {
    navigation.navigate('Login' as never);
  };

  if (!fontsLoaded) return null;
  
  return (
    <View style={styles.container}>
      <View>
        <Image 
          source={require('../../assets/splash-car.png')} 
          style={styles.image} 
        />
      </View>

      <View style={styles.logoSection}>
        <Image 
          source={require('../../assets/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.appName}>VALET</Text>
        <Text style={styles.tagline}>
          Your Virtual Parking{'\n'}Buddy
        </Text>
      </View>

      <View style={styles.indicatorContainer}>
        <View style={[styles.dot, styles.firstDot]} />
        <View style={[styles.dot, styles.secDot]} />
      </View>

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

export default SplashScreen;