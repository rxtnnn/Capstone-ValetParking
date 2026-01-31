import React, { useEffect, useState } from 'react';
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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { COLORS } from './src/constants/AppConst';
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

// Admin Screens
import {
  AdminDashboard,
  RfidTagListScreen,
  RfidTagDetailScreen,
  RfidTagFormScreen,
  RfidReaderStatusScreen,
} from './src/screens/admin';

// Security Screens
import {
  SecurityDashboard,
  ScanMonitorScreen,
  AlertsScreen,
  GuestManagementScreen,
  ScanHistoryScreen,
} from './src/screens/security';

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
  Profile: { userId?: number } | undefined;
  ApiTest: undefined;
  Login: undefined;
  AdminReplies: undefined;
  // Admin routes
  AdminDashboard: undefined;
  RfidTagList: undefined;
  RfidTagDetail: { tagId: number };
  RfidTagForm: { tagId?: number };
  RfidReaderStatus: undefined;
  // Security routes
  SecurityDashboard: undefined;
  ScanMonitor: undefined;
  AlertsScreen: undefined;
  GuestManagement: undefined;
  ScanHistory: undefined;
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
        ? getResponsiveSize(50, 56, 58, 60)
        : getResponsiveSize(56, 60, 62, 70),
      paddingTop: isLandscape
        ? getResponsiveSize(8, 10, 12, 14)
        : getResponsiveSize(10, 12, 14, 16),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: width * 0.028,
    },
    backButton: {
      position: 'absolute',
      left: width * 0.014,
      top: isLandscape
        ? getResponsiveSize(12, 14, 16, 18)
        : getResponsiveSize(14, 16, 18, 22),
      padding: width * 0.022,
      zIndex: 1,
      minWidth: getResponsiveSize(40, 44, 46, 48),
      minHeight: getResponsiveSize(40, 44, 46, 48),
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      color: 'white',
      fontSize: getResponsiveSize(16, 18, 19, 22),
      fontWeight: 'bold',
      textAlign: 'left',
      marginTop: 0,
      marginLeft: canGoBack
        ? getResponsiveSize(45, 55, 58, 65)
        : width * 0.097,
      flex: 1,
      textAlignVertical: 'center',
    },
  });

  return (
    <View style={[responsiveHeaderStyles.headerContainer, {backgroundColor: COLORS.secondary}]}>
      {canGoBack && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={responsiveHeaderStyles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} 
        >
          <MaterialIcons 
            name="arrow-back-ios" 
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
    </View>
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
      <ActivityIndicator size="large" color={COLORS.primary} />
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
interface TabBarProps {
  navigation: any;
  currentRoute: string;
}

const GlobalTabBar: React.FC<TabBarProps> = ({ navigation, currentRoute }) => {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();

  // Hide tab bar on these screens
  const hiddenScreens = ['ParkingMap', 'Splash', 'Login', 'RfidTagDetail', 'RfidTagForm'];

  if (hiddenScreens.includes(currentRoute)) {
    return null;
  }

  const tabBarStyles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#333',
        paddingVertical: 15,
        paddingHorizontal: 40,
        marginHorizontal: 40,
        marginBottom: 40,
        borderRadius: 25,
        justifyContent: 'space-between',
        borderWidth: 0,
        shadowColor: 'none',
      },
      tabItem: {
        padding: 10,
        borderRadius: 20,
      },
      activeTab: {
        backgroundColor: COLORS.primary,
      },
  });

  const isActive = (routeName: string) => currentRoute === routeName;

  // Check if current screen is RFID-related (for highlighting RFID tab)
  const isRfidScreen = ['AdminDashboard', 'RfidTagList', 'RfidTagDetail', 'RfidTagForm', 'RfidReaderStatus'].includes(currentRoute);
  const isSecurityScreen = ['SecurityDashboard', 'ScanMonitor', 'AlertsScreen', 'GuestManagement', 'ScanHistory'].includes(currentRoute);

  // Admin role tabs - includes original tabs + RFID Configuration
  if (userRole === 'admin') {
    return (
      <View style={tabBarStyles.tabBar}>
        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('Home') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons
            name={isActive('Home') ? 'home' : 'home-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('ParkingMap') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('ParkingMap', { floor: 1 })}
        >
          <Ionicons
            name={isActive('ParkingMap') ? 'map' : 'map-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        {/* RFID Configuration - NEW for Admin */}
        <TouchableOpacity
          style={[tabBarStyles.tabItem, isRfidScreen && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <Ionicons
            name={isRfidScreen ? 'card' : 'card-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('Feedback') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('Feedback')}
        >
          <Ionicons
            name={isActive('Feedback') ? 'chatbubble' : 'chatbubble-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('Profile') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('Profile', user?.id ? { userId: user.id } : undefined)}
        >
          <Ionicons
            name={isActive('Profile') ? 'person' : 'person-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Security role tabs - includes original tabs + Security Monitor
  if (userRole === 'ssd' || userRole === 'security') {
    return (
      <View style={tabBarStyles.tabBar}>
        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('Home') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons
            name={isActive('Home') ? 'home' : 'home-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('ParkingMap') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('ParkingMap', { floor: 1 })}
        >
          <Ionicons
            name={isActive('ParkingMap') ? 'map' : 'map-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        {/* Security Monitor - NEW for Security */}
        <TouchableOpacity
          style={[tabBarStyles.tabItem, isSecurityScreen && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('SecurityDashboard')}
        >
          <Ionicons
            name={isSecurityScreen ? 'shield' : 'shield-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('Feedback') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('Feedback')}
        >
          <Ionicons
            name={isActive('Feedback') ? 'chatbubble' : 'chatbubble-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[tabBarStyles.tabItem, isActive('Profile') && tabBarStyles.activeTab]}
          onPress={() => navigation.navigate('Profile', user?.id ? { userId: user.id } : undefined)}
        >
          <Ionicons
            name={isActive('Profile') ? 'person' : 'person-outline'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Default user tabs (unchanged)
  return (
    <View style={tabBarStyles.tabBar}>
      <TouchableOpacity
        style={[tabBarStyles.tabItem, isActive('Home') && tabBarStyles.activeTab]}
        onPress={() => navigation.navigate('Home')}
      >
        <Ionicons
          name={isActive('Home') ? 'home' : 'home-outline'}
          size={24}
          color="white"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[tabBarStyles.tabItem, isActive('ParkingMap') && tabBarStyles.activeTab]}
        onPress={() => navigation.navigate('ParkingMap', { floor: 1 })}
      >
        <Ionicons
          name={isActive('ParkingMap') ? 'map' : 'map-outline'}
          size={24}
          color="white"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[tabBarStyles.tabItem, isActive('Feedback') && tabBarStyles.activeTab]}
        onPress={() => navigation.navigate('Feedback')}
      >
        <Ionicons
          name={isActive('Feedback') ? 'chatbubble' : 'chatbubble-outline'}
          size={24}
          color="white"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[tabBarStyles.tabItem, isActive('Profile') && tabBarStyles.activeTab]}
        onPress={() => navigation.navigate('Profile', user?.id ? { userId: user.id } : undefined)}
      >
        <Ionicons
          name={isActive('Profile') ? 'person' : 'person-outline'}
          size={24}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
};

const NavigationWithTabBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState('Home');
  const navigationRef = React.useRef<any>(null);

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        const route = navigationRef.current?.getCurrentRoute();
        if (route) {
          setCurrentRoute(route.name);
        }
      }}
    >
      <View style={{ flex: 1}}>
        {children}
         <View style={{ backgroundColor: 'transparent'}}>
        {navigationRef.current && (
          <GlobalTabBar 
            navigation={navigationRef.current} 
            currentRoute={currentRoute}
          />
        )}
        </View>
      </View>
    </NavigationContainer>
  );
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const userRole = user?.role?.toLowerCase();

  // Determine initial route - all authenticated users start at Home
  const getInitialRoute = () => {
    if (!isAuthenticated) return 'Splash';
    return 'Home';
  };

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
    <NavigationWithTabBar>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={COLORS.secondary}
        translucent={true}
      />
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: true,
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
                headerShown: false,
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
                headerShown: false,
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
                headerShown: false,
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

            {/* Admin Screens */}
            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboard}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="RfidTagList"
              component={RfidTagListScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="RfidTagDetail"
              component={RfidTagDetailScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="RfidTagForm"
              component={RfidTagFormScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="RfidReaderStatus"
              component={RfidReaderStatusScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />

            {/* Security Screens */}
            <Stack.Screen
              name="SecurityDashboard"
              component={SecurityDashboard}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="ScanMonitor"
              component={ScanMonitorScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="AlertsScreen"
              component={AlertsScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="GuestManagement"
              component={GuestManagementScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="ScanHistory"
              component={ScanHistoryScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationWithTabBar>
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