import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';

const { height: H } = Dimensions.get('window');

// Map each feature to its highlights shown in the gate
const FEATURE_MAP: Record<string, { emoji: string; highlights: string[] }> = {
  'AI Health Coach': {
    emoji: '🤖',
    highlights: [
      'Unlimited AI coaching sessions',
      'Personalised health advice',
      'Meal & workout guidance',
    ],
  },
  'Meal Planner': {
    emoji: '🥗',
    highlights: [
      'Goal-based ISSN nutrition plans',
      'Custom calorie & macro targets',
      'Weekly meal schedules',
    ],
  },
  'Barcode Food Scanner': {
    emoji: '📷',
    highlights: [
      'Scan any food barcode instantly',
      '2M+ products in database',
      'Auto-log calories & macros',
    ],
  },
  'Workout Programs': {
    emoji: '📋',
    highlights: [
      'PPL · 5×5 · Full Body · HIIT',
      'Structured week-by-week plans',
      'Follow a proven program',
    ],
  },
  'Weekly Report Card': {
    emoji: '📊',
    highlights: [
      'Shareable weekly progress summary',
      'Streak & badge tracking',
      'Grade your week A–D',
    ],
  },
};

const ALL_PREMIUM = [
  { emoji: '🤖', label: 'AI Health Coach' },
  { emoji: '🥗', label: 'Meal Planner' },
  { emoji: '📷', label: 'Barcode Scanner' },
  { emoji: '📋', label: 'Workout Programs' },
  { emoji: '📊', label: 'Weekly Report' },
  { emoji: '📈', label: 'Advanced Stats' },
  { emoji: '🔔', label: 'Smart Notifications' },
  { emoji: '🎯', label: 'Unlimited Goals' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function PremiumGate({ visible, onClose, featureName }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  // eslint-disable-next-line react-hooks/refs
  const slideY = useRef(new Animated.Value(H)).current;
  // eslint-disable-next-line react-hooks/refs
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 13, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: H, duration: 260, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const feature = featureName ? FEATURE_MAP[featureName] : null;

  const goToPaywall = () => {
    onClose();
    setTimeout(() => navigation.navigate('Paywall'), 300);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdrop }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          s.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideY }] },
        ]}
      >
        {/* Handle */}
        <View style={s.handle} />

        {/* Feature hero */}
        <View style={s.heroRow}>
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroIcon}
          >
            <Text style={{ fontSize: 28 }}>{feature?.emoji ?? '👑'}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>{featureName ?? 'Nexara Premium'}</Text>
            <Text style={s.heroSub}>Premium feature · Unlock with one plan</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Feature-specific highlights */}
        {feature && (
          <View style={s.highlightBox}>
            {feature.highlights.map((h, i) => (
              <View key={i} style={s.highlightRow}>
                <View style={s.highlightDot} />
                <Text style={s.highlightTxt}>{h}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All premium chips */}
        <Text style={s.allLabel}>Everything in Premium</Text>
        <View style={s.chipGrid}>
          {ALL_PREMIUM.map((f, i) => (
            <View
              key={i}
              style={[
                s.chip,
                featureName ===
                  f.label
                    .replace('Barcode Scanner', 'Barcode Food Scanner')
                    .replace('Weekly Report', 'Weekly Report Card')
                    .replace('Advanced Stats', 'Advanced Body Stats')
                    .replace('Smart Notifications', 'Smart Notifications')
                    .replace('Unlimited Goals', 'Unlimited Goals') && s.chipActive,
              ]}
            >
              <Text style={{ fontSize: 13 }}>{f.emoji}</Text>
              <Text style={s.chipTxt}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Pricing row */}
        <View style={s.pricingRow}>
          <View style={s.priceBox}>
            <Text style={s.priceName}>Monthly</Text>
            <Text style={s.priceVal}>
              $9.99<Text style={s.pricePer}>/mo</Text>
            </Text>
          </View>
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.priceBoxActive}
          >
            <View style={s.saveBadge}>
              <Text style={s.saveBadgeTxt}>BEST VALUE</Text>
            </View>
            <Text style={[s.priceName, { color: 'rgba(255,255,255,0.7)' }]}>Yearly</Text>
            <Text style={[s.priceVal, { color: '#fff' }]}>
              $59.99<Text style={[s.pricePer, { color: 'rgba(255,255,255,0.55)' }]}>/yr</Text>
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.6)',
                marginTop: 2,
                fontWeight: '600',
              }}
            >
              Save 50% · just $5/mo
            </Text>
          </LinearGradient>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={goToPaywall}
          activeOpacity={0.88}
          style={{ borderRadius: RADIUS.full, overflow: 'hidden', marginTop: 14 }}
        >
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.ctaBtn}
          >
            <Text style={s.ctaTxt}>View Plans & Unlock All Features</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={s.skipBtn}>
          <Text style={s.skipTxt}>Maybe later</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 18,
  },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  heroSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeX: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },

  highlightBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  highlightDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#7C3AED' },
  highlightTxt: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },

  allLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' },
  chipTxt: { fontSize: 11, fontWeight: '600', color: COLORS.text },

  pricingRow: { flexDirection: 'row', gap: 10 },
  priceBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  priceBoxActive: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  saveBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
  },
  saveBadgeTxt: { fontSize: 8, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  priceName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priceVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  pricePer: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted },

  ctaBtn: { paddingVertical: 16, alignItems: 'center' },
  ctaTxt: { fontSize: 15, fontWeight: '900', color: '#fff' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
});
