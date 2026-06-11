import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/profile';
import { COLORS, RADIUS } from '../../utils/theme';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';
import { IconActivity } from '../../components/icons/Icons';

const { height } = Dimensions.get('window');

// 3 slides — each focused on a core value prop
const SLIDES = [
  {
    emoji: '❤️‍🔥',
    tag: 'FREE FEATURES',
    title: 'Track Everything\nThat Matters',
    desc: 'All the essentials to monitor your health daily — steps, water, sleep, calories and weight in one beautiful app.',
    accent: '#0891B2',
    light: '#F5F3FF',
    border: '#E0F7FA',
    features: [
      { emoji: '👟', text: 'Steps & daily activity' },
      { emoji: '💧', text: 'Water intake tracking' },
      { emoji: '😴', text: 'Sleep log & analysis' },
      { emoji: '🔥', text: 'Calorie & macro logging' },
      { emoji: '⚖️', text: 'Weight progress over time' },
      { emoji: '⏱️', text: 'Fasting timer' },
    ],
    free: true,
  },
  {
    emoji: '🤖',
    tag: 'PREMIUM — AI & NUTRITION',
    title: 'AI Coach &\nSmart Nutrition',
    desc: 'Your personal AI health coach available 24/7 — get meal plans built around your goals, scan food instantly and never guess your macros again.',
    accent: '#0891B2',
    light: '#F0FDFF',
    border: '#BAE6FD',
    features: [
      { emoji: '🤖', text: 'AI Health Coach — unlimited personal sessions' },
      { emoji: '🥗', text: 'Meal Planner — goal-based ISSN nutrition plans' },
      { emoji: '📷', text: 'Barcode Food Scanner — 2M+ products database' },
      { emoji: '🎯', text: 'Unlimited Goals — free users limited to 3' },
      { emoji: '🔔', text: 'Smart Notifications — water, brief & recap' },
    ],
    free: false,
  },
  {
    emoji: '🏆',
    tag: 'PREMIUM — TRAINING & ANALYTICS',
    title: 'Programs, Reports\n& Advanced Stats',
    desc: 'Follow structured workout programs built by experts, get a shareable weekly report card and unlock deep body analytics.',
    accent: '#0891B2',
    light: '#F5F3FF',
    border: '#E0F7FA',
    features: [
      { emoji: '📋', text: 'Workout Programs — PPL · 5×5 · Full Body · HIIT' },
      { emoji: '📊', text: 'Weekly Report Card — shareable progress + badges' },
      { emoji: '📈', text: 'Advanced Body Stats — body fat %, ideal weight' },
      { emoji: '📉', text: 'Trend Charts — visualise progress over time' },
      { emoji: '💪', text: 'Exercise Library — 100+ exercises with guides' },
    ],
    free: false,
  },
];

type Stage = 'welcome' | 'slides' | 'profile';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding, refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>('welcome');
  const [slideIndex, setSlideIndex] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideUp] = useState(() => new Animated.Value(24));
  const [emojiAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    fadeAnim.setValue(0);
    slideUp.setValue(24);
    emojiAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 70, friction: 13, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(emojiAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      ]),
    ]).start();
  }, [stage, slideIndex]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (name.trim().length > 50) {
      setError('Name must be under 50 characters');
      return;
    }
    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
      setError('Name can only contain letters, spaces, hyphens and apostrophes');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateProfile(user!.user_id, { name: name.trim() });
      await refreshUser();
      completeOnboarding();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── WELCOME ────────────────────────────────────────────────────────────────
  if (stage === 'welcome') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StatusBar barStyle="dark-content" />

        {/* Full-screen gradient hero */}
        <LinearGradient
          colors={['#0891B2', '#0C4A6E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingHorizontal: 28,
            justifyContent: 'space-between',
          }}
        >
          {/* Decorative circles */}
          <View
            style={[
              s.decCircle,
              {
                width: 300,
                height: 300,
                borderRadius: 150,
                top: -80,
                right: -80,
                backgroundColor: 'rgba(255,255,255,0.06)',
              },
            ]}
          />
          <View
            style={[
              s.decCircle,
              {
                width: 180,
                height: 180,
                borderRadius: 90,
                bottom: 120,
                left: -60,
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            ]}
          />

          {/* Top: logo + name */}
          <Animated.View
            style={{
              alignItems: 'center',
              marginTop: 60,
              opacity: fadeAnim,
              transform: [{ translateY: slideUp }],
            }}
          >
            <Animated.View style={{ transform: [{ scale: emojiAnim }] }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 28,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <NexaraLogo size={56} variant="icon" />
              </View>
            </Animated.View>

            <Text
              style={{
                fontSize: 48,
                fontWeight: '900',
                color: '#fff',
                letterSpacing: -1.5,
                textAlign: 'center',
              }}
            >
              Nexara
            </Text>
            <Text
              style={{
                fontSize: 18,
                color: 'rgba(255,255,255,0.8)',
                fontWeight: '500',
                marginTop: 6,
                textAlign: 'center',
                letterSpacing: 0.2,
              }}
            >
              Your Health, Your Way.
            </Text>
          </Animated.View>

          {/* Middle: 3 stats */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <View
              style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 32 }}
            >
              {[
                { value: '10+', label: 'Health Metrics' },
                { value: 'AI', label: 'Powered Coach' },
                { value: '100%', label: 'Private & Secure' },
              ].map((stat, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 16,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.15)',
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>
                    {stat.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.65)',
                      marginTop: 3,
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity onPress={() => setStage('slides')} activeOpacity={0.88}>
              <View
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 18,
                  paddingVertical: 18,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: '800', color: '#0891B2', letterSpacing: 0.2 }}
                >
                  Get Started →
                </Text>
              </View>
            </TouchableOpacity>

            <Text
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                marginTop: 14,
                fontWeight: '500',
              }}
            >
              Free to start · No credit card required
            </Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  // ── SLIDES ─────────────────────────────────────────────────────────────────
  if (stage === 'slides') {
    const slide = SLIDES[slideIndex];
    const isLast = slideIndex === SLIDES.length - 1;
    const gradEnd =
      slide.accent === '#0891B2' ? '#0E7490' : slide.accent === '#EF4444' ? '#F59E0B' : '#06B6D4';

    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideUp }] }}>
          {/* Progress dots — always visible at top */}
          <View
            style={{
              flexDirection: 'row',
              gap: 6,
              justifyContent: 'center',
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 5,
                  borderRadius: 3,
                  width: i === slideIndex ? 24 : 8,
                  backgroundColor: i === slideIndex ? slide.accent : COLORS.border,
                }}
              />
            ))}
          </View>

          {/* Card — fixed, not scrollable */}
          <View style={[s.slideCard, { borderColor: slide.border, marginHorizontal: 20, flex: 1 }]}>
            {/* Gradient strip — fixed */}
            <LinearGradient
              colors={[slide.accent, gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.slideStrip}
            >
              <View
                style={[
                  s.decCircle,
                  {
                    width: 130,
                    height: 130,
                    borderRadius: 65,
                    top: -30,
                    right: -30,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                ]}
              />
              <View
                style={[
                  s.decCircle,
                  {
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    bottom: -20,
                    left: -10,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                  },
                ]}
              />

              {/* Tag + badge row */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  width: '100%',
                  gap: 8,
                }}
              >
                <View style={[s.slideTagLight, { flexShrink: 1 }]}>
                  <Text style={s.slideTagTxt} numberOfLines={1} adjustsFontSizeToFit>
                    {slide.tag}
                  </Text>
                </View>
                {!slide.free ? (
                  <View style={[s.proBadge, { flexShrink: 0 }]}>
                    <Text style={s.proBadgeTxt}>👑 Premium</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      s.proBadge,
                      { flexShrink: 0, borderColor: '#D1FAE5', backgroundColor: '#ECFDF5' },
                    ]}
                  >
                    <Text style={[s.proBadgeTxt, { color: '#059669' }]}>✓ Free</Text>
                  </View>
                )}
              </View>

              {/* Icon / Emoji */}
              <Animated.View style={{ transform: [{ scale: emojiAnim }] }}>
                <View style={s.slideEmojiBox}>
                  {slideIndex === 0 ? (
                    <IconActivity size={52} color="#fff" strokeWidth={1.8} />
                  ) : (
                    <Text style={{ fontSize: 54 }}>{slide.emoji}</Text>
                  )}
                </View>
              </Animated.View>
            </LinearGradient>

            {/* White body — title + desc fixed, only features scroll */}
            <View style={[s.slideBody, { flex: 1 }]}>
              <Text style={s.slideTitle}>{slide.title}</Text>
              <Text style={s.slideDesc}>{slide.desc}</Text>

              {/* Only features list scrolls */}
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              >
                {slide.features.map((f, i) => (
                  <View
                    key={i}
                    style={[
                      s.featureRow,
                      { backgroundColor: slide.light, borderColor: slide.border },
                    ]}
                  >
                    <View style={[s.featureIcon, { backgroundColor: `${slide.accent}15` }]}>
                      <Text style={{ fontSize: 15 }}>{f.emoji}</Text>
                    </View>
                    <Text style={s.featureTxt}>{f.text}</Text>
                    <View style={[s.featureCheck, { backgroundColor: slide.accent }]}>
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '900' }}>✓</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Nav — always pinned at bottom */}
          <View
            style={[
              s.navRow,
              {
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 16,
                paddingTop: 12,
                backgroundColor: COLORS.bg,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => (slideIndex === 0 ? setStage('welcome') : setSlideIndex((i) => i - 1))}
              style={s.backBtn}
            >
              <Text style={s.backBtnTxt}>←</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => (isLast ? setStage('profile') : setSlideIndex((i) => i + 1))}
              activeOpacity={0.88}
              style={s.nextBtn}
            >
              <LinearGradient
                colors={[slide.accent, gradEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.nextGrad}
              >
                <Text style={s.nextTxt}>{isLast ? 'Set Up Profile →' : 'Next →'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── PROFILE ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header — back button only, no step label */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => setStage('slides')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 18, color: COLORS.text }}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable body — pushes up with keyboard, never hides behind button */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateY: slideUp }],
              justifyContent: 'space-between',
            }}
          >
            {/* Top group */}
            <View>
              {/* Hero card */}
              <View
                style={{ borderRadius: 24, overflow: 'hidden', marginTop: 4, marginBottom: 28 }}
              >
                <LinearGradient
                  colors={['#0891B2', '#0C4A6E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 28, alignItems: 'center' }}
                >
                  <View
                    style={[
                      s.decCircle,
                      {
                        width: 180,
                        height: 180,
                        borderRadius: 90,
                        top: -50,
                        right: -50,
                        backgroundColor: 'rgba(255,255,255,0.07)',
                      },
                    ]}
                  />
                  <View
                    style={[
                      s.decCircle,
                      {
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        bottom: -20,
                        left: -20,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      },
                    ]}
                  />

                  <Animated.View style={{ transform: [{ scale: emojiAnim }], marginBottom: 16 }}>
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 24,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        borderWidth: 1.5,
                        borderColor: 'rgba(255,255,255,0.25)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 40 }}>👋</Text>
                    </View>
                  </Animated.View>

                  <Text
                    style={{
                      fontSize: 26,
                      fontWeight: '900',
                      color: '#fff',
                      letterSpacing: -0.6,
                      textAlign: 'center',
                    }}
                  >
                    Almost there!
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.75)',
                      marginTop: 6,
                      textAlign: 'center',
                      lineHeight: 20,
                    }}
                  >
                    Just one last thing — tell us your name so we can personalise your experience.
                  </Text>
                </LinearGradient>
              </View>

              {/* Input */}
              <Text style={[s.inputLabel, { marginBottom: 8 }]}>YOUR NAME</Text>
              <View style={[s.inputBox, nameFocused && s.inputBoxFocused]}>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setError('');
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="words"
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </View>

              {error ? (
                <View style={[s.errorBox, { marginTop: 8 }]}>
                  <Text style={s.errorTxt}>{error}</Text>
                </View>
              ) : (
                <Text style={[s.inputHint, { marginTop: 8 }]}>
                  You can change this anytime in your profile settings.
                </Text>
              )}
            </View>
            {/* end top group */}

            {/* CTA — pinned to bottom via space-between */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.88}
              style={[s.ctaBtn, { marginTop: 32, opacity: saving ? 0.7 : 1 }]}
            >
              <LinearGradient
                colors={['#0891B2', '#0E7490']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.ctaGrad}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.ctaTxt}>{"Let's Go 🚀"}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  fill: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  decCircle: { position: 'absolute' },

  // Welcome
  welcomeHero: { borderRadius: 24, overflow: 'hidden', marginBottom: 14 },
  welcomeHeroGrad: { padding: 26, alignItems: 'center', minHeight: height * 0.26 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.6,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },

  pillsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pillTxt: { fontSize: 10, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    padding: 16,
    paddingBottom: 12,
  },
  cardDivider: { height: 1, backgroundColor: COLORS.border },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagFree: { backgroundColor: '#D1FAE5' },
  tagPro: { backgroundColor: '#E0F7FA' },
  tagTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  tagFreeTxt: { color: '#059669' },
  tagProTxt: { color: '#0891B2' },

  ctaBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  ctaGrad: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },

  // Slides
  slideCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  slideStrip: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    alignItems: 'center',
  },
  slideTagLight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  slideTagTxt: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 0.6 },
  proBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  proBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#0891B2' },
  slideEmojiBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideBody: { padding: 20 },
  slideTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.6,
    marginBottom: 6,
    lineHeight: 28,
  },
  slideDesc: { fontSize: 13, color: COLORS.textSub, lineHeight: 20, marginBottom: 14 },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingTop: 14 },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnTxt: { fontSize: 20, color: COLORS.textSub },
  nextBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  nextGrad: { height: 52, alignItems: 'center', justifyContent: 'center' },
  nextTxt: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },

  // Profile
  profileHero: { borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  profileHeroGrad: { padding: 28, alignItems: 'center', minHeight: height * 0.26 },
  profileEmojiBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  profileHeroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  profileHeroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  profileBody: { flex: 1 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 58,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputBoxFocused: {
    borderColor: '#0891B2',
    shadowColor: '#0891B2',
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  input: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  errorTxt: { color: '#EF4444', fontSize: 13 },
  inputHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 18 },
});
