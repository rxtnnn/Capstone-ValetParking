// src/constants/AppConst.ts
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';

export const COLORS = {
  primary: '#B22020',
  secondary: '#4C0E0E',
  buttons: '#C53030',
  limited: '#FF9801',
  green: '#48D666',
  blue: '#2196F3'
};

export const API_ENDPOINTS = {
  login: '/api/auth/login',
  baseUrl: 'https://valet.up.railway.app/api',
  userUrl: 'https://valet.up.railway.app/api/public/users',
};

export const FONTS = {
  regular: 'Poppins_400Regular',
  semiBold: 'Poppins_600SemiBold',
};

export const useAppFonts = () => {
  const [areFontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });
  return areFontsLoaded;
};
