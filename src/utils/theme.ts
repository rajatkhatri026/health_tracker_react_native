// Light Premium Theme
export const COLORS = {
  // Backgrounds
  bg: '#F4F5FA',
  bgCard: '#FFFFFF',
  bgCardHover: '#F9F9FF',
  bgInput: '#F3F4F8',

  // Borders
  border: '#E4E7F0',
  borderLight: '#EEF0F8',

  // Brand gradients
  gradPrimary: ['#0891B2', '#06B6D4'] as const,
  gradSecondary: ['#F59E0B', '#EF4444'] as const,
  gradGreen: ['#10B981', '#34D399'] as const,
  gradPink: ['#EC4899', '#F43F5E'] as const,
  gradBlue: ['#3B82F6', '#06B6D4'] as const,

  // Solids
  primary: '#0891B2',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  green: '#10B981',
  pink: '#EC4899',
  blue: '#3B82F6',
  red: '#EF4444',

  // Text
  text: '#0F0F1A',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',

  // Tinted backgrounds (light tints for cards/badges)
  tintPurple: '#E0F7FA',
  tintCyan: '#ECFEFF',
  tintGreen: '#D1FAE5',
  tintAmber: '#FEF3C7',
  tintPink: '#FCE7F3',
  tintBlue: '#DBEAFE',
  tintRed: '#FEE2E2',

  // Glow shadows
  glowPurple: '#0891B2',
  glowCyan: '#06B6D4',
  glowGreen: '#10B981',
  glowAmber: '#F59E0B',
  glowPink: '#EC4899',
};

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  full: 999,
};

export const glassStyle = {
  backgroundColor: COLORS.bgCard,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: RADIUS.lg,
  shadowColor: '#0891B2',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 4,
};

export const glowShadow = (color: string, intensity = 0.4) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: intensity,
  shadowRadius: 20,
  elevation: 10,
});
