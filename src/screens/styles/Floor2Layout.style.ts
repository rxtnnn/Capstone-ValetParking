import { StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../constants/AppConst';

export const styles = StyleSheet.create({
  // Road layouts
  roadHorizontalTop: {
    position: 'absolute',
    left: 60,
    top: 110,
    width: 680,
    height: 45,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  roadHorizontalMiddle: {
    position: 'absolute',
    left: 100,
    top: 350,
    width: 640,
    height: 45,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  roadHorizontalBottom: {
    position: 'absolute',
    left: 120,
    top: 580,
    width: 570,
    height: 45,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  roadVerticalLeft: {
    position: 'absolute',
    left: 30,
    top: 110,
    width: 45,
    height: 520,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  roadVerticalCenter: {
    position: 'absolute',
    left: 450,
    top: 110,
    width: 45,
    height: 520,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  roadVerticalRight: {
    position: 'absolute',
    left: 710,
    top: 110,
    width: 45,
    height: 520,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: '#FFD700',
  },

  // Parking sections
  sectionA: {
    position: 'absolute',
    left: 90,
    top: 30,
    flexDirection: 'row',
    gap: 8,
  },
  
  sectionB: {
    position: 'absolute',
    left: 270,
    top: 30,
    flexDirection: 'row',
    gap: 8,
  },
  
  sectionC: {
    position: 'absolute',
    left: 530,
    top: 165,
    flexDirection: 'column',
    gap: 8,
  },
  
  sectionD: {
    position: 'absolute',
    left: 640,
    top: 165,
    flexDirection: 'column',
    gap: 8,
  },
  
  sectionE: {
    position: 'absolute',
    left: 520,
    top: 640,
    flexDirection: 'row',
    gap: 8,
  },
  
  sectionF: {
    position: 'absolute',
    left: 280,
    top: 640,
    flexDirection: 'row',
    gap: 8,
  },
  
  sectionG: {
    position: 'absolute',
    left: 90,
    top: 400,
    flexDirection: 'column',
    gap: 8,
  },
  
  sectionH: {
    position: 'absolute',
    left: 160,
    top: 440,
    flexDirection: 'column',
    gap: 8,
  },

  // Parking spot styles
  parkingSpotHorizontal: {
    width: 40,
    height: 55,
    backgroundColor: '#2d5016',
    borderWidth: 2,
    borderColor: '#4a7c2a',
    borderRadius: 4,
  },
  
  parkingSpotVertical: {
    width: 55,
    height: 40,
    backgroundColor: '#2d5016',
    borderWidth: 2,
    borderColor: '#4a7c2a',
    borderRadius: 4,
  },

  // Building outlines
  buildingOutline1: {
    position: 'absolute',
    left: 80,
    top: 170,
    width: 350,
    height: 160,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#555',
  },
  
  buildingOutline2: {
    position: 'absolute',
    left: 510,
    top: 30,
    width: 220,
    height: 100,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#555',
  },
  
  buildingOutline3: {
    position: 'absolute',
    left: 170,
    top: 410,
    width: 260,
    height: 150,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#555',
  },
  
  buildingOutline4: {
    position: 'absolute',
    left: 510,
    top: 410,
    width: 180,
    height: 150,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#555',
  },

  // Elevators
  elevator1: {
    position: 'absolute',
    left: 150,
    top: 210,
    backgroundColor: '#d5d821ff',
    padding: 10,
    borderRadius: 4,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  elevator2: {
    position: 'absolute',
    left: 300,
    top: 450,
    backgroundColor: '#d5d821ff',
    padding: 8,
    borderRadius: 4,
    width: 85,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  elevator3: {
    position: 'absolute',
    left: 570,
    top: 460,
    backgroundColor: '#d5d821ff',
    padding: 10,
    borderRadius: 4,
    width: 85,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{rotate: '90deg'}]
  },
  
  elevatorText: {
    color: 'black',
    fontSize: 9,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
  },

  // Stairs
  stairs: {
    position: 'absolute',
    left: 30,
    top: 200,
    backgroundColor: '#d5d821ff',
    padding: 8,
    borderRadius: 4,
    width: 80,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-90deg'}]
  },
  
  stairsText: {
    color: 'black',
    fontSize: 9,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },

  // Entrance
  entrance: {
    position: 'absolute',
    left: 350,
    top: 700,
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 4,
    width: 90,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  entranceText: {
    color: 'white',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },

  // Exit sign
  exitSign: {
    position: 'absolute',
    left: 680,
    top: 300,
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 4,
    width: 100,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  exitText: {
    color: 'white',
    fontSize: 24,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
  },
});