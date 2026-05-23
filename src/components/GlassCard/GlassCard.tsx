import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../utils/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  radius?: number;
  glow?: string;
};

const GlassCard: React.FC<Props> = ({
  children,
  style,
  padding = 18,
  radius = RADIUS.lg,
  glow,
}) => (
  <View
    style={[
      s.card,
      { padding, borderRadius: radius },
      glow && {
        shadowColor: glow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 10,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
});

export default GlassCard;
