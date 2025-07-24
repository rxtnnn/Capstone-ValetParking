import { Platform } from 'react-native';

export interface DeviceInformation {
  platform: string;
  version: string;
  model: string;
  systemVersion?: string;
  appVersion?: string;
  buildNumber?: string;
}

const safeToString = (value: any): string => {
  if (value === null || value === undefined) return 'Unknown';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  try {
    return String(value);
  } catch {
    return 'Unknown';
  }
};

export const getBasicDeviceInfo = async (): Promise<DeviceInformation> => {
  try {
    const platformVersion = safeToString(Platform.Version);
    const platformOS = Platform.OS || 'unknown';
    
    const deviceInfo: DeviceInformation = {
      platform: platformOS,
      version: platformVersion,
      model: platformOS === 'ios' ? 'iOS Device' : 'Android Device',
      systemVersion: platformVersion,
      appVersion: '1.0.0',
      buildNumber: '1',
    };

    console.log('📱 Device info:', deviceInfo);
    return deviceInfo;
  } catch (error) {
    console.error('⚠️ Device info error:', error);
    
    return {
      platform: 'unknown',
      version: 'unknown',
      model: 'Unknown Device',
      systemVersion: 'unknown',
      appVersion: '1.0.0',
      buildNumber: '1',
    };
  }
};