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
  // Base
  baseUrl: 'https://valet.up.railway.app/api',

  // Auth
  login: '/login',
  logout: '/logout',
  changePassword: '/change-password',

  // User
  user: '/user',
  users: '/users',
  pushToken: '/user/push-token',

  // Feedback
  feedbacks: '/feedbacks',
  feedbackById: (id: number) => `/feedbacks/${id}`,

  // Parking (public)
  publicParking: '/public/parking',
  publicParkingMap: '/public/parking/map',
  publicParkingDashboard: '/public/parking/dashboard',
  parkingMalfunction: (spaceId: number) => `/parking/${spaceId}/malfunction`,

  // Parking config (public)
  parkingConfig: (locationId: number | string) => `/public/parking-config/${locationId}`,

  // rfid (public)
  publicRfidScans: '/public/rfid/scans',
  publicRfidVerify: '/public/rfid/verify',
  publicRfidExit: '/public/rfid/exit',
  publicRfidParked: '/public/rfid/parked',
  publicGuestVerify: '/public/guest/verify',
  publicVerifyVehicle: '/public/verify-vehicle',

  // rfid tags (admin)
  publicRfidTags: '/public/rfid/tags',
  rfidTags: '/rfid/tags',
  rfidTagById: (id: number) => `/rfid/tags/${id}`,
  rfidTagByUid: (uid: string) => `/rfid/tags/uid/${uid}`,
  rfidTagDeactivate: (id: number) => `/rfid/tags/${id}/deactivate`,

  // rfid readers (admin)
  rfidReaders: '/rfid/readers',
  rfidReaderById: (id: number) => `/rfid/readers/${id}`,
  rfidReaderRestart: (id: number) => `/rfid/readers/${id}/restart`,

  // Guest Access
  guestAccess: '/guest-access',
  guestAccessVerify: (plate: string) => `/guest-access/verify/${encodeURIComponent(plate)}`,
  guestAccessById: (id: number) => `/guest-access/${id}`,

  // Incidents (security)
  incidents: '/incidents',
  incidentById: (id: number) => `/incidents/${id}`,
};

export const API_TOKEN = '1|DTEamW7nsL5lilUBDHf8HsPG13W7ue4wBWj8FzEQ2000b6ad';

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
