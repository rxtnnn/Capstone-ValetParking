import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS } from '../../constants/AppConst';

interface GridLineStyle extends ViewStyle {
  position: 'absolute';
  backgroundColor: string;
}
export const createGridLineStyle = (dimensions: {
  left: number;
  top: number;
  width: number;
  height: number;
}): ViewStyle => ({
  ...mapLayoutStyles.gridLine,
  ...dimensions,
});

export const SPOT_DIVIDER = {
  // Section A
  sectionA: [
    { left: 690, top: 110, width: 44, height: 2 },
    { left: 690, top: 170, width: 44, height: 2 },
  ],
  
  // Section B - Horizontal
  sectionBHorizontal: [
    { left: 498, top: 30, width: 180, height: 2 },
    { left: 498, top: 90, width: 180, height: 2 },
  ],
  
  // Section B - Vertical
  sectionBVertical: [
    { left: 540, top: 30, width: 2, height: 59 },
    { left: 585, top: 30, width: 2, height: 59 },
    { left: 630, top: 30, width: 2, height: 59 },
  ],
  
  // Section C
  sectionC: [
    { left: 439, top: 100, width: 2, height: 100 },
    { left: 497, top: 98, width: 2, height: 100 },
    { left: 440, top: 155, width: 58, height: 2 },
  ],
  
  // Section D - Horizontal
  sectionDHorizontal: [
    { left: 100, top: 198, width: 335, height: 2 },
    { left: 100, top: 257, width: 335, height: 2 },
  ],
  
  // Section D - Vertical
  sectionDVertical: [
    { left: 150, top: 198, width: 2, height: 59 },
    { left: 205, top: 198, width: 2, height: 59 },
    { left: 250, top: 198, width: 2, height: 59 },
    { left: 305, top: 198, width: 2, height: 59 },
    { left: 350, top: 198, width: 2, height: 59 },
    { left: 395, top: 198, width: 2, height: 59 },
  ],
   // Section E
  sectionE: [
    { left: 53, top: 313, width: 2, height: 205 },
    { left: 112, top: 313, width: 2, height: 205 },
    { left: 53, top: 375, width: 59, height: 2 },
    { left: 53, top: 440, width: 59, height: 2 },
  ],
  
  // Section F - Horizontal
  sectionFHorizontal: [
    { left: 115, top: 518, width: 330, height: 2 },
    { left: 115, top: 577, width: 330, height: 2 },
  ],
  
  // Section F - Vertical
  sectionFVertical: [
    { left: 160, top: 518, width: 2, height: 59 },
    { left: 215, top: 518, width: 2, height: 59 },
    { left: 260, top: 518, width: 2, height: 59 },
    { left: 305, top: 518, width: 2, height: 59 },
    { left: 360, top: 518, width: 2, height: 59 },
    { left: 405, top: 518, width: 2, height: 59 },
  ],
  
  // Section G - Vertical
  sectionGVertical: [
    { left: 498, top: 588, width: 2, height: 305 },
    { left: 542, top: 588, width: 2, height: 305 },
  ],
  
  // Section G - Horizontal
  sectionGHorizontal: [
    { left: 498, top: 645, width: 44, height: 2 },
    { left: 498, top: 705, width: 44, height: 2 },
    { left: 498, top: 765, width: 44, height: 2 },
    { left: 498, top: 825, width: 44, height: 2 },
  ],
  
  // Section I - Vertical
  sectionIVertical: [
    { left: 678, top: 588, width: 2, height: 305 },
    { left: 722, top: 588, width: 2, height: 305 },
  ],
  
  // Section I - Horizontal
  sectionIHorizontal: [
    { left: 678, top: 645, width: 44, height: 2 },
    { left: 678, top: 705, width: 44, height: 2 },
    { left: 678, top: 765, width: 44, height: 2 },
    { left: 678, top: 825, width: 44, height: 2 },
  ],
  
  // Section H - Horizontal
  sectionHHorizontal: [
    { left: 545, top: 890, width: 135, height: 2 },
    { left: 550, top: 947, width: 135, height: 2 },
  ],
  
  // Section H - Vertical
  sectionHVertical: [
    { left: 600, top: 890, width: 2, height: 59 },
    { left: 645, top: 890, width: 2, height: 59 },
  ],
   // Section J - Horizontal
  sectionJHorizontal: [
    { left: 270, top: 368, width: 250, height: 2 },
    { left: 270, top: 427, width: 250, height: 2 },
  ],
  
  // Section J - Vertical
  sectionJVertical: [
    { left: 310, top: 368, width: 2, height: 59 },
    { left: 370, top: 368, width: 2, height: 59 },
    { left: 430, top: 368, width: 2, height: 59 },
    { left: 485, top: 368, width: 2, height: 59 },
  ],
  
};

export const mapLayoutStyles = StyleSheet.create({
  gridLine: {
    position: 'absolute',
    backgroundColor: '#fff',
  } as GridLineStyle,
  
  spotContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  spotContent: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  spotText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 18,
    fontFamily: FONTS.semiBold,
  } as TextStyle,
  
  highlightRing: {
    position: 'absolute',
    borderWidth: 4,
    transform: [{ rotate: '0deg' }],
  },
  navigationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  navigationLine: {
    position: 'absolute',
    height: 6,
    backgroundColor: COLORS.green,
    borderRadius: 3,
    zIndex: 100,
  },
  waypointDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
  },
  
  startPoint: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: COLORS.green,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 102,
    borderWidth: 3,
    borderColor: 'white',
  },
  
  endPoint: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: COLORS.green,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 102,
    borderWidth: 3,
    borderColor: 'white',
  },
});
