import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
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
import { createResponsiveStyles } from './styles/SplashScreen.style';

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

  const isLandscape = width > height;
  const dynamicStyles = createResponsiveStyles({ width, height });

  const handleExploreNow = () => {
    navigation.navigate('Login');
  };

  if (!fontsLoaded) return null;

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