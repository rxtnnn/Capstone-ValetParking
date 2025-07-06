import { Platform } from 'react-native';

export interface DeviceInformation {
  platform: string;
  version: string;
  model: string;
  systemVersion?: string;
  appVersion?: string;
  buildNumber?: string;
}

// Simplified version without react-native-device-info dependency
export const getBasicDeviceInfo = async (): Promise<DeviceInformation> => {
  try {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      systemVersion: Platform.Version.toString(),
      appVersion: '1.0.0', // You can get this from your package.json
      buildNumber: '1',
    };
  } catch (error) {
    console.log('Error getting device info:', error);
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: 'Unknown Device',
      systemVersion: 'Unknown',
      appVersion: '1.0.0',
      buildNumber: '1',
    };
  }
};

// If you want to use react-native-device-info later, install it and use this:
/*
import DeviceInfo from 'react-native-device-info';

export const getDetailedDeviceInfo = async (): Promise<DeviceInformation> => {
  try {
    const [model, systemVersion, appVersion, buildNumber] = await Promise.all([
      DeviceInfo.getModel(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getVersion(),
      DeviceInfo.getBuildNumber(),
    ]);

    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model,
      systemVersion,
      appVersion,
      buildNumber,
    };
  } catch (error) {
    console.log('Error getting detailed device info:', error);
    return getBasicDeviceInfo();
  }
};
*/