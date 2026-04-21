import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#6C63FF',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  secondary: {
    backgroundColor: '#EEF0FF',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
  },
  danger: {
    backgroundColor: '#FF6584',
    shadowColor: '#FF6584',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sm: { paddingVertical: 8, paddingHorizontal: 16 },
  md: { paddingVertical: 13, paddingHorizontal: 24 },
  lg: { paddingVertical: 16, paddingHorizontal: 32, width: '100%' },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  primaryText: { color: '#fff' },
  secondaryText: { color: '#6C63FF' },
  ghostText: { color: '#8898AA' },
  dangerText: { color: '#fff' },
} as any);
