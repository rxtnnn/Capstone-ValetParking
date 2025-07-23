import { Platform } from 'react-native';

export interface DeviceInformation {
  platform: string;
  version: string;
  model: string;
  systemVersion?: string;
  appVersion?: string;
  buildNumber?: string;
}

// Helper function to safely convert values to strings
const safeToString = (value: any): string => {
  if (value === null || value === undefined) {
    return 'Unknown';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'object' && value.toString) {
    try {
      return value.toString();
    } catch (error) {
      return 'Unknown';
    }
  }
  
  return String(value);
};

// Simplified version without react-native-device-info dependency
export const getBasicDeviceInfo = async (): Promise<DeviceInformation> => {
  try {
    // Safely get platform version
    const platformVersion = safeToString(Platform.Version);
    
    return {
      platform: Platform.OS || 'unknown',
      version: platformVersion,
      model: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      systemVersion: platformVersion,
      appVersion: '1.0.0', // You can get this from your package.json
      buildNumber: '1',
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    
    // Fallback with safe defaults
    return {
      platform: Platform.OS || 'unknown',
      version: 'Unknown',
      model: 'Unknown Device',
      systemVersion: 'Unknown',
      appVersion: '1.0.0',
      buildNumber: '1',
    };
  }
};