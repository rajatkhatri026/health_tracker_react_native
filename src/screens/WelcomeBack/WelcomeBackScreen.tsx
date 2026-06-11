import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StatusBar,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Ellipse,
  Circle,
  LinearGradient as SvgGrad,
  Path,
  G,
} from 'react-native-svg';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WelcomeBack'>;
const { width: W, height: H } = Dimensions.get('window');

// ── Background mesh ───────────────────────────────────────────────────────────
const BgMesh: React.FC = () => (
  <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
    <Defs>
      <RadialGradient id="m1" cx="80%" cy="5%" r="55%">
        <Stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.9" />
        <Stop offset="100%" stopColor="#BAE6FD" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="m2" cx="10%" cy="55%" r="50%">
        <Stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.6" />
        <Stop offset="100%" stopColor="#BAE6FD" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="m3" cx="90%" cy="88%" r="45%">
        <Stop offset="0%" stopColor="#7DD3E8" stopOpacity="0.5" />
        <Stop offset="100%" stopColor="#7DD3E8" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Ellipse cx={W * 0.8} cy={H * 0.05} rx={W * 0.7} ry={H * 0.35} fill="url(#m1)" />
    <Ellipse cx={W * 0.1} cy={H * 0.55} rx={W * 0.6} ry={H * 0.3} fill="url(#m2)" />
    <Ellipse cx={W * 0.9} cy={H * 0.88} rx={W * 0.55} ry={H * 0.28} fill="url(#m3)" />
  </Svg>
);

// ── Floating orb ──────────────────────────────────────────────────────────────
const ORBS = [
  { x: 0.1, size: 6, delay: 0, dur: 5000, color: '#38BDF8' },
  { x: 0.25, size: 4, delay: 700, dur: 4400, color: '#67E8F9' },
  { x: 0.42, size: 5, delay: 1300, dur: 5200, color: '#06B6D4' },
  { x: 0.6, size: 3, delay: 400, dur: 4800, color: '#38BDF8' },
  { x: 0.75, size: 6, delay: 900, dur: 4600, color: '#67E8F9' },
  { x: 0.9, size: 4, delay: 200, dur: 5100, color: '#7DD3E8' },
];

const FloatingOrb: React.FC<(typeof ORBS)[0]> = ({ x, size, delay, dur, color }) => {
  const ty = useState(() => new Animated.Value(0))[0];
  const op = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(op, { toValue: 0.8, duration: 800, useNativeDriver: true }),
          Animated.timing(ty, { toValue: -H * 0.65, duration: dur, useNativeDriver: true }),
        ]),
        Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x * W - size / 2,
        top: H * 0.92,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: op,
        transform: [{ translateY: ty }],
      }}
    />
  );
};

// ── Pulse ring ────────────────────────────────────────────────────────────────
const PulseRing: React.FC<{ delay: number; color: string; size: number }> = ({
  delay,
  color,
  size,
}) => {
  const sc = useState(() => new Animated.Value(1))[0];
  const op = useState(() => new Animated.Value(0.5))[0];
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(sc, { toValue: 2.4, duration: 2000, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.timing(sc, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.5, duration: 0, useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        transform: [{ scale: sc }],
        opacity: op,
      }}
    />
  );
};

const WelcomeBackScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // animated values
  const logoSc = useState(() => new Animated.Value(0.6))[0];
  const logoOp = useState(() => new Animated.Value(0))[0];
  const tagOp = useState(() => new Animated.Value(0))[0];
  const tagY = useState(() => new Animated.Value(12))[0];
  const card1Op = useState(() => new Animated.Value(0))[0];
  const card1Y = useState(() => new Animated.Value(32))[0];

  const btnOp = useState(() => new Animated.Value(0))[0];
  const btnY = useState(() => new Animated.Value(20))[0];

  useEffect(() => {
    // Logo burst
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(logoSc, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 140 }),
        Animated.timing(logoOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Tagline
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(tagOp, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(tagY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Card 1 — greeting
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(card1Op, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(card1Y, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 120 }),
      ]),
    ]).start();

    // Button
    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(btnOp, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(btnY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 120 }),
      ]),
    ]).start();

    return () => {};
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Gradient Hero ── */}
      <LinearGradient
        colors={['#0C2340', '#0891B2', '#0C4A6E']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + 20 }]}
      >
        {/* Decorative circles */}
        <View
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: 100,
            top: -60,
            right: -60,
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            bottom: -20,
            left: -30,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />

        <Animated.View
          style={{ alignItems: 'center', opacity: logoOp, transform: [{ scale: logoSc }] }}
        >
          {/* Pulse rings + logo */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 100,
              height: 100,
              marginBottom: 16,
            }}
          >
            <PulseRing delay={0} color="rgba(255,255,255,0.2)" size={80} />
            <PulseRing delay={1000} color="rgba(255,255,255,0.12)" size={80} />
            <View style={s.logoCircle}>
              <NexaraLogo size={46} variant="icon" />
            </View>
          </View>

          <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.6 }}>
            Nexara
          </Text>
          <Animated.Text
            style={{
              fontSize: 14,
              color: 'rgba(186,230,253,0.85)',
              fontWeight: '500',
              marginTop: 4,
              opacity: tagOp,
            }}
          >
            Your Health, Your Way.
          </Animated.Text>
        </Animated.View>
      </LinearGradient>

      {/* ── CARDS ── */}
      <View style={s.cards}>
        {/* Card 1 — greeting */}
        <Animated.View
          style={{ opacity: card1Op, transform: [{ translateY: card1Y }], marginTop: 16 }}
        >
          <View style={s.card}>
            <LinearGradient
              colors={['#0891B2', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.cardBar}
            />
            <Text style={s.labelSmall}>WELCOME BACK</Text>
            <Text style={s.nameText}>{firstName} 👋</Text>
            <Text style={s.subText}>
              Your health journey continues today.{'\n'}Let&apos;s make it count.
            </Text>

            <View style={[s.statDivider, { width: '100%', height: 1, marginVertical: 14 }]} />

            <View style={{ flexDirection: 'row' }}>
              {[
                { emoji: '🔥', label: 'Streak', value: 'Active' },
                { emoji: '✅', label: 'Status', value: 'On track' },
                { emoji: '💪', label: 'Goal', value: 'Crushing' },
              ].map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <View style={{ width: 1, backgroundColor: '#E0F7FA', marginVertical: 4 }} />
                  )}
                  <View style={s.statItem}>
                    <Text style={s.statEmoji}>{item.emoji}</Text>
                    <Text style={s.statValue}>{item.value}</Text>
                    <Text style={s.statLabel}>{item.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* CTA — pinned at bottom */}
      <Animated.View
        style={{
          opacity: btnOp,
          transform: [{ translateY: btnY }],
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
        }}
      >
        <TouchableOpacity onPress={() => navigation.replace('Main')} activeOpacity={0.88}>
          <LinearGradient
            colors={['#0891B2', '#0E7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 999, paddingVertical: 17, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.2 }}>
              {"Let's Go 🚀"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FA', justifyContent: 'space-between' },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  logoCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cards: { paddingHorizontal: 20, gap: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  cardBar: { height: 3, borderRadius: 3, marginBottom: 18 },

  labelSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0891B2',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  nameText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F0F1A',
    letterSpacing: -0.8,
  },
  subText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 6,
  },

  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: '#E0F7FA', marginVertical: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#0F0F1A' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.5 },
});

export default WelcomeBackScreen;
