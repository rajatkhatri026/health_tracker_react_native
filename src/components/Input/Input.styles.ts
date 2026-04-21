import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    paddingHorizontal: 16,
    height: 56,
  },
  disabled: { opacity: 0.6 },
  errorBorder: { borderColor: '#FF6584', borderWidth: 1.5 },
  icon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1A1A2E', fontWeight: '500' },
  error: { fontSize: 12, color: '#FF6584', fontWeight: '500' },
});
