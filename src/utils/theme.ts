// Dark Premium Glassmorphism Theme
export const COLORS = {
  // Backgrounds
  bg: '#0A0E27',
  bgCard: 'rgba(255,255,255,0.07)',
  bgCardHover: 'rgba(255,255,255,0.12)',
  bgInput: 'rgba(255,255,255,0.06)',

  // Borders
  border: 'rgba(255,255,255,0.12)',
  borderLight: 'rgba(255,255,255,0.07)',

  // Brand gradients
  gradPrimary: ['#7C3AED', '#06B6D4'] as const,
  gradSecondary: ['#F59E0B', '#EF4444'] as const,
  gradGreen: ['#10B981', '#34D399'] as const,
  gradPink: ['#EC4899', '#F43F5E'] as const,
  gradBlue: ['#3B82F6', '#06B6D4'] as const,

  // Solids
  primary: '#7C3AED',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  green: '#10B981',
  pink: '#EC4899',
  blue: '#3B82F6',
  red: '#EF4444',

  // Text
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',

  // Glow shadows
  glowPurple: '#7C3AED',
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
};

export const glowShadow = (color: string, intensity = 0.4) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: intensity,
  shadowRadius: 20,
  elevation: 10,
});
