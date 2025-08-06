import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  useWindowDimensions 
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  Poppins_400Regular,
} from '@expo-google-fonts/poppins';

type RootStackParamList = {
  Login: undefined;
};

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Poppins_400Regular,
  });

  // Simple responsive breakpoints
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

  const handleExploreNow = () => {
    navigation.navigate('Login');
  };

  if (!fontsLoaded) return null;

  // Dynamic styles based on screen dimensions
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: width * 0.08, // 8% of screen width
      paddingVertical: height * 0.05,  // 5% of screen height
      flexDirection: isLandscape && height < 500 ? 'row' : 'column',
    },
    
    imageContainer: {
      flex: isLandscape ? 1 : 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    image: {
      width: isTablet 
        ? Math.min(width * 0.4, 400) 
        : isLandscape 
          ? Math.min(width * 0.35, 300)
          : Math.min(width * 0.85, 400),
      height: isTablet 
        ? Math.min(width * 0.4, 400) 
        : isLandscape 
          ? Math.min(width * 0.35, 300)
          : Math.min(width * 0.85, 400),
      marginBottom: isLandscape ? 0 : height * 0.03,
    },
    
    contentContainer: {
      flex: isLandscape ? 1 : 0,
      alignItems: 'center',
      paddingLeft: isLandscape ? width * 0.05 : 0,
    },
    
    logoSection: {
      marginBottom: height * 0.06,
      alignItems: 'center',
    },
    
    logo: {
      width: getResponsiveSize(70, 80, 90, 120),
      height: getResponsiveSize(70, 80, 90, 120),
      borderRadius: getResponsiveSize(15, 20, 20, 25),
      marginBottom: height * 0.02,
    },
    
    appName: {
      fontSize: getResponsiveSize(28, 34, 36, 42),
      color: '#111827',
      marginBottom: height * 0.01,
      fontFamily: 'Montserrat_700Bold',
      textAlign: 'center',
    },
    
    tagline: {
      fontSize: getResponsiveSize(16, 18, 20, 24),
      color: 'black',
      textAlign: 'center',
      lineHeight: getResponsiveSize(22, 24, 26, 30),
      fontFamily: 'Poppins_400Regular',
      maxWidth: width * 0.8,
    },
    
    indicatorContainer: {
      flexDirection: 'row',
      marginBottom: height * 0.04,
      alignItems: 'center',
    },
    
    dot: {
      height: getResponsiveSize(6, 8, 8, 10),
      borderRadius: 5,
      marginHorizontal: width * 0.01,
    },
    
    firstDot: {
      backgroundColor: '#DC2626',
      width: getResponsiveSize(12, 15, 15, 18),
    },
    
    secDot: {
      backgroundColor: '#DC2626',
      width: getResponsiveSize(35, 45, 50, 60),
    },
    
    exploreButton: {
      backgroundColor: '#DC2626',
      paddingHorizontal: getResponsiveSize(24, 28, 32, 40),
      paddingVertical: getResponsiveSize(12, 14, 16, 18),
      borderRadius: 25,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      minWidth: width * 0.4,
      maxWidth: width * 0.8,
    },
    
    exploreButtonText: {
      color: 'white',
      fontSize: getResponsiveSize(16, 18, 20, 22),
      fontWeight: '600',
      marginRight: 8,
    },
    
    exploreButtonArrow: {
      color: 'white',
      fontSize: getResponsiveSize(18, 20, 22, 24),
      fontWeight: 'bold',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.imageContainer}>
        <Image 
          source={require('../../assets/splash-car.png')} 
          style={dynamicStyles.image}
          resizeMode="contain"
        />
      </View>

      <View style={dynamicStyles.contentContainer}>
        <View style={dynamicStyles.logoSection}>
          <Image 
            source={require('../../assets/logo.png')}
            style={dynamicStyles.logo}
            resizeMode="contain"
          />
          <Text style={dynamicStyles.appName}>VALET</Text>
          <Text style={dynamicStyles.tagline}>
            Your Virtual Parking{isLandscape ? ' ' : '\n'}Buddy
          </Text>
        </View>

        <View style={dynamicStyles.indicatorContainer}>
          <View style={[dynamicStyles.dot, dynamicStyles.firstDot]} />
          <View style={[dynamicStyles.dot, dynamicStyles.secDot]} />
        </View>

        <TouchableOpacity
          onPress={handleExploreNow}
          style={dynamicStyles.exploreButton}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.exploreButtonText}>Explore Now</Text>
          <Text style={dynamicStyles.exploreButtonArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SplashScreen;