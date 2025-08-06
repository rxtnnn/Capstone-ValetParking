import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  StatusBar, 
  Alert, 
  Platform, 
  View, 
  Text, 
  TouchableOpacity, 
  useWindowDimensions,
  StyleSheet,
  BackHandler,
  ActivityIndicator
} from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import ParkingMapScreen from './src/screens/ParkingMapScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import NotificationService from './src/services/NotificationService';
import AdminRepliesSection from './src/components/AdminRepliesSection';
import { theme } from './src/theme/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      
    shouldPlaySound: true,   
    shouldSetBadge: false,    
    shouldShowBanner: true,    
    shouldShowList: true,       
  }),
});

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: { floor: number };
  Feedback: { showReplies?: boolean };
  Settings: undefined;
  Profile: undefined;
  ApiTest: undefined;
  Login: undefined;
  AdminReplies: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

interface GradientHeaderProps {
  title: string;
  navigation: any;
  canGoBack?: boolean;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({ 
  title, 
  navigation, 
  canGoBack = true 
}) => {
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

  const responsiveHeaderStyles = StyleSheet.create({
    headerContainer: {
      height: isLandscape 
        ? getResponsiveSize(70, 80, 85, 90) 
        : getResponsiveSize(85, 100, 105, 120),
      paddingTop: isLandscape 
        ? getResponsiveSize(15, 20, 22, 25)
        : getResponsiveSize(25, 30, 32, 35),
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingHorizontal: width * 0.028,
    },
    backButton: {
      position: 'absolute',
      left: width * 0.014,
      top: isLandscape 
        ? getResponsiveSize(17, 22, 24, 27)
        : getResponsiveSize(27, 32, 34, 37),
      padding: width * 0.022, 
      zIndex: 1,
      minWidth: getResponsiveSize(40, 44, 46, 48),
      minHeight: getResponsiveSize(40, 44, 46, 48),
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      color: 'white',
      fontSize: getResponsiveSize(16, 20, 21, 24),
      fontWeight: 'bold',
      textAlign: 'left',
      marginTop: isLandscape 
        ? getResponsiveSize(4, 6, 7, 8)
        : getResponsiveSize(6, 8, 9, 10),
      marginLeft: canGoBack 
        ? getResponsiveSize(45, 55, 58, 65) 
        : width * 0.097, 
      flex: 1,
      textAlignVertical: 'center',
    },
  });

  return (
    <LinearGradient 
      colors={['#B22020', '#4C0E0E']} 
      style={responsiveHeaderStyles.headerContainer}
    >
      {canGoBack && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={responsiveHeaderStyles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} 
        >
          <Ionicons 
            name="chevron-back" 
            size={getResponsiveSize(20, 24, 25, 28)} 
            color="white" 
          />
        </TouchableOpacity>
      )}
      
      <Text 
        style={responsiveHeaderStyles.headerTitle}
        numberOfLines={1}
        adjustsFontSizeToFit={isSmallScreen}
      >
        {title}
      </Text>
    </LinearGradient>
  );
};

const LoadingScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const getResponsiveSize = (small: number, medium: number, large: number, tablet: number) => {
    if (width >= 768) return tablet;
    if (width >= 410) return large;
    if (width < 360) return small;
    return medium;
  };

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F5F5F5'
    }}>
      <ActivityIndicator size="large" color="#B22020" />
      <Text style={{
        fontSize: getResponsiveSize(14, 16, 17, 18),
        color: '#666',
        marginTop: 16,
        textAlign: 'center'
      }}>
        Loading VALET...
      </Text>
    </View>
  );
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await registerForPushNotificationsAsync();
        await NotificationService.initialize();
      } catch (error) {
        console.error('Error during app initialization:', error);
      }
    };

    initializeApp();
    
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const notificationData = response.notification.request.content.data;
      if (notificationData?.type === 'spot-available') {
        Alert.alert(
          'Parking Spot Available!', 
          'Tap OK to view the parking map.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Map', onPress: () => console.log('Navigate to parking map') }
          ]
        );
      } else if (notificationData?.type === 'feedback-reply') {
        Alert.alert(
          'Admin Reply Received',
          'You have a new reply to your feedback.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Reply', onPress: () => console.log('Navigate to feedback replies') }
          ]
        );
      } else {
        Alert.alert('VALET Notification', 'Notification received!');
      }
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return false; 
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
      backHandler.remove();
    };
  }, []);
  if (loading) {
    return (
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#4C0E0E" translucent={false} />
        <LoadingScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#4C0E0E"
        translucent={false}
      />
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Home" : "Splash"}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#F5F5F5' },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen 
              name="Splash" 
              component={SplashScreen} 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }}
              listeners={({ navigation }) => ({
                beforeRemove: (e) => {
                  e.preventDefault();
                  Alert.alert(
                    'Exit VALET',
                    'Are you sure you want to exit the app?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Exit', 
                        style: 'destructive',
                        onPress: () => BackHandler.exitApp()
                      }
                    ]
                  );
                },
              })}
            />
            
            <Stack.Screen 
              name="ParkingMap" 
              component={ParkingMapScreen}
              options={({ navigation }) => ({
                headerShown: true,
                header: () => (
                  <GradientHeader 
                    title="Parking Map" 
                    navigation={navigation}
                    canGoBack={true}
                  />
                ),
                gestureEnabled: true,
              })}
            />
            
            <Stack.Screen 
              name="Feedback" 
              component={FeedbackScreen}
              options={({ navigation }) => ({
                headerShown: false,
                header: () => (
                  <GradientHeader 
                    title="Feedback" 
                    navigation={navigation}
                    canGoBack={true}
                  />
                ),
                gestureEnabled: true,
              })}
            />
            
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={({ navigation }) => ({
                headerShown: true,
                header: () => (
                  <GradientHeader 
                    title="Settings" 
                    navigation={navigation}
                    canGoBack={true}
                  />
                ),
                gestureEnabled: true,
              })}
            />
            
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={({ navigation }) => ({
                headerShown: true,
                header: () => (
                  <GradientHeader 
                    title="Profile" 
                    navigation={navigation}
                    canGoBack={true}
                  />
                ),
                gestureEnabled: true,
              })}
            />
            
            <Stack.Screen 
              name="AdminReplies" 
              component={AdminRepliesSection}
              options={({ navigation }) => ({
                headerShown: true,
                header: () => (
                  <GradientHeader 
                    title="Admin Replies" 
                    navigation={navigation}
                    canGoBack={true}
                  />
                ),
                gestureEnabled: true,
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
};

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'VALET Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B22020',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions not granted');
      return;
    }
    
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      token = tokenData.data;
      console.log('Push token obtained successfully');
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }
  
  return token;
}

export default App;