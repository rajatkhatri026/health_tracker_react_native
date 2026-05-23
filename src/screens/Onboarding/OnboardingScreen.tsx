import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGrad,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
  Path,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/profile';
import { getPlatformStats, type PlatformStats } from '../../api/stats';
import { useMetrics } from '../../hooks/useMetrics';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useSleep } from '../../hooks/useSleep';
import { RADIUS } from '../../utils/theme';
import { IconCheck, IconArrowLeft, IconChevronRight } from '../../components/icons/Icons';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';

const { width, height } = Dimensions.get('window');
const HERO_H = height * 0.3;

const SLIDES = [
  {
    title: 'Track Your Goal',
    desc: 'Set personal goals and monitor every milestone. We help you stay on course with smart insights.',
    grad: ['#7C3AED', '#4F46E5'] as [string, string],
    accent: '#7C3AED',
    accentLight: '#EDE9FE',
    emoji: '🏆',
    statKey: 'steps' as const,
    statLabel: 'steps today',
  },
  {
    title: 'Burn & Build',
    desc: 'Personalised workout plans that adapt to your pace. Train smarter, not harder.',
    grad: ['#06B6D4', '#0EA5E9'] as [string, string],
    accent: '#0891B2',
    accentLight: '#E0F2FE',
    emoji: '🔥',
    statKey: 'nutrition' as const,
    statLabel: 'kcal today',
  },
  {
    title: 'Eat & Recover',
    desc: 'Nutrition tracking and sleep insights to fuel your body and maximise recovery every day.',
    grad: ['#10B981', '#059669'] as [string, string],
    accent: '#059669',
    accentLight: '#D1FAE5',
    emoji: '🥗',
    statKey: 'sleep' as const,
    statLabel: 'hrs last sleep',
  },
];

// ── Shared hero decor (same as AuthScreen) ───────────────────────────────────
const HeroDecor: React.FC = () => (
  <Svg width={width} height={HERO_H} style={{ position: 'absolute', top: 0 }}>
    <Defs>
      <RadialGradient id="od1" cx="85%" cy="10%" r="55%">
        <Stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.45" />
        <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="od2" cx="10%" cy="90%" r="50%">
        <Stop offset="0%" stopColor="#67E8F9" stopOpacity="0.35" />
        <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
      </RadialGradient>
      <SvgGrad id="odShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor="rgba(255,255,255,0)" />
        <Stop offset="30%" stopColor="rgba(255,255,255,0.35)" />
        <Stop offset="70%" stopColor="rgba(167,139,250,0.5)" />
        <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </SvgGrad>
    </Defs>
    <Ellipse
      cx={width * 0.88}
      cy={HERO_H * 0.1}
      rx={width * 0.55}
      ry={HERO_H * 0.75}
      fill="url(#od1)"
    />
    <Ellipse
      cx={width * 0.08}
      cy={HERO_H * 0.95}
      rx={width * 0.45}
      ry={HERO_H * 0.65}
      fill="url(#od2)"
    />
    <Circle
      cx={width * 0.92}
      cy={HERO_H * 0.18}
      r={32}
      fill="none"
      stroke="rgba(255,255,255,0.12)"
      strokeWidth={1.5}
    />
    <Circle
      cx={width * 0.92}
      cy={HERO_H * 0.18}
      r={52}
      fill="none"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth={1}
    />
    <Circle
      cx={width * 0.06}
      cy={HERO_H * 0.82}
      r={24}
      fill="none"
      stroke="rgba(103,232,249,0.18)"
      strokeWidth={1}
    />
    <Path
      d={`M 0 ${HERO_H - 1} L ${width} ${HERO_H - 1}`}
      stroke="url(#odShimmer)"
      strokeWidth={1.5}
    />
  </Svg>
);

// ── Shared hero panel ─────────────────────────────────────────────────────────
const Hero: React.FC = () => (
  <LinearGradient
    colors={['#1E0B3E', '#5B21B6', '#0C4A6E']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{
      height: HERO_H,
      width: '100%',
      justifyContent: 'flex-end',
      paddingHorizontal: 28,
      paddingBottom: 28,
    }}
  >
    <HeroDecor />
    <View
      style={{
        shadowColor: '#A78BFA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 24,
        elevation: 10,
      }}
    >
      <NexaraLogo size={46} variant="full" showText />
    </View>
    <Text
      style={{
        fontSize: 13,
        color: 'rgba(196,181,253,0.85)',
        marginTop: -4,
        marginLeft: 56,
        fontWeight: '500',
        letterSpacing: 0.4,
      }}
    >
      Your intelligent health companion
    </Text>
  </LinearGradient>
);

type Stage = 'welcome' | 'slides' | 'profile';

const OnboardingScreen: React.FC = () => {
  const { user, completeOnboarding, refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>('welcome');
  const [slideIndex, setSlideIndex] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);

  const { latest } = useMetrics({ days: 1 });
  useWorkouts();
  useSleep();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    getPlatformStats()
      .then(setPlatformStats)
      .catch(() => {});
  }, []);

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M+`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(0)}K+`
        : String(n);

  const previewStats = [
    { label: 'Active Users', value: platformStats ? fmt(platformStats.active_users) : '…' },
    { label: 'Workouts', value: platformStats ? fmt(platformStats.total_workouts) : '…' },
    {
      label: 'Avg Rating',
      value: platformStats
        ? platformStats.avg_rating !== null
          ? `${platformStats.avg_rating.toFixed(1)}★`
          : 'New!'
        : '…',
    },
  ];

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('Name is required');
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

  // ── Welcome ──────────────────────────────────────────────────────────────────
  if (stage === 'welcome') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
        <StatusBar barStyle="light-content" />
        <Hero />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#7C3AED',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            GETTING STARTED
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#0F0F1A',
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            Your premium{'\n'}health companion
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 24 }}>
            Train. Track. Transform.{'\n'}Join thousands already on their journey.
          </Text>

          {/* Stat cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
            {previewStats.map((s) => (
              <View
                key={s.label}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E4E7F0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: '800', color: '#0F0F1A', marginBottom: 2 }}
                >
                  {s.value}
                </Text>
                <Text
                  style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600', textAlign: 'center' }}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <LinearGradient
            colors={['#7C3AED', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setStage('slides')}
              style={{
                height: 58,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Get Started</Text>
              <IconChevronRight size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </View>
    );
  }

  // ── Slides ───────────────────────────────────────────────────────────────────
  if (stage === 'slides') {
    const slide = SLIDES[slideIndex];
    const isLast = slideIndex === SLIDES.length - 1;

    return (
      <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
        <StatusBar barStyle="light-content" />

        {/* Slide hero — colorful gradient, same height */}
        <LinearGradient
          colors={[...slide.grad, slide.grad[1]] as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: HERO_H, width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Subtle rings */}
          <Svg width={width} height={HERO_H} style={{ position: 'absolute' }}>
            <Circle
              cx={width * 0.85}
              cy={HERO_H * 0.2}
              r={50}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
            <Circle
              cx={width * 0.15}
              cy={HERO_H * 0.8}
              r={35}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          </Svg>
          {/* Emoji in glow circle */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 52 }}>{slide.emoji}</Text>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
          {/* Step dots */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 4,
                  borderRadius: 2,
                  width: i === slideIndex ? 28 : 6,
                  backgroundColor: i === slideIndex ? slide.accent : '#D1D5DB',
                }}
              />
            ))}
          </View>

          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#0F0F1A',
              letterSpacing: -0.5,
              marginBottom: 10,
            }}
          >
            {slide.title}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 24 }}>
            {slide.desc}
          </Text>

          {/* Stat chip */}
          {(() => {
            const rawVal = latest[slide.statKey]?.value;
            const displayVal = rawVal !== undefined ? String(rawVal) : '0';
            return (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: slide.accentLight,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 'auto' as any,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: slide.accent }}>
                  {displayVal}
                </Text>
                <Text style={{ fontSize: 12, color: slide.accent, fontWeight: '500' }}>
                  {slide.statLabel}
                </Text>
              </View>
            );
          })()}

          {/* Nav row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 36,
              paddingTop: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => (slideIndex === 0 ? setStage('welcome') : setSlideIndex((i) => i - 1))}
              style={{ padding: 8 }}
            >
              <IconArrowLeft size={20} color="#6B7280" />
            </TouchableOpacity>

            <LinearGradient
              colors={slide.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 30,
                shadowColor: slide.grad[0],
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => (isLast ? setStage('profile') : setSlideIndex((i) => i + 1))}
                style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}
              >
                <IconChevronRight size={24} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    );
  }

  // ── Profile Setup ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F5FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <Hero />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => setStage('slides')} style={{ marginBottom: 28 }}>
          <IconArrowLeft size={20} color="#6B7280" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: '#7C3AED',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          ALMOST THERE
        </Text>
        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: '#0F0F1A',
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          What&apos;s your name?
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 28 }}>
          Personalise your experience so we can set up the right goals for you.
        </Text>

        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: '#6B7280',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          FULL NAME
        </Text>
        <View
          style={{
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: nameFocused ? '#7C3AED' : '#E4E7F0',
            borderRadius: 16,
            paddingHorizontal: 18,
            height: 58,
            justifyContent: 'center',
            marginBottom: 8,
            shadowColor: nameFocused ? '#7C3AED' : '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: nameFocused ? 0.12 : 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <TextInput
            style={{ fontSize: 15, color: '#0F0F1A', fontWeight: '500' }}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor="#C4C9D4"
            autoCapitalize="words"
            autoFocus
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FECACA',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <LinearGradient
          colors={['#7C3AED', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 16,
            marginTop: 8,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={saving}
            style={{
              height: 58,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconCheck size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  Let&apos;s Go
                </Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default OnboardingScreen;
