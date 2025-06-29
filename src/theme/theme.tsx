// src/theme/theme.ts
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// VALET Color Palette - Based on your UI design
export const VALETColors = {
  // Primary VALET Red (from your design)
  primary: '#B71C1C',           // Main red color
  primaryDark: '#8B0000',       // Darker red for pressed states
  primaryLight: '#D32F2F',      // Lighter red for hover states
  primaryContainer: '#FFEBEE',  // Very light red background
  
  // Secondary colors
  secondary: '#D32F2F',         // Secondary red
  secondaryDark: '#B71C1C',     // Darker secondary
  secondaryLight: '#F44336',    // Lighter secondary
  secondaryContainer: '#FFCDD2', // Light secondary background
  
  // Status colors
  success: '#4CAF50',           // Green for available spots
  warning: '#FF9800',           // Orange for limited spots
  error: '#F44336',             // Red for errors/full spots
  info: '#2196F3',              // Blue for information
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Gray scale
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Background colors
  background: '#F5F5F5',        // Main background
  surface: '#FFFFFF',           // Card surfaces
  surfaceVariant: '#F8F9FA',    // Alternate surfaces
  
  // Text colors
  onPrimary: '#FFFFFF',         // Text on primary color
  onSecondary: '#FFFFFF',       // Text on secondary color
  onBackground: '#212121',      // Text on background
  onSurface: '#212121',         // Text on surfaces
  onError: '#FFFFFF',           // Text on error color
  
  // Border and divider colors
  border: '#E0E0E0',
  divider: '#E0E0E0',
  
  // Special VALET colors
  parking: {
    available: '#4CAF50',       // Green for available spots
    occupied: '#F44336',        // Red for occupied spots
    reserved: '#FF9800',        // Orange for reserved spots
    disabled: '#9E9E9E',        // Gray for disabled spots
  },
  
  floor: {
    floor1: '#2196F3',          // Blue for 1st floor
    floor2: '#4CAF50',          // Green for 2nd floor
    floor3: '#FF9800',          // Orange for 3rd floor
  },
  
  status: {
    online: '#4CAF50',          // Green for online status
    offline: '#F44336',         // Red for offline status
    loading: '#FF9800',         // Orange for loading status
  },
};

// Light Theme (Default)
export const VALETLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: VALETColors.primary,
    primaryContainer: VALETColors.primaryContainer,
    secondary: VALETColors.secondary,
    secondaryContainer: VALETColors.secondaryContainer,
    tertiary: VALETColors.info,
    tertiaryContainer: '#E3F2FD',
    surface: VALETColors.surface,
    surfaceVariant: VALETColors.surfaceVariant,
    background: VALETColors.background,
    error: VALETColors.error,
    errorContainer: '#FFEBEE',
    onPrimary: VALETColors.onPrimary,
    onPrimaryContainer: VALETColors.primary,
    onSecondary: VALETColors.onSecondary,
    onSecondaryContainer: VALETColors.secondary,
    onTertiary: VALETColors.white,
    onTertiaryContainer: VALETColors.info,
    onSurface: VALETColors.onSurface,
    onSurfaceVariant: VALETColors.gray700,
    onBackground: VALETColors.onBackground,
    onError: VALETColors.onError,
    onErrorContainer: VALETColors.error,
    outline: VALETColors.border,
    outlineVariant: VALETColors.gray300,
    inverseSurface: VALETColors.gray800,
    inverseOnSurface: VALETColors.white,
    inversePrimary: VALETColors.primaryLight,
    shadow: VALETColors.black,
    scrim: VALETColors.black,
    surfaceDisabled: 'rgba(33, 33, 33, 0.12)',
    onSurfaceDisabled: 'rgba(33, 33, 33, 0.38)',
    backdrop: 'rgba(66, 66, 66, 0.4)',
  },
};

// Dark Theme (Optional)
export const VALETDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: VALETColors.primaryLight,
    primaryContainer: VALETColors.primaryDark,
    secondary: VALETColors.secondaryLight,
    secondaryContainer: VALETColors.secondaryDark,
    tertiary: '#64B5F6',
    tertiaryContainer: '#1976D2',
    surface: '#1E1E1E',
    surfaceVariant: '#2E2E2E',
    background: '#121212',
    error: VALETColors.error,
    errorContainer: '#B00020',
    onPrimary: VALETColors.black,
    onPrimaryContainer: VALETColors.white,
    onSecondary: VALETColors.black,
    onSecondaryContainer: VALETColors.white,
    onTertiary: VALETColors.black,
    onTertiaryContainer: VALETColors.white,
    onSurface: VALETColors.white,
    onSurfaceVariant: '#C7C7C7',
    onBackground: VALETColors.white,
    onError: VALETColors.white,
    onErrorContainer: VALETColors.white,
    outline: '#6F6F6F',
    outlineVariant: '#404040',
    inverseSurface: VALETColors.gray100,
    inverseOnSurface: VALETColors.gray900,
    inversePrimary: VALETColors.primary,
    shadow: VALETColors.black,
    scrim: VALETColors.black,
    surfaceDisabled: 'rgba(255, 255, 255, 0.12)',
    onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
};

// Typography Scale
export const VALETTypography = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontWeight: '400' as const,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
  },
};

// Spacing Scale
export const VALETSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius Scale
export const VALETBorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 50,
  circular: 9999,
};

// Elevation/Shadow Scale
export const VALETElevation = {
  level0: {
    shadowColor: VALETColors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: VALETColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  level2: {
    shadowColor: VALETColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  level3: {
    shadowColor: VALETColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  level4: {
    shadowColor: VALETColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  level5: {
    shadowColor: VALETColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
};

// Component-specific styles
export const VALETComponentStyles = {
  card: {
    backgroundColor: VALETColors.surface,
    borderRadius: VALETBorderRadius.md,
    ...VALETElevation.level2,
  },
  button: {
    primary: {
      backgroundColor: VALETColors.primary,
      borderRadius: VALETBorderRadius.sm,
    },
    secondary: {
      backgroundColor: VALETColors.secondary,
      borderRadius: VALETBorderRadius.sm,
    },
  },
  input: {
    borderColor: VALETColors.border,
    borderRadius: VALETBorderRadius.sm,
    backgroundColor: VALETColors.surface,
  },
  header: {
    backgroundColor: VALETColors.primary,
    ...VALETElevation.level4,
  },
};

// Default theme export (Light theme)
export const theme = VALETLightTheme;

// Theme utilities
export const getThemeColor = (colorName: keyof typeof VALETColors) => {
  return VALETColors[colorName];
};

export const getParkingStatusColor = (status: 'available' | 'occupied' | 'reserved' | 'disabled') => {
  return VALETColors.parking[status];
};

export const getFloorColor = (floor: 1 | 2 | 3) => {
  const floorKey = `floor${floor}` as keyof typeof VALETColors.floor;
  return VALETColors.floor[floorKey];
};

export const getStatusColor = (status: 'online' | 'offline' | 'loading') => {
  return VALETColors.status[status];
};

// Export everything
export default {
  VALETColors,
  VALETLightTheme,
  VALETDarkTheme,
  VALETTypography,
  VALETSpacing,
  VALETBorderRadius,
  VALETElevation,
  VALETComponentStyles,
  theme,
  getThemeColor,
  getParkingStatusColor,
  getFloorColor,
  getStatusColor,
};