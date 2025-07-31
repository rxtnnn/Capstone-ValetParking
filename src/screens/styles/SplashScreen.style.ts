import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  image:{
    width: 400,
    height: 400,
    alignItems: 'flex-start',
  },
  logo:{
    width:100,
    height: 100,
    borderRadius: 20,
  },
  logoSection: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logoHere: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  appName: {
    fontSize: 36,
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold'
  },
  tagline: {
    fontSize: 18,
    color: 'black',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular'
  },
  indicatorContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  firstDot: {
    backgroundColor: '#DC2626',
    width: 15,
  },
  secDot: {
    backgroundColor: '#DC2626',
    width: 50
  },
  exploreButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  exploreButtonArrow: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});