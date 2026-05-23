/* eslint-disable react-hooks/refs */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';
import { useAuth } from '../../context/AuthContext';
import { setPremiumStatus } from '../../hooks/usePremium';
import PaymentModal from '../../components/PaymentModal/PaymentModal';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 20 * 2 - 12) / 2;

function detectCurrency(): 'INR' | 'USD' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta') ? 'INR' : 'USD';
  } catch {
    return 'USD';
  }
}

const PRICES = {
  INR: {
    monthly: { label: '₹499', per: '/month', save: 'Flexible' },
    yearly: { label: '₹2,999', per: '/year', save: 'Save 50%' },
  },
  USD: {
    monthly: { label: '$5.99', per: '/month', save: 'Flexible' },
    yearly: { label: '$35.99', per: '/year', save: 'Save 50%' },
  },
};

const PREMIUM_FEATURES = [
  { emoji: '🤖', title: 'AI Health Coach', sub: 'Unlimited personal AI coaching & guidance' },
  { emoji: '🥗', title: 'Meal Planner', sub: 'Goal-based ISSN nutrition plans' },
  {
    emoji: '📷',
    title: 'Barcode Food Scanner',
    sub: 'Scan any barcode for instant nutrition data',
  },
  { emoji: '📋', title: 'Workout Programs', sub: 'PPL · 5×5 · Full Body · HIIT structured plans' },
  { emoji: '📊', title: 'Weekly Report Card', sub: 'Shareable progress summary with badges' },
  { emoji: '📈', title: 'Advanced Body Stats', sub: 'Body fat % · ideal weight · trend charts' },
  {
    emoji: '🔔',
    title: 'Smart Notifications',
    sub: 'Water reminders · daily brief · evening recap',
  },
  { emoji: '🎯', title: 'Unlimited Goals', sub: 'Free users are limited to 3 active goals' },
];

const FREE_FEATURES = [
  { emoji: '👟', title: 'Steps & Activity' },
  { emoji: '💧', title: 'Water Tracking' },
  { emoji: '😴', title: 'Sleep Log' },
  { emoji: '🔥', title: 'Calorie Logging' },
  { emoji: '⚖️', title: 'Weight Log' },
  { emoji: '🏋️', title: 'Workout Log' },
  { emoji: '⏱️', title: 'Fasting Timer' },
  { emoji: '💪', title: 'Exercise Library' },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const currency = useMemo(() => detectCurrency(), []);
  const prices = PRICES[currency];

  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');
  const [paymentVisible, setPaymentVisible] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 70, friction: 13, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePurchase = () => setPaymentVisible(true);

  const handlePaymentSuccess = async (plan: 'monthly' | 'yearly') => {
    setPaymentVisible(false);
    await setPremiumStatus(true);
    nav.goBack();
  };

  const activePrice = prices[selected];
  const ctaLabel = `Start Premium · ${activePrice.label}${activePrice.per}`;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={['#3B0FA0', '#6D28D9', '#9333EA', '#C4B5FD', COLORS.bg]}
          locations={[0, 0.3, 0.55, 0.8, 1]}
          style={[st.hero, { paddingTop: insets.top + 6 }]}
        >
          {/* Close */}
          <TouchableOpacity onPress={() => nav.goBack()} style={st.closeBtn} activeOpacity={0.8}>
            <Text style={st.closeX}>✕</Text>
          </TouchableOpacity>

          <Animated.View
            style={{ alignItems: 'center', opacity: fadeIn, transform: [{ translateY: slideUp }] }}
          >
            {/* Nexara logo */}
            <View style={st.logoWrap}>
              <NexaraLogo size={56} variant="icon" />
            </View>

            {/* Title */}
            <Text style={st.heroTitle}>Nexara Premium</Text>
            <Text style={st.heroSub}>
              Unlock AI coaching, smart nutrition,{'\n'}and personalised workout programs.
            </Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          {/* ── Plan selector ── */}
          <View style={st.section}>
            <Text style={st.sectionLabel}>Choose your plan</Text>

            <View style={st.planRow}>
              {/* Yearly — BEST VALUE */}
              <TouchableOpacity
                onPress={() => setSelected('yearly')}
                activeOpacity={0.88}
                style={{ width: CARD_W }}
              >
                <View style={[st.planCard, selected === 'yearly' && st.planCardActive]}>
                  {selected === 'yearly' && (
                    <LinearGradient
                      colors={['#6D28D9', '#4F46E5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                    />
                  )}
                  <View
                    style={[
                      st.topBadge,
                      selected === 'yearly'
                        ? { backgroundColor: '#F59E0B' }
                        : { backgroundColor: '#FEF3C7' },
                    ]}
                  >
                    <Text style={[st.topBadgeTxt, { color: '#92400E' }]}>BEST VALUE</Text>
                  </View>
                  <Text style={[st.planName, selected === 'yearly' && st.planNameOn]}>Yearly</Text>
                  <Text style={[st.planPrice, selected === 'yearly' && st.planPriceOn]}>
                    {prices.yearly.label}
                  </Text>
                  <Text style={[st.planPer, selected === 'yearly' && st.planPerOn]}>/year</Text>
                  <View style={[st.checkCircle, selected === 'yearly' && st.checkOn]}>
                    {selected === 'yearly' && <Text style={st.checkMark}>✓</Text>}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Monthly */}
              <TouchableOpacity
                onPress={() => setSelected('monthly')}
                activeOpacity={0.88}
                style={{ width: CARD_W }}
              >
                <View style={[st.planCard, selected === 'monthly' && st.planCardActive]}>
                  {selected === 'monthly' && (
                    <LinearGradient
                      colors={['#6D28D9', '#4F46E5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                    />
                  )}
                  <View style={[st.topBadge, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[st.topBadgeTxt, { color: COLORS.textMuted }]}>
                      {prices.monthly.save}
                    </Text>
                  </View>
                  <Text style={[st.planName, selected === 'monthly' && st.planNameOn]}>
                    Monthly
                  </Text>
                  <Text style={[st.planPrice, selected === 'monthly' && st.planPriceOn]}>
                    {prices.monthly.label}
                  </Text>
                  <Text style={[st.planPer, selected === 'monthly' && st.planPerOn]}>/month</Text>
                  <View style={[st.checkCircle, selected === 'monthly' && st.checkOn]}>
                    {selected === 'monthly' && <Text style={st.checkMark}>✓</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={st.currencyNote}>
              {currency === 'INR'
                ? '💳 Prices in Indian Rupees (INR)'
                : '💳 Prices in US Dollars (USD)'}
            </Text>
          </View>

          {/* ── CTA ── */}
          <View style={st.ctaWrap}>
            <TouchableOpacity
              onPress={handlePurchase}
              activeOpacity={0.88}
              style={{ borderRadius: RADIUS.full, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#6D28D9', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.ctaBtn}
              >
                <Text style={st.ctaTxt}>{ctaLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={st.legal}>Cancel anytime · Secure payment · Restore purchases</Text>
          </View>

          {/* ── Premium features ── */}
          <View style={st.featBox}>
            <View style={st.featBoxHeader}>
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.accent}
              />
              <Text style={st.sectionLabel}>Everything in Premium</Text>
            </View>
            {PREMIUM_FEATURES.map((f, i) => (
              <View
                key={i}
                style={[st.featRow, i < PREMIUM_FEATURES.length - 1 && st.featRowBorder]}
              >
                <View style={st.featIcon}>
                  <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.featTitle}>{f.title}</Text>
                  <Text style={st.featSub}>{f.sub}</Text>
                </View>
                <View style={st.proBadge}>
                  <Text style={st.proBadgeTxt}>PRO</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Always free ── */}
          <View style={[st.featBox, { marginTop: 0 }]}>
            <View style={st.featBoxHeader}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.accent}
              />
              <Text style={st.sectionLabel}>Always free</Text>
            </View>
            <View style={st.freeGrid}>
              {FREE_FEATURES.map((f, i) => (
                <View key={i} style={st.freeChip}>
                  <Text style={{ fontSize: 13 }}>{f.emoji}</Text>
                  <Text style={st.freeChipTxt}>{f.title}</Text>
                  <Text style={st.freeTick}>✓</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Bottom CTA ── */}
          <View style={[st.ctaWrap, { marginTop: 8 }]}>
            <TouchableOpacity
              onPress={handlePurchase}
              activeOpacity={0.88}
              style={{ borderRadius: RADIUS.full, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#6D28D9', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.ctaBtn}
              >
                <Text style={st.ctaTxt}>Unlock Everything</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <PaymentModal
        visible={paymentVisible}
        plan={selected}
        currency={currency === 'INR' ? 'inr' : 'usd'}
        userId={user?.user_id ?? ''}
        userName={user?.name}
        userEmail={user?.email}
        onSuccess={handlePaymentSuccess}
        onClose={() => setPaymentVisible(false)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, alignItems: 'center', paddingBottom: 36 },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  closeX: { fontSize: 13, color: '#fff', fontWeight: '700' },

  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.7,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 22 },

  section: { marginHorizontal: 20, marginTop: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  planRow: { flexDirection: 'row', gap: 12 },
  planCard: {
    width: CARD_W,
    height: 200,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 10,
  },
  planCardActive: { borderColor: '#7C3AED' },

  topBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  topBadgeTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },

  planName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 4,
  },
  planNameOn: { color: 'rgba(255,255,255,0.7)' },
  planPrice: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  planPriceOn: { color: '#fff' },
  planPer: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  planPerOn: { color: 'rgba(255,255,255,0.55)' },

  checkCircle: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#fff', borderColor: '#fff' },
  checkMark: { fontSize: 10, color: '#7C3AED', fontWeight: '900' },

  currencyNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },

  ctaWrap: { marginHorizontal: 20, marginTop: 20, gap: 10 },
  ctaBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: RADIUS.full },
  ctaTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },
  legal: { textAlign: 'center', fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },

  featBox: {
    margin: 20,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  accent: { width: 4, height: 18, borderRadius: 2 },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  featRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  featIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#F3F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  featSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, lineHeight: 16 },
  proBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  proBadgeTxt: { fontSize: 9, fontWeight: '900', color: '#7C3AED', letterSpacing: 0.4 },

  freeGrid: { padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  freeChipTxt: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  freeTick: { fontSize: 11, color: '#10B981', fontWeight: '800' },
});
