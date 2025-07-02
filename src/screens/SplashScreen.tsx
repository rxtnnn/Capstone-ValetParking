import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

import { RootStackParamList } from '../../App';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#B71C1C', '#D32F2F', '#F44336']}
      style={styles.container}
    >
      {/* Animated Car Icon */}
      <Animatable.View
        animation="slideInRight"
        duration={1500}
        style={styles.carContainer}
      >
        <View style={styles.car}>
          <View style={styles.carBody} />
          <View style={styles.carWindows} />
          <View style={styles.carWheel1} />
          <View style={styles.carWheel2} />
        </View>
        
        {/* Animated Path */}
        <Animatable.View
          animation="fadeIn"
          duration={2000}
          delay={500}
          style={styles.pathContainer}
        >
          <View style={styles.pathDot1} />
          <View style={styles.pathLine1} />
          <View style={styles.pathDot2} />
          <View style={styles.pathLine2} />
          <View style={styles.pathCircle} />
        </Animatable.View>
      </Animatable.View>

      {/* Location Pin */}
      <Animatable.View
        animation="bounceIn"
        delay={1000}
        style={styles.locationContainer}
      >
        <View style={styles.locationPin}>
          <View style={styles.locationPinInner} />
        </View>
        <View style={styles.locationDot} />
      </Animatable.View>

      <Animatable.View
        animation="fadeInUp"
        delay={1500}
        style={styles.contentContainer}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>
        </View>
        
        <Text style={styles.title}>VALET</Text>
        <Text style={styles.subtitle}>
          Your Virtual Assistant with LED{'\n'}Enabled Tracking
        </Text>
        
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          delay={2000}
          style={styles.buttonContainer}
        >
          <View style={styles.exploreButton}>
            <Text style={styles.exploreText}>Explore Now</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
        </Animatable.View>
      </Animatable.View>

      <Animatable.View
        animation="fadeIn"
        delay={2500}
        style={styles.loadingContainer}
      >
        <View style={styles.loadingDots}>
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            delay={0}
            style={[styles.loadingDot, styles.loadingDot1]}
          />
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            delay={200}
            style={[styles.loadingDot, styles.loadingDot2]}
          />
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            delay={400}
            style={[styles.loadingDot, styles.loadingDot3]}
          />
        </View>
      </Animatable.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  carContainer: {
    position: 'absolute',
    top: height * 0.15,
    right: width * 0.1,
  },
  car: {
    width: 60,
    height: 30,
    position: 'relative',
  },
  carBody: {
    width: 60,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    position: 'absolute',
    top: 5,
  },
  carWindows: {
    width: 40,
    height: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    position: 'absolute',
    top: 8,
    left: 10,
  },
  carWheel1: {
    width: 12,
    height: 12,
    backgroundColor: '#424242',
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    left: 8,
  },
  carWheel2: {
    width: 12,
    height: 12,
    backgroundColor: '#424242',
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 8,
  },
  pathContainer: {
    position: 'absolute',
    top: 40,
    left: -20,
    width: 100,
    height: 100,
  },
  pathDot1: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    position: 'absolute',
    top: 0,
    left: 20,
  },
  pathLine1: {
    width: 2,
    height: 30,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 8,
    left: 23,
    opacity: 0.7,
  },
  pathDot2: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    position: 'absolute',
    top: 38,
    left: 20,
  },
  pathLine2: {
    width: 2,
    height: 20,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 46,
    left: 23,
    opacity: 0.7,
  },
  pathCircle: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    borderStyle: 'dashed',
    position: 'absolute',
    top: 66,
    left: 12,
    opacity: 0.7,
  },
  locationContainer: {
    position: 'absolute',
    bottom: height * 0.4,
    left: width * 0.1,
  },
  locationPin: {
    width: 30,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinInner: {
    width: 16,
    height: 16,
    backgroundColor: '#B71C1C',
    borderRadius: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    position: 'absolute',
    bottom: -15,
    left: 11,
  },
  contentContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  exploreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  exploreText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  loadingDot1: {
    opacity: 0.9,
  },
  loadingDot2: {
    opacity: 0.7,
  },
  loadingDot3: {
    opacity: 0.5,
  },
  connectionStatus: {
    alignItems: 'center',
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    fontStyle: 'italic',
  },
});

export default SplashScreen;