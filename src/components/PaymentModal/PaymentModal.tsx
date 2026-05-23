import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../../utils/theme';
import api from '../../api/axios';

// ── Native module guards ──────────────────────────────────────────────────────
const isStripeAvailable = !!NativeModules.StripeSdk;
const isRazorpayAvailable = !!NativeModules.RazorpayPaymentModule;

type SheetFn = () => Promise<{ error?: { code?: string; message?: string } }>;
type InitFn = (opts: Record<string, unknown>) => Promise<{ error?: { message?: string } }>;

const useStripeCompat = (): { initPaymentSheet: InitFn; presentPaymentSheet: SheetFn } => {
  const noopInit: InitFn = useCallback(
    async () => ({ error: { message: 'Stripe not available' } }),
    []
  );
  const noopSheet: SheetFn = useCallback(
    async () => ({ error: { code: 'NativeModuleMissing' } }),
    []
  );
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useStripe } = require('@stripe/stripe-react-native');
    if (isStripeAvailable) return useStripe(); // eslint-disable-line react-hooks/rules-of-hooks
  } catch {}
  return { initPaymentSheet: noopInit, presentPaymentSheet: noopSheet };
};

// Stripe provider resolved once at module level to avoid creating component during render
let StripeProviderComponent: React.ComponentType<{
  publishableKey: string;
  merchantIdentifier?: string;
  children: React.ReactNode;
}>;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  StripeProviderComponent = require('@stripe/stripe-react-native').StripeProvider;
} catch {
  const FallbackProvider = ({
    children,
  }: {
    publishableKey: string;
    merchantIdentifier?: string;
    children: React.ReactNode;
  }) => <>{children}</>;
  FallbackProvider.displayName = 'StripeProviderFallback';
  StripeProviderComponent = FallbackProvider;
}

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

// ── Types ─────────────────────────────────────────────────────────────────────
export type PaymentPlan = 'monthly' | 'yearly';
export type PaymentGateway = 'razorpay' | 'stripe';

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

// ── Plan content ──────────────────────────────────────────────────────────────
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

// ── Payment Form ──────────────────────────────────────────────────────────────
const PaymentForm: React.FC<Props> = ({
  plan,
  currency,
  userId,
  userName,
  userEmail,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripeCompat();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'summary' | 'processing' | 'done'>('summary');

  const gateway: PaymentGateway = currency === 'inr' ? 'razorpay' : 'stripe';
  const info = PLAN_INFO[plan];
  const price = PRICES[currency][plan];
  const isYearly = plan === 'yearly';

  // ── Razorpay ─────────────────────────────────────────────────────────────────
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
        description: `Nexara Premium — ${plan}`,
        currency: order.currency,
        key: order.keyId,
        amount: order.amount,
        order_id: order.orderId,
        name: 'Nexara',
        prefill: { email: userEmail ?? '', contact: '', name: userName ?? '' },
        theme: { color: '#7C3AED' },
      });

      await api.post(`/users/${userId}/payment/razorpay/verify`, {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        plan,
      });

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

  // ── Stripe ───────────────────────────────────────────────────────────────────
  const handleStripe = useCallback(async () => {
    if (!isStripeAvailable) {
      Alert.alert(
        'Build Required',
        'Payment requires a native build: expo run:android or expo run:ios'
      );
      return;
    }
    setLoading(true);
    setStep('processing');
    try {
      const { data: intent } = await api.post<{ clientSecret: string }>(
        `/users/${userId}/payment/stripe/create-intent`,
        { plan }
      );

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Nexara',
        paymentIntentClientSecret: intent.clientSecret,
        defaultBillingDetails: { name: userName ?? '', email: userEmail ?? '' },
        appearance: { colors: { primary: '#7C3AED', background: '#FFFFFF' } },
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          setStep('summary');
          setLoading(false);
          return;
        }
        throw new Error(presentError.message);
      }

      const paymentIntentId = intent.clientSecret.split('_secret_')[0];
      await api.post(`/users/${userId}/payment/stripe/confirm`, { paymentIntentId, plan });

      setStep('done');
      setTimeout(() => onSuccess(plan), 1600);
    } catch (e: unknown) {
      setStep('summary');
      Alert.alert('Payment Failed', (e as Error)?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, plan, userName, userEmail, initPaymentSheet, presentPaymentSheet, onSuccess]);

  const handlePay = gateway === 'razorpay' ? handleRazorpay : handleStripe;

  // ── Done ──────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <View style={s.stateScreen}>
        <LinearGradient colors={['#EDE9FE', '#F5F3FF']} style={s.successIconBg}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
        </LinearGradient>
        <Text style={s.successTitle}>Welcome to Premium!</Text>
        <Text style={s.successSub}>
          Your {plan === 'yearly' ? 'yearly' : 'monthly'} subscription is now active.{'\n'}
          All premium features are unlocked and ready.
        </Text>
        <View style={s.successBadgeRow}>
          {['AI Coach', 'Meal Planner', 'Programs', 'Scanner', 'Reports'].map((f, i) => (
            <View key={i} style={s.successChip}>
              <Text style={s.successChipTxt}>✓ {f}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <View style={s.stateScreen}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={s.processingTxt}>Processing your payment…</Text>
        <Text style={s.processingSub}>Please don&apos;t close this screen</Text>
      </View>
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Order card */}
      <LinearGradient
        colors={['#6D28D9', '#4F46E5']}
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
          <Text style={s.gatewayName}>{gateway === 'razorpay' ? 'Razorpay' : 'Stripe'}</Text>
          <Text style={s.gatewaySub}>
            {gateway === 'razorpay'
              ? 'UPI · Cards · Net Banking · Wallets'
              : 'Cards · Apple Pay · Google Pay'}
          </Text>
        </View>
        <View style={s.secureTag}>
          <Text style={s.secureTxt}>🔒 Secure</Text>
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
          colors={['#6D28D9', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.payBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.payBtnTxt}>Pay {price.full} →</Text>
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

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const PaymentModal: React.FC<Props> = (props) => {
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const isYearly = props.plan === 'yearly';

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      <StripeProviderComponent publishableKey={stripeKey} merchantIdentifier="merchant.com.nexara">
        <View style={s.container}>
          <View style={s.header}>
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
      </StripeProviderComponent>
    </Modal>
  );
};

export default PaymentModal;

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 12,
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
    borderColor: '#EDE9FE',
  },
  highlightTxt: { fontSize: 13, color: '#5B21B6', fontWeight: '600', lineHeight: 19 },

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
    color: '#7C3AED',
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
