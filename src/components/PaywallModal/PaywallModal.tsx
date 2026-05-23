import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../../utils/theme';

const { width } = Dimensions.get('window');

// ── Pricing ────────────────────────────────────────────────────────────────────
// USD → INR at ₹96 (May 2026)
// India pricing follows App Store IN pricing tiers (closest tier to USD equivalent)

export type PlanId = 'monthly' | 'yearly';

interface PricingPlan {
  id: PlanId;
  label: string;
  badge?: string;
  priceUSD: string;
  priceINR: string;
  perMonthUSD: string;
  perMonthINR: string;
  billingNote: string;
  saving?: string;
}

const PLANS: PricingPlan[] = [
  {
    id: 'yearly',
    label: 'Yearly',
    badge: 'MOST POPULAR',
    priceUSD: '$39.99',
    priceINR: '₹2,999',
    perMonthUSD: '$3.33/mo',
    perMonthINR: '₹250/mo',
    billingNote: 'Billed once a year · Cancel anytime',
    saving: 'Save 50%',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    priceUSD: '$6.99',
    priceINR: '₹499',
    perMonthUSD: '$6.99/mo',
    perMonthINR: '₹499/mo',
    billingNote: 'Billed monthly · Cancel anytime',
  },
];

const PRO_FEATURES = [
  {
    emoji: '🤖',
    title: 'Nexara AI Coach',
    desc: 'Personal AI health coach — ask anything about nutrition, workouts, sleep & recovery',
  },
  {
    emoji: '📋',
    title: 'Goal Meal Plans',
    desc: 'Muscle Gain, Fat Loss & Lean Body — ISSN/ACSM evidence-based 7-day schedules, rotated weekly',
  },
  {
    emoji: '🔬',
    title: 'Full Nutrient Panel',
    desc: 'Complete vitamins & minerals — Vit A/B/C/D/K, Iron, Zinc, Calcium + % RDA',
  },
  {
    emoji: '🔍',
    title: 'USDA Food Search',
    desc: 'Search 300,000+ foods from the US government nutrition database',
  },
  {
    emoji: '📊',
    title: 'Macro Tracking',
    desc: 'Daily protein, carbs, fat & fiber progress with visual bars',
  },
  {
    emoji: '⬇️',
    title: 'PDF Export',
    desc: 'Export your personalized meal plan as a watermarked PDF',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export type SubscriptionType = 'paid';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (plan: PlanId, type: SubscriptionType, currency: 'inr' | 'usd') => void;
  triggerFeature?: string;
}

const PaywallModal: React.FC<Props> = ({ visible, onClose, onSubscribe, triggerFeature }) => {
  const [selected, setSelected] = useState<PlanId>('yearly');
  const [currency, setCurrency] = useState<'usd' | 'inr'>('inr');

  const plan = PLANS.find((p) => p.id === selected)!;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Close */}
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Hero gradient header */}
            <LinearGradient
              colors={['#7C3AED', '#4F46E5', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.hero}
            >
              <Text style={s.heroEmoji}>🥗</Text>
              <Text style={s.heroTitle}>Nexara Pro</Text>
              <Text style={s.heroSub}>Meal Planner</Text>
              {triggerFeature ? (
                <View style={s.triggerBadge}>
                  <Text style={s.triggerTxt}>🔒 {triggerFeature} is a Pro feature</Text>
                </View>
              ) : null}
            </LinearGradient>

            {/* Currency toggle */}
            <View style={s.currencyRow}>
              <Text style={s.currencyLabel}>Show prices in</Text>
              <View style={s.currencyToggle}>
                {(['inr', 'usd'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[s.currencyBtn, currency === c && s.currencyBtnActive]}
                  >
                    <Text style={[s.currencyBtnTxt, currency === c && s.currencyBtnTxtActive]}>
                      {c === 'inr' ? '🇮🇳 ₹ INR' : '🇺🇸 $ USD'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Plan selector */}
            <View style={s.plansRow}>
              {PLANS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelected(p.id)}
                  style={{ flex: 1 }}
                  activeOpacity={0.85}
                >
                  <View style={[s.planCard, selected === p.id && s.planCardActive]}>
                    {p.badge ? (
                      <LinearGradient
                        colors={['#7C3AED', '#06B6D4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={s.planBadge}
                      >
                        <Text style={s.planBadgeTxt}>{p.badge}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{ height: 20 }} />
                    )}

                    <Text style={[s.planLabel, selected === p.id && { color: '#7C3AED' }]}>
                      {p.label}
                    </Text>

                    <Text style={[s.planPrice, selected === p.id && { color: '#7C3AED' }]}>
                      {currency === 'inr' ? p.priceINR : p.priceUSD}
                    </Text>

                    <Text style={s.planPerMonth}>
                      {currency === 'inr' ? p.perMonthINR : p.perMonthUSD}
                    </Text>

                    {p.saving ? (
                      <View style={s.savingBadge}>
                        <Text style={s.savingTxt}>{p.saving}</Text>
                      </View>
                    ) : null}

                    <Text style={s.planBilling}>{p.billingNote}</Text>

                    {selected === p.id && <View style={s.selectedDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* CTA button */}
            {/* Primary CTA — paid */}
            <TouchableOpacity
              onPress={() => onSubscribe(selected, 'paid', currency)}
              activeOpacity={0.88}
              style={{ marginHorizontal: 20, marginTop: 4 }}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.ctaBtn}
              >
                <Text style={s.ctaTxt}>
                  Subscribe —{' '}
                  {currency === 'inr'
                    ? selected === 'yearly'
                      ? '₹2,999/year'
                      : '₹499/month'
                    : selected === 'yearly'
                      ? '$39.99/year'
                      : '$6.99/month'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={s.trialNote}>Cancel anytime from App Store / Play Store settings</Text>

            {/* Features list */}
            <View style={s.featuresCard}>
              <Text style={s.featuresTitle}>Everything in Pro</Text>
              {PRO_FEATURES.map((f, i) => (
                <View
                  key={i}
                  style={[
                    s.featureRow,
                    i > 0 && {
                      marginTop: 14,
                      paddingTop: 14,
                      borderTopWidth: 1,
                      borderTopColor: COLORS.border,
                    },
                  ]}
                >
                  <View style={s.featureEmoji}>
                    <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.featureTitle}>{f.title}</Text>
                    <Text style={s.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Comparison table */}
            <View style={{ marginHorizontal: 20 }}>
              <Text style={s.compareTitle}>Free vs Pro</Text>
              <View style={s.compareCard}>
                {/* Header */}
                <View style={s.compareHeader}>
                  <Text style={[s.compareCol, { flex: 2 }]}>Feature</Text>
                  <Text style={[s.compareCol, { flex: 1, textAlign: 'center' }]}>Free</Text>
                  <Text style={[s.compareCol, { flex: 1, textAlign: 'center', color: '#7C3AED' }]}>
                    Pro
                  </Text>
                </View>
                {[
                  ['Food Log & Macros', true, true],
                  ['USDA Food Search', false, true],
                  ['Serving Size Adjuster', false, true],
                  ['Full Vitamin/Mineral Panel', false, true],
                  ['Muscle Gain Plan', false, true],
                  ['Fat Loss Plan', false, true],
                  ['Lean Body (Recomp) Plan', false, true],
                  ['7-Day Meal Schedule', false, true],
                  ['Meal History', false, true],
                ].map(([label, free, pro], i) => (
                  <View
                    key={i}
                    style={[s.compareRow, i % 2 === 0 && { backgroundColor: '#F8F7FF' }]}
                  >
                    <Text style={[s.compareRowLabel, { flex: 2 }]}>{label as string}</Text>
                    <Text style={[s.compareRowVal, { flex: 1 }]}>{free ? '✓' : '—'}</Text>
                    <Text
                      style={[s.compareRowVal, { flex: 1, color: '#7C3AED', fontWeight: '800' }]}
                    >
                      {pro ? '✓' : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Trust badges */}
            <View style={s.trustRow}>
              {['🔒 Secure Payment', '↩️ Cancel Anytime', '🏥 Evidence-Based'].map((t) => (
                <View key={t} style={s.trustBadge}>
                  <Text style={s.trustTxt}>{t}</Text>
                </View>
              ))}
            </View>

            <Text style={s.legal}>
              Prices shown are indicative. Actual charges are in your local currency via App Store
              or Google Play. Subscription auto-renews unless cancelled 24 hours before period end.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,15,26,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '95%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: COLORS.textSub, fontSize: 13, fontWeight: '700' },

  // Hero
  hero: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingTop: 36,
    alignItems: 'center',
    paddingBottom: 24,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  triggerBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  triggerTxt: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // Currency toggle
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 14,
  },
  currencyLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.full,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  currencyBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currencyBtnTxt: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  currencyBtnTxtActive: { color: '#7C3AED', fontWeight: '700' },

  // Plan cards
  plansRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  planCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FAFAFA',
    padding: 14,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 160,
  },
  planCardActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  planBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  planBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  planLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSub, marginBottom: 6 },
  planPrice: { fontSize: 26, fontWeight: '900', color: COLORS.text, letterSpacing: -0.8 },
  planPerMonth: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  savingBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savingTxt: { fontSize: 10, fontWeight: '800', color: '#059669' },
  planBilling: { fontSize: 9, color: COLORS.textMuted, marginTop: 6, textAlign: 'center' },
  selectedDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    borderWidth: 3,
    borderColor: '#fff',
  },

  // CTA
  ctaBtn: {
    borderRadius: RADIUS.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  trialNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },

  // Features
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: 20,
    marginTop: 20,
    padding: 18,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureEmoji: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  featureDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 17 },

  // Compare table
  compareTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  compareCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  compareHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  compareCol: { fontSize: 11, fontWeight: '800', color: COLORS.textSub, letterSpacing: 0.3 },
  compareRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  compareRowLabel: { fontSize: 12, color: COLORS.text },
  compareRowVal: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  // Trust
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 20,
    flexWrap: 'wrap',
  },
  trustBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trustTxt: { fontSize: 11, color: '#059669', fontWeight: '600' },

  // Legal
  legal: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    lineHeight: 15,
  },
});

export default PaywallModal;
