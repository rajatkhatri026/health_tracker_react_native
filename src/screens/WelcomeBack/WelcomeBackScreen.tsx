import React, { useEffect, useState } from 'react';
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
const DURATION = 3000;

// ── Background mesh ───────────────────────────────────────────────────────────
const BgMesh: React.FC = () => (
  <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
    <Defs>
      <RadialGradient id="m1" cx="80%" cy="5%" r="55%">
        <Stop offset="0%" stopColor="#DDD6FE" stopOpacity="0.9" />
        <Stop offset="100%" stopColor="#DDD6FE" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="m2" cx="10%" cy="55%" r="50%">
        <Stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.6" />
        <Stop offset="100%" stopColor="#BAE6FD" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="m3" cx="90%" cy="88%" r="45%">
        <Stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.5" />
        <Stop offset="100%" stopColor="#C4B5FD" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Ellipse cx={W * 0.8} cy={H * 0.05} rx={W * 0.7} ry={H * 0.35} fill="url(#m1)" />
    <Ellipse cx={W * 0.1} cy={H * 0.55} rx={W * 0.6} ry={H * 0.3} fill="url(#m2)" />
    <Ellipse cx={W * 0.9} cy={H * 0.88} rx={W * 0.55} ry={H * 0.28} fill="url(#m3)" />
  </Svg>
);

// ── Floating orb ──────────────────────────────────────────────────────────────
const ORBS = [
  { x: 0.1, size: 6, delay: 0, dur: 5000, color: '#A78BFA' },
  { x: 0.25, size: 4, delay: 700, dur: 4400, color: '#67E8F9' },
  { x: 0.42, size: 5, delay: 1300, dur: 5200, color: '#818CF8' },
  { x: 0.6, size: 3, delay: 400, dur: 4800, color: '#A78BFA' },
  { x: 0.75, size: 6, delay: 900, dur: 4600, color: '#67E8F9' },
  { x: 0.9, size: 4, delay: 200, dur: 5100, color: '#C4B5FD' },
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
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // animated values
  const logoSc = useState(() => new Animated.Value(0.6))[0];
  const logoOp = useState(() => new Animated.Value(0))[0];
  const tagOp = useState(() => new Animated.Value(0))[0];
  const tagY = useState(() => new Animated.Value(12))[0];
  const card1Op = useState(() => new Animated.Value(0))[0];
  const card1Y = useState(() => new Animated.Value(32))[0];
  const card2Op = useState(() => new Animated.Value(0))[0];
  const card2Y = useState(() => new Animated.Value(32))[0];
  const shimmerX = useState(() => new Animated.Value(-W))[0];

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

    // Card 2 — stats
    Animated.sequence([
      Animated.delay(680),
      Animated.parallel([
        Animated.timing(card2Op, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(card2Y, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 120 }),
      ]),
    ]).start();

    // Shimmer on name
    const sh = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(shimmerX, { toValue: W * 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerX, { toValue: -W, duration: 0, useNativeDriver: true }),
        Animated.delay(4000),
      ])
    );
    sh.start();

    const t = setTimeout(() => navigation.replace('Main'), DURATION);
    return () => {
      clearTimeout(t);
      sh.stop();
    };
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F5FA" />
      <BgMesh />
      {ORBS.map((o, i) => (
        <FloatingOrb key={i} {...o} />
      ))}

      {/* ── TOP: Logo section ── */}
      <View style={s.top}>
        {/* Pulse rings */}
        <View style={{ alignItems: 'center', justifyContent: 'center', width: 120, height: 120 }}>
          <PulseRing delay={0} color="rgba(124,58,237,0.25)" size={100} />
          <PulseRing delay={1000} color="rgba(6,182,212,0.2)" size={100} />

          {/* Logo icon in frosted circle */}
          <Animated.View
            style={[s.logoCircle, { transform: [{ scale: logoSc }], opacity: logoOp }]}
          >
            <NexaraLogo size={52} variant="icon" />
          </Animated.View>
        </View>

        {/* Wordmark + tagline */}
        <Animated.View
          style={{
            opacity: logoOp,
            transform: [{ scale: logoSc }],
            marginTop: 16,
            alignItems: 'center',
          }}
        >
          <NexaraLogo size={28} variant="full" showText theme="light" />
        </Animated.View>
        <Animated.Text style={[s.tagline, { opacity: tagOp, transform: [{ translateY: tagY }] }]}>
          Your intelligent health companion
        </Animated.Text>
      </View>

      {/* ── CARDS ── */}
      <View style={s.cards}>
        {/* Card 1 — greeting */}
        <Animated.View style={{ opacity: card1Op, transform: [{ translateY: card1Y }] }}>
          <View style={s.card}>
            <LinearGradient
              colors={['#7C3AED', '#0891B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.cardBar}
            />
            <Text style={s.labelSmall}>WELCOME BACK</Text>

            {/* Name + shimmer */}
            <View style={{ overflow: 'hidden' }}>
              <Text style={s.nameText}>{firstName} 👋</Text>
              <Animated.View
                style={[StyleSheet.absoluteFill, { transform: [{ translateX: shimmerX }] }]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={['transparent', 'rgba(124,58,237,0.18)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: 140, height: '100%' }}
                />
              </Animated.View>
            </View>

            <Text style={s.subText}>
              Your health journey continues today.{'\n'}Let&apos;s make it count.
            </Text>
          </View>
        </Animated.View>

        {/* Card 2 — stats */}
        <Animated.View style={{ opacity: card2Op, transform: [{ translateY: card2Y }] }}>
          <View style={[s.card, { flexDirection: 'row', paddingVertical: 18 }]}>
            {[
              { emoji: '🔥', label: 'Streak', value: 'Active' },
              { emoji: '✅', label: 'Status', value: 'On track' },
              { emoji: '💪', label: 'Goal', value: 'Crushing' },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={s.statDivider} />}
                <View style={s.statItem}>
                  <Text style={s.statEmoji}>{item.emoji}</Text>
                  <Text style={s.statValue}>{item.value}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FA' },

  top: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: H * 0.09,
    paddingBottom: 20,
  },
  logoCircle: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  tagline: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 8,
  },

  cards: { flex: 1, paddingHorizontal: 20, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  cardBar: { height: 3, borderRadius: 3, marginBottom: 18 },

  labelSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
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
  statDivider: { width: 1, backgroundColor: '#F0EEFF', marginVertical: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#0F0F1A' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.5 },
});

export default WelcomeBackScreen;
