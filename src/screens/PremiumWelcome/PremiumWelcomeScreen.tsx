import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';

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

const STARS = [
  { x: 0.07, y: 0.07, emoji: '⭐', delay: 0 },
  { x: 0.88, y: 0.1, emoji: '✨', delay: 120 },
  { x: 0.18, y: 0.22, emoji: '💫', delay: 240 },
  { x: 0.8, y: 0.2, emoji: '🌟', delay: 360 },
  { x: 0.04, y: 0.5, emoji: '✨', delay: 480 },
  { x: 0.92, y: 0.45, emoji: '⭐', delay: 600 },
  { x: 0.22, y: 0.78, emoji: '🌟', delay: 720 },
  { x: 0.78, y: 0.75, emoji: '💫', delay: 840 },
  { x: 0.48, y: 0.04, emoji: '⭐', delay: 960 },
  { x: 0.55, y: 0.92, emoji: '✨', delay: 1080 },
  { x: 0.33, y: 0.88, emoji: '💫', delay: 1200 },
  { x: 0.68, y: 0.9, emoji: '🌟', delay: 1320 },
  { x: 0.6, y: 0.15, emoji: '✨', delay: 150 },
  { x: 0.12, y: 0.4, emoji: '⭐', delay: 850 },
  { x: 0.88, y: 0.65, emoji: '💫', delay: 550 },
];

export default function PremiumWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const plan: 'monthly' | 'yearly' = route.params?.plan ?? 'yearly';

  const [bgOpacity] = useState(() => new Animated.Value(0));
  const [bgScale] = useState(() => new Animated.Value(0.7));
  const [crownScale] = useState(() => new Animated.Value(0));
  const [crownRot] = useState(() => new Animated.Value(-20));
  const [titleY] = useState(() => new Animated.Value(32));
  const [titleOp] = useState(() => new Animated.Value(0));
  const [subY] = useState(() => new Animated.Value(22));
  const [subOp] = useState(() => new Animated.Value(0));
  const [badgesY] = useState(() => new Animated.Value(24));
  const [badgesOp] = useState(() => new Animated.Value(0));
  const [btnY] = useState(() => new Animated.Value(20));
  const [btnOp] = useState(() => new Animated.Value(0));
  const [shimmer] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(bgScale, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(crownScale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(crownRot, { toValue: 0, tension: 50, friction: 6, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(340),
      Animated.parallel([
        Animated.spring(titleY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(480),
      Animated.parallel([
        Animated.spring(subY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(subOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(620),
      Animated.parallel([
        Animated.spring(badgesY, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
        Animated.timing(badgesOp, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.spring(btnY, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
        Animated.timing(btnOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const crownRotInterp = crownRot.interpolate({
    inputRange: [-20, 0],
    outputRange: ['-20deg', '0deg'],
  });

  const shimmerBg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(124,58,237,0.06)', 'rgba(124,58,237,0.16)'],
  });

  const goHome = () => navigation.navigate('Main', { screen: 'Home' });

  return (
    <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      {/* Static stars — fade in only, no movement */}
      {STARS.map((star, i) => (
        <Text
          key={i}
          style={{
            position: 'absolute',
            left: star.x * SW,
            top: star.y * SH,
            fontSize: 18,
            opacity: 0.55,
          }}
        >
          {star.emoji}
        </Text>
      ))}

      {/* Glow blobs */}
      <Animated.View
        style={[s.glowBlob, { opacity: bgOpacity, transform: [{ scale: bgScale }] }]}
      />
      <Animated.View
        style={[s.glowBlob2, { opacity: bgOpacity, transform: [{ scale: bgScale }] }]}
      />

      {/* Logo */}
      <Animated.View
        style={{ transform: [{ scale: crownScale }, { rotate: crownRotInterp }], marginBottom: 24 }}
      >
        <View style={s.logoWrap}>
          <NexaraLogo size={56} variant="icon" />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text style={[s.title, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
        Welcome to{'\n'}
        <Text style={s.titleAccent}>Nexara Premium!</Text>
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[s.sub, { opacity: subOp, transform: [{ translateY: subY }] }]}>
        Your {plan === 'yearly' ? 'yearly' : 'monthly'} subscription is active.{'\n'}
        All features are unlocked and ready.
      </Animated.Text>

      {/* Features grid */}
      <Animated.View
        style={[s.featWrap, { opacity: badgesOp, transform: [{ translateY: badgesY }] }]}
      >
        <Animated.View style={[s.featCard, { backgroundColor: shimmerBg }]}>
          <Text style={s.featLabel}>Everything Unlocked</Text>
          <View style={s.featGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.chip}>
                <Text style={{ fontSize: 13 }}>{f.emoji}</Text>
                <Text style={s.chipTxt}>{f.label}</Text>
                <Text style={s.chipTick}>✓</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </Animated.View>

      {/* CTA */}
      <Animated.View style={[s.btnWrap, { opacity: btnOp, transform: [{ translateY: btnY }] }]}>
        <TouchableOpacity
          onPress={goHome}
          activeOpacity={0.88}
          style={{ borderRadius: RADIUS.full, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#0891B2', '#0E7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.btn}
          >
            <Text style={s.btnTxt}>Start Using Premium →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glowBlob: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(124,58,237,0.07)',
    top: '15%',
  },
  glowBlob2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(79,70,229,0.05)',
    bottom: '18%',
    right: '5%',
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.9,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  titleAccent: { color: '#0891B2' },
  sub: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  featWrap: { width: '100%', marginBottom: 28 },
  featCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  featLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  chipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  chipTick: { fontSize: 11, color: '#10B981', fontWeight: '900' },
  btnWrap: { width: '100%' },
  btn: { paddingVertical: 18, alignItems: 'center', borderRadius: RADIUS.full },
  btnTxt: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },
});
