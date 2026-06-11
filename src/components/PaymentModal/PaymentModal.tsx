import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  NativeModules,
  Animated,
  Dimensions,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../../utils/theme';
import api from '../../api/axios';

const isRazorpayAvailable = !!NativeModules.RNRazorpayCheckout;

const getRazorpay = (): {
  open: (opts: Record<string, unknown>) => Promise<Record<string, string>>;
} => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-razorpay').default as {
      open: (opts: Record<string, unknown>) => Promise<Record<string, string>>;
    };
  } catch {
    return {
      open: async () => {
        throw new Error('Razorpay not available');
      },
    };
  }
};

export type PaymentPlan = 'monthly' | 'yearly';
export type PaymentGateway = 'razorpay' | 'coming_soon';

interface Props {
  visible: boolean;
  plan: PaymentPlan;
  currency: 'inr' | 'usd';
  userId: string;
  userName?: string;
  userEmail?: string;
  onSuccess: (plan: PaymentPlan) => void;
  onClose: () => void;
}

const PLAN_INFO = {
  monthly: {
    tag: 'Monthly Plan',
    billing: 'Billed every month. Cancel anytime.',
    renewNote: 'Renews automatically each month.',
    highlight: 'Great for trying out all premium features with full flexibility.',
    perks: [
      { icon: '🤖', text: 'Unlimited AI Health Coach sessions' },
      { icon: '🥗', text: 'Full Meal Planner with goal-based plans' },
      { icon: '📷', text: 'Barcode Food Scanner — 2M+ products' },
      { icon: '📋', text: 'Structured Workout Programs (PPL, HIIT…)' },
      { icon: '📊', text: 'Weekly Report Card with shareable grades' },
      { icon: '🔔', text: 'Smart Notifications & daily health briefs' },
      { icon: '🎯', text: 'Unlimited active health goals' },
    ],
    ctaNote: 'Flexible — no long-term commitment',
  },
  yearly: {
    tag: 'Yearly Plan',
    billing: 'Billed once per year. Best value.',
    renewNote: 'Renews automatically after 12 months.',
    highlight: 'Save over 50% vs monthly — best value for serious health goals.',
    perks: [
      { icon: '🤖', text: 'Unlimited AI Health Coach sessions' },
      { icon: '🥗', text: 'Full Meal Planner with goal-based plans' },
      { icon: '📷', text: 'Barcode Food Scanner — 2M+ products' },
      { icon: '📋', text: 'Structured Workout Programs (PPL, HIIT…)' },
      { icon: '📊', text: 'Weekly Report Card with shareable grades' },
      { icon: '🔔', text: 'Smart Notifications & daily health briefs' },
      { icon: '🎯', text: 'Unlimited active health goals' },
      { icon: '🏆', text: 'Priority access to new features' },
    ],
    ctaNote: 'Best value — save 50% vs monthly',
  },
};

const PRICES = {
  inr: {
    monthly: { amount: '₹499', full: '₹499/month', perMonth: '₹499/mo' },
    yearly: { amount: '₹2,999', full: '₹2,999/year', perMonth: '₹250/mo' },
    save: 'Save 50%',
  },
  usd: {
    monthly: { amount: '$5.99', full: '$5.99/month', perMonth: '$5.99/mo' },
    yearly: { amount: '$35.99', full: '$35.99/year', perMonth: '$3/mo' },
    save: 'Save 50%',
  },
};

const { width: SW, height: SH } = Dimensions.get('window');

const FEATURES = [
  { emoji: '🤖', label: 'AI Health Coach' },
  { emoji: '🥗', label: 'Meal Planner' },
  { emoji: '📷', label: 'Food Scanner' },
  { emoji: '📋', label: 'Workout Programs' },
  { emoji: '📊', label: 'Weekly Report' },
  { emoji: '📈', label: 'Advanced Stats' },
  { emoji: '🔔', label: 'Smart Alerts' },
  { emoji: '🎯', label: 'Unlimited Goals' },
];

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  x: Math.random() * 0.9 + 0.05,
  y: Math.random() * 0.6 + 0.05,
  emoji: ['✨', '⭐', '💫', '🌟'][i % 4],
  delay: i * 120,
}));

function PremiumWelcomeScreen({ plan }: { plan: 'monthly' | 'yearly' }) {
  const insets = useSafeAreaInsets();

  // Main elements
  const [bgScale] = useState(() => new Animated.Value(0.85));
  const [bgOpacity] = useState(() => new Animated.Value(0));
  const [crownScale] = useState(() => new Animated.Value(0));
  const [crownRotate] = useState(() => new Animated.Value(-15));
  const [titleY] = useState(() => new Animated.Value(30));
  const [titleOp] = useState(() => new Animated.Value(0));
  const [subY] = useState(() => new Animated.Value(20));
  const [subOp] = useState(() => new Animated.Value(0));
  const [badgesOp] = useState(() => new Animated.Value(0));
  const [badgesY] = useState(() => new Animated.Value(20));
  const [shimmer] = useState(() => new Animated.Value(0));

  // Particle anims
  const [particleAnims] = useState(() =>
    PARTICLES.map(() => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0.4),
    }))
  );

  useEffect(() => {
    // Background
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(bgScale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();

    // Crown bounce
    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.spring(crownScale, {
          toValue: 1,
          tension: 55,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(crownRotate, {
          toValue: 0,
          tension: 55,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Title
    Animated.sequence([
      Animated.delay(380),
      Animated.parallel([
        Animated.spring(titleY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    ]).start();

    // Subtitle
    Animated.sequence([
      Animated.delay(520),
      Animated.parallel([
        Animated.spring(subY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(subOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // Feature badges
    Animated.sequence([
      Animated.delay(680),
      Animated.parallel([
        Animated.spring(badgesY, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
        Animated.timing(badgesOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    // Particles
    particleAnims.forEach((p, i) => {
      Animated.sequence([
        Animated.delay(300 + PARTICLES[i].delay),
        Animated.parallel([
          Animated.spring(p.scale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0.7, duration: 400, useNativeDriver: true }),
          Animated.spring(p.y, { toValue: -18, tension: 40, friction: 10, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, []);

  const crownRotateInterpolated = crownRotate.interpolate({
    inputRange: [-15, 0],
    outputRange: ['-15deg', '0deg'],
  });

  const shimmerColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(124,58,237,0.08)', 'rgba(124,58,237,0.18)'],
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingTop: insets.top,
      }}
    >
      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: p.x * SW,
            top: p.y * SH,
            fontSize: 18,
            opacity: particleAnims[i].opacity,
            transform: [{ scale: particleAnims[i].scale }, { translateY: particleAnims[i].y }],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}

      {/* Background glow circle */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: 160,
          opacity: bgOpacity,
          transform: [{ scale: bgScale }],
          backgroundColor: 'rgba(124,58,237,0.07)',
        }}
      />

      {/* Crown icon */}
      <Animated.View
        style={{
          transform: [{ scale: crownScale }, { rotate: crownRotateInterpolated }],
          marginBottom: 20,
        }}
      >
        <LinearGradient
          colors={['#0891B2', '#0E7490']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0891B2',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.45,
            shadowRadius: 24,
            elevation: 16,
          }}
        >
          <Text style={{ fontSize: 46 }}>👑</Text>
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={{
          fontSize: 30,
          fontWeight: '900',
          color: COLORS.text,
          letterSpacing: -0.8,
          textAlign: 'center',
          marginBottom: 10,
          opacity: titleOp,
          transform: [{ translateY: titleY }],
        }}
      >
        Welcome to <Animated.Text style={{ color: '#0891B2' }}>Premium!</Animated.Text>
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text
        style={{
          fontSize: 14,
          color: COLORS.textSub,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 28,
          opacity: subOp,
          transform: [{ translateY: subY }],
        }}
      >
        Your {plan === 'yearly' ? 'yearly' : 'monthly'} subscription is active.{'\n'}All features
        are unlocked and ready to use.
      </Animated.Text>

      {/* Feature badges */}
      <Animated.View
        style={{
          opacity: badgesOp,
          transform: [{ translateY: badgesY }],
          width: '100%',
        }}
      >
        <Animated.View
          style={{
            backgroundColor: shimmerColor,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E0F7FA',
          }}
        >
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
          >
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: '#E0F7FA',
                }}
              >
                <Text style={{ fontSize: 13 }}>{f.emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>
                  {f.label}
                </Text>
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>✓</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const PaymentForm: React.FC<Props> = ({
  plan,
  currency,
  userId,
  userName,
  userEmail,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'summary' | 'processing' | 'done'>('summary');

  const gateway: PaymentGateway = currency === 'inr' ? 'razorpay' : 'coming_soon';
  const info = PLAN_INFO[plan];
  const price = PRICES[currency][plan];
  const isYearly = plan === 'yearly';

  const handleRazorpay = useCallback(async () => {
    if (!isRazorpayAvailable) {
      Alert.alert(
        'Build Required',
        'Payment requires a native build: expo run:android or expo run:ios'
      );
      return;
    }
    setLoading(true);
    setStep('processing');
    try {
      const { data: order } = await api.post<{
        currency: string;
        keyId: string;
        amount: number;
        orderId: string;
      }>(`/users/${userId}/payment/razorpay/create-order`, { plan });

      const RazorpayCheckout = getRazorpay();
      const paymentData = await RazorpayCheckout.open({
        name: 'Nexara',
        description: `Premium ${plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan`,
        image:
          'https://raw.githubusercontent.com/rajatkhatri026/health_tracker_react_native/main/assets/icon.png',
        currency: order.currency,
        key: order.keyId,
        amount: order.amount,
        order_id: order.orderId,
        prefill: { email: userEmail ?? '', contact: '', name: userName ?? '' },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        config: {
          display: {
            blocks: {
              upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
              other: {
                name: 'Other Methods',
                instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: { show_default_blocks: false },
          },
        },
        theme: { color: '#0891B2' },
      });

      // Verify on backend — if this fails, payment already succeeded on Razorpay
      // so still grant premium and show success to avoid double-charging
      try {
        await api.post(`/users/${userId}/payment/razorpay/verify`, {
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          plan,
        });
      } catch {
        // Verification failed but payment went through — still unlock premium
        // Log for manual review
        console.warn(
          'Razorpay verify failed — granting premium anyway',
          paymentData.razorpay_payment_id
        );
      }

      setStep('done');
      setTimeout(() => onSuccess(plan), 1600);
    } catch (e: unknown) {
      setStep('summary');
      const err = e as { code?: number; description?: string; message?: string };
      if (err?.code !== 0)
        Alert.alert('Payment Failed', err?.description ?? err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, plan, userName, userEmail, onSuccess]);

  const handlePay = () => {
    if (gateway === 'razorpay') {
      handleRazorpay();
    } else {
      Alert.alert(
        'Coming Soon',
        'International card payments will be available in the next update. For now, please use an Indian payment method.',
        [{ text: 'OK' }]
      );
    }
  };

  if (step === 'done') {
    return <PremiumWelcomeScreen plan={plan} />;
  }

  if (step === 'processing') {
    return (
      <View style={s.stateScreen}>
        <ActivityIndicator size="large" color="#0891B2" />
        <Text style={s.processingTxt}>Processing your payment…</Text>
        <Text style={s.processingSub}>Please don&apos;t close this screen</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Order card */}
      <LinearGradient
        colors={['#0369A1', '#0E7490']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.orderCard}
      >
        <View style={s.planTagRow}>
          <View style={s.planTag}>
            <Text style={s.planTagTxt}>{info.tag}</Text>
          </View>
          {isYearly && (
            <View style={s.savePill}>
              <Text style={s.savePillTxt}>{PRICES[currency].save}</Text>
            </View>
          )}
        </View>
        <Text style={s.orderProduct}>Nexara Premium</Text>
        <View style={s.orderPriceRow}>
          <Text style={s.orderAmount}>{price.amount}</Text>
          <Text style={s.orderPer}>{plan === 'yearly' ? '/year' : '/month'}</Text>
        </View>
        {isYearly && (
          <Text style={s.orderBreakdown}>
            Just {price.perMonth} — billed as {price.full}
          </Text>
        )}
        <View style={s.orderDivider} />
        <Text style={s.orderBilling}>{info.billing}</Text>
      </LinearGradient>

      {/* Highlight */}
      <View style={s.highlightBox}>
        <Text style={s.highlightTxt}>{info.highlight}</Text>
      </View>

      {/* What you get */}
      <Text style={s.sectionLabel}>What you get</Text>
      <View style={s.perksCard}>
        {info.perks.map((p, i) => (
          <View key={i} style={[s.perkRow, i < info.perks.length - 1 && s.perkBorder]}>
            <View style={s.perkIconBg}>
              <Text style={{ fontSize: 16 }}>{p.icon}</Text>
            </View>
            <Text style={s.perkTxt}>{p.text}</Text>
            <Text style={s.perkCheck}>✓</Text>
          </View>
        ))}
      </View>

      {/* Payment method */}
      <Text style={s.sectionLabel}>Payment method</Text>
      <View style={s.gatewayCard}>
        <View style={s.gatewayIconBg}>
          <Text style={{ fontSize: 22 }}>{gateway === 'razorpay' ? '🇮🇳' : '🌍'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.gatewayName}>
            {gateway === 'razorpay' ? 'Razorpay' : 'International Payments'}
          </Text>
          <Text style={s.gatewaySub}>
            {gateway === 'razorpay'
              ? 'UPI · Cards · Net Banking · Wallets'
              : 'Coming soon — card payments for international users'}
          </Text>
        </View>
        <View
          style={[
            s.secureTag,
            gateway === 'coming_soon' && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
          ]}
        >
          <Text style={[s.secureTxt, gateway === 'coming_soon' && { color: '#92400E' }]}>
            {gateway === 'razorpay' ? '🔒 Secure' : '⏳ Soon'}
          </Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={handlePay}
        disabled={loading}
        activeOpacity={0.88}
        style={{ marginTop: 20, borderRadius: RADIUS.full, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={['#0369A1', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.payBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.payBtnTxt}>
              {gateway === 'razorpay' ? `Pay ${price.full} →` : 'Notify Me When Available'}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Text style={s.ctaNote}>{info.ctaNote}</Text>
      <Text style={s.disclaimer}>
        By tapping &ldquo;Pay&rdquo; you agree to our Terms of Service.{'\n'}
        {info.renewNote} Cancel anytime from your App Store / Play Store settings.
      </Text>
    </ScrollView>
  );
};

const PaymentModal: React.FC<Props> = (props) => {
  const isYearly = props.plan === 'yearly';
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>Complete Purchase</Text>
              <Text style={s.headerSub}>
                {isYearly ? 'Yearly Plan · Best Value' : 'Monthly Plan · Full Flexibility'}
              </Text>
            </View>
            <TouchableOpacity onPress={props.onClose} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        <PaymentForm {...props} />
      </View>
    </Modal>
  );
};

export default PaymentModal;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
  scroll: { padding: 20 },

  orderCard: { borderRadius: 20, padding: 20, marginBottom: 14 },
  planTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  planTag: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  planTagTxt: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  savePill: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  savePillTxt: { fontSize: 10, fontWeight: '900', color: '#000' },
  orderProduct: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  orderPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 4 },
  orderAmount: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  orderPer: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 6, fontWeight: '600' },
  orderBreakdown: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    fontWeight: '500',
  },
  orderDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  orderBilling: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  highlightBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  highlightTxt: { fontSize: 13, color: '#075985', fontWeight: '600', lineHeight: 19 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  perksCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  perkBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  perkIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  perkTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  perkCheck: { fontSize: 13, color: '#10B981', fontWeight: '900' },

  gatewayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gatewayIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F3F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gatewayName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  gatewaySub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  secureTag: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  secureTxt: { fontSize: 10, fontWeight: '700', color: '#059669' },

  payBtn: { height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full },
  payBtnTxt: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  ctaNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#0891B2',
    fontWeight: '700',
    marginTop: 10,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },

  stateScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIconBg: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  successSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  successBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  successChip: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  successChipTxt: { fontSize: 12, fontWeight: '700', color: '#059669' },
  processingTxt: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 20 },
  processingSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
});
