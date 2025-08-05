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
import { AuthProvider } from './src/context/AuthContext';

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

const GradientHeader: React.FC<{
  title: string;
  navigation: any;
  canGoBack?: boolean;
}> = ({ title, navigation, canGoBack = true }) => {
  return (
    <LinearGradient colors={['#B22020', '#4C0E0E']} style={{
      height: 100,
      paddingTop: 30,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingHorizontal: 10,
    }}>
      {canGoBack && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: 'absolute', left: 5, top: 32,
            padding: 8, zIndex: 1,}} activeOpacity={0.7} >
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
            { text: 'View Map', onPress: () => ('Navigate to parking map') }
          ]
        );
      } else if (notificationData?.type === 'feedback-reply') {
        Alert.alert(
          'Admin Reply Received',
          'You have a new reply to your feedback.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Reply', onPress: () => ('Navigate to feedback replies') }
          ]
        );
      } else {
        Alert.alert('VALET Notification', 'Notification received!');
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#4C0E0E" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
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
            headerShown: false,
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

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
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
      console.warn('Push notification permissions not granted');
      return;
    }
    
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      token = tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }
  return token;
}
export default App;