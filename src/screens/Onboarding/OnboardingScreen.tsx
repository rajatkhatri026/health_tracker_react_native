import React, { useState, useEffect } from 'react';
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
import Svg, { Defs, LinearGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/profile';
import { getPlatformStats, type PlatformStats } from '../../api/stats';
import { useMetrics } from '../../hooks/useMetrics';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useSleep } from '../../hooks/useSleep';
import { COLORS, RADIUS } from '../../utils/theme';
import { IconCheck, IconArrowLeft, IconChevronRight } from '../../components/icons/Icons';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Track Your Goal',
    desc: 'Set personal goals and monitor every milestone. We help you stay on course with smart insights.',
    grad: ['#7C3AED', '#4F46E5'] as [string, string],
    accent: '#A78BFA',
    emoji: '🏆',
    statKey: 'steps' as const,
    statLabel: 'steps today',
  },
  {
    title: 'Burn & Build',
    desc: 'Personalised workout plans that adapt to your pace. Train smarter, not harder.',
    grad: ['#06B6D4', '#0EA5E9'] as [string, string],
    accent: '#67E8F9',
    emoji: '🔥',
    statKey: 'nutrition' as const,
    statLabel: 'kcal today',
  },
  {
    title: 'Eat & Recover',
    desc: 'Nutrition tracking and sleep insights to fuel your body and maximise recovery every day.',
    grad: ['#10B981', '#059669'] as [string, string],
    accent: '#6EE7B7',
    emoji: '🥗',
    statKey: 'sleep' as const,
    statLabel: 'hrs last sleep',
  },
];

// Decorative blob SVG for slide top area
const BlobDecor = ({ color, accent }: { color: string; accent: string }) => (
  <Svg
    width={width}
    height={height * 0.5}
    viewBox={`0 0 ${width} ${height * 0.5}`}
    style={{ position: 'absolute', top: 0, left: 0 }}
  >
    <Defs>
      <LinearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
        <Stop offset="100%" stopColor={accent} stopOpacity="0.1" />
      </LinearGradient>
    </Defs>
    <Ellipse cx={width * 0.5} cy={-30} rx={width * 0.85} ry={height * 0.38} fill="url(#blobGrad)" />
    <Circle cx={width * 0.85} cy={height * 0.12} r={60} fill={accent} fillOpacity="0.08" />
    <Circle cx={width * 0.1} cy={height * 0.3} r={40} fill={color} fillOpacity="0.1" />
  </Svg>
);

type Stage = 'welcome' | 'slides' | 'profile';

const OnboardingScreen: React.FC = () => {
  const { user, completeOnboarding, refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>('welcome');
  const [slideIndex, setSlideIndex] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { latest } = useMetrics({ days: 1 });
  useWorkouts();
  useSleep();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    getPlatformStats().then(setPlatformStats);
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

  // ── Welcome ─────────────────────────────────────────────────────────────────
  if (stage === 'welcome') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StatusBar barStyle="light-content" />
        {/* Radial glow */}
        <Svg width={width} height={height} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="radial" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
              <Stop offset="60%" stopColor="#06B6D4" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#0A0E27" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Ellipse
            cx={width * 0.5}
            cy={height * 0.35}
            rx={width * 0.8}
            ry={height * 0.4}
            fill="url(#radial)"
          />
          <Circle cx={width * 0.15} cy={height * 0.2} r={80} fill="#7C3AED" fillOpacity="0.06" />
          <Circle cx={width * 0.85} cy={height * 0.5} r={120} fill="#06B6D4" fillOpacity="0.05" />
        </Svg>

        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32, gap: 14 }}>
            <NexaraLogo size={80} variant="icon" />
            <Text style={{ fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: -1.5 }}>
              Nex<Text style={{ color: '#A78BFA' }}>ara</Text>
            </Text>
          </View>
          <Text
            style={{
              fontSize: 16,
              color: COLORS.textSub,
              marginTop: 12,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            Your premium fitness companion.{'\n'}Train. Track. Transform.
          </Text>

          {/* Stat previews — real user data */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 48 }}>
            {previewStats.map((s) => (
              <View
                key={s.label}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{s.value}</Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    marginTop: 2,
                    textAlign: 'center',
                  }}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 30, paddingBottom: 52 }}>
          <ExpoLinearGradient
            colors={['#7C3AED', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: RADIUS.full,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setStage('slides')}
              style={{ height: 60, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
                Get Started
              </Text>
            </TouchableOpacity>
          </ExpoLinearGradient>
        </View>
      </View>
    );
  }

  // ── Slides ───────────────────────────────────────────────────────────────────
  if (stage === 'slides') {
    const slide = SLIDES[slideIndex];
    const isLast = slideIndex === SLIDES.length - 1;

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StatusBar barStyle="light-content" />
        <BlobDecor color={slide.grad[0]} accent={slide.accent} />

        {/* Illustration area */}
        <View style={{ height: height * 0.5, alignItems: 'center', justifyContent: 'center' }}>
          {/* Large emoji + glow ring */}
          <View
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: `${slide.grad[0]}22`,
              borderWidth: 1.5,
              borderColor: `${slide.grad[0]}55`,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: slide.grad[0],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 30,
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 72 }}>{slide.emoji}</Text>
          </View>
          {/* Floating stat chip — real data */}
          {(() => {
            const rawVal = latest[slide.statKey]?.value;
            const displayVal = rawVal !== undefined ? String(rawVal) : '0';
            return (
              <View
                style={{
                  position: 'absolute',
                  bottom: height * 0.08,
                  right: width * 0.08,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <Text style={{ color: slide.accent, fontSize: 16, fontWeight: '800' }}>
                  {displayVal}
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '400' }}>
                  {slide.statLabel}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Text + nav */}
        <View style={{ flex: 1, paddingHorizontal: 30 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: '#fff',
              letterSpacing: -0.8,
              lineHeight: 40,
            }}
          >
            {slide.title}
          </Text>
          <Text style={{ fontSize: 15, color: COLORS.textSub, marginTop: 14, lineHeight: 24 }}>
            {slide.desc}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto' as any,
              paddingBottom: 48,
            }}
          >
            {/* Dots */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={{
                    height: 6,
                    borderRadius: 3,
                    width: i === slideIndex ? 28 : 6,
                    backgroundColor: i === slideIndex ? slide.grad[0] : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </View>

            {/* Next button */}
            <ExpoLinearGradient
              colors={slide.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: RADIUS.full,
                shadowColor: slide.grad[0],
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (isLast) {
                    setStage('profile');
                  } else {
                    setSlideIndex((s) => s + 1);
                  }
                }}
                style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}
              >
                <IconChevronRight size={26} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </ExpoLinearGradient>
          </View>
        </View>
      </View>
    );
  }

  // ── Profile Setup ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 30,
          paddingTop: 72,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => setStage('slides')} style={{ marginBottom: 32 }}>
          <IconArrowLeft size={20} color={COLORS.textSub} />
        </TouchableOpacity>

        <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.8 }}>
          What&apos;s your{'\n'}name?
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: COLORS.textSub,
            marginTop: 12,
            marginBottom: 40,
            lineHeight: 24,
          }}
        >
          Personalise your experience so we can set up the right goals for you.
        </Text>

        <View
          style={{
            backgroundColor: COLORS.bgInput,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: RADIUS.md,
            paddingHorizontal: 18,
            height: 56,
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <TextInput
            style={{ fontSize: 15, color: '#fff', fontWeight: '500' }}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            autoFocus
          />
        </View>

        {error ? (
          <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</Text>
        ) : null}

        <ExpoLinearGradient
          colors={['#7C3AED', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: RADIUS.full,
            marginTop: 8,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
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
        </ExpoLinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default OnboardingScreen;
