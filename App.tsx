import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Alert, Platform, View, Text, TouchableOpacity } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Import Authentication Provider
import { AuthProvider } from './src/context/AuthContext';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import ParkingMapScreen from './src/screens/ParkingMapScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import { NotificationService } from './src/services/NotificationService';
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

// Types
export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Floors: undefined;
  ParkingMap: { floor: number };
  Feedback: undefined;
  Settings: undefined;
  Profile: undefined;
  ApiTest: undefined;
  Login: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Custom Gradient Header Component
const GradientHeader: React.FC<{
  title: string;
  navigation: any;
  canGoBack?: boolean;
}> = ({ title, navigation, canGoBack = true }) => {
  return (
    <LinearGradient colors={['#B22020', '#4C0E0E']} style={{
      height: 100,
      paddingTop: 50,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingHorizontal: 10,
    }}>
      {canGoBack && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            position: 'absolute',
            left: 5,
            top: 52,
            padding: 8,
            zIndex: 1,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
      )}
      
      <Text style={{
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'right',
        marginTop: 8,
        marginLeft: 35
      }}>
        {title}
      </Text>
    </LinearGradient>
  );
};

const AppNavigator: React.FC = () => {
  useEffect(() => {
    registerForPushNotificationsAsync();
    
    // Initialize notification service
    NotificationService.initialize();

    // Listen for notification interactions
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      Alert.alert('Parking Update', 'Notification tapped!');
    });

    // 🔥 FIXED: Welcome notification using the simple method
    const welcomeTimer = setTimeout(async () => {
      try {
        await NotificationService.showSimpleNotification(
          'VALET Connected! ',
          'Your parking assistant is ready to help you find spots.',
          { 
            type: 'welcome',
            timestamp: Date.now()
          }
        );
      } catch (error) {
        console.error('Error showing welcome notification:', error);
      }
    }, 5000); // Increased delay

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
      clearTimeout(welcomeTimer);
    };
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#4C0E0E" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false, // We'll use custom headers
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
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
          })}
        />
        <Stack.Screen 
          name="Feedback" 
          component={FeedbackScreen}
          options={({ navigation }) => ({
            headerShown: true,
            header: () => (
              <GradientHeader 
                title="Feedback" 
                navigation={navigation}
                canGoBack={true}
              />
            ),
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
          })}
        />
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

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
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
      alert('Failed to get push token for push notification!');
      return;
    }
    
    try {
      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token?.data;
}

export default App;