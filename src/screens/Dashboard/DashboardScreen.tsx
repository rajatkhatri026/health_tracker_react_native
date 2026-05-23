/* eslint-disable react-hooks/refs */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Circle,
  Ellipse,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import { fetchWaterRecords, todayKey } from '../../api/water';
import { useAppPreferences } from '../../hooks/useAppPreferences';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkInToday,
  loadStreak,
  loadBadges,
  type StreakData,
  type Badge,
} from '../../utils/streaks';
import { usePremium } from '../../hooks/usePremium';
import { decryptLocal } from '../../utils/localCrypto';

import { useMetrics } from '../../hooks/useMetrics';
import { useGoals } from '../../hooks/useGoals';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useSteps } from '../../hooks/useSteps';
import { useCalories } from '../../hooks/useCalories';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationsSheet from '../../components/NotificationsSheet/NotificationsSheet';
import type { MainTabParamList } from '../../navigation/types';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import RingProgress from '../../components/RingProgress/RingProgress';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';
import { DashboardSkeleton, FadeIn } from '../../components/Skeleton/Skeleton';
import {
  IconBell,
  IconHeart,
  IconDroplet,
  IconMoon,
  IconFlame,
  IconChevronRight,
  IconTarget,
  IconWeight,
  IconAlarm,
  IconDumbbell,
  IconUtensils,
  IconActivity,
  IconTrophy,
  IconStar,
  IconApple,
} from '../../components/icons/Icons';
import type { MetricType } from '../../types';

const { width } = Dimensions.get('window');
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// SVG sparkline
const Sparkline: React.FC<{ data: number[]; color: string; w?: number; h?: number }> = ({
  data,
  color,
  w = 80,
  h = 32,
}) => {
  const filled = data.map((v) => v || 0);
  const max = Math.max(...filled) || 1;
  const min = Math.min(...filled);
  const range = max - min || 1;
  const step = w / (filled.length - 1);
  const pts = filled.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ');
  const gradId = `sp_${color.replace('#', '')}`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGrad id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="1" />
        </SvgGrad>
      </Defs>
      <Path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// Weekly bar chart with real data
const WeeklyChart: React.FC<{ values: number[]; color1: string; color2: string }> = ({
  values,
  color1,
  color2,
}) => {
  const max = Math.max(...values) || 1;
  const todayIdx = new Date().getDay();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
      {values.map((v, i) => {
        const pct = Math.max((v / max) * 100, v > 0 ? 8 : 4);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: '100%',
                height: 80,
                borderRadius: 8,
                overflow: 'hidden',
                justifyContent: 'flex-end',
              }}
            >
              <LinearGradient
                colors={i === todayIdx ? [color1, color2] : ['#F0EEFF', '#F0EEFF']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={{ height: `${pct}%`, borderRadius: 8 }}
              />
            </View>
            <Text
              style={{
                fontSize: 10,
                color: i === todayIdx ? color1 : COLORS.textMuted,
                fontWeight: i === todayIdx ? '700' : '400',
              }}
            >
              {DAYS[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const GRAD_MAP: Record<string, [string, string]> = {
  heart_rate: ['#EC4899', '#F43F5E'],
  water: ['#3B82F6', '#06B6D4'],
  sleep: ['#7C3AED', '#A78BFA'],
  nutrition: ['#F59E0B', '#EF4444'],
};

const WORKOUT_GRADS: [string, string][] = [
  ['#7C3AED', '#A78BFA'],
  ['#3B82F6', '#06B6D4'],
  ['#10B981', '#34D399'],
];

const STAT_CONFIG = [
  {
    key: 'heart_rate' as MetricType,
    label: 'Heart Rate',
    unit: 'BPM',
    Icon: IconHeart,
    glow: '#EC4899',
  },
  { key: 'sleep' as MetricType, label: 'Sleep', unit: 'hrs', Icon: IconMoon, glow: '#7C3AED' },
  {
    key: 'nutrition' as MetricType,
    label: 'Calories',
    unit: 'kcal',
    Icon: IconFlame,
    glow: '#F59E0B',
  },
  { key: 'steps' as MetricType, label: 'Steps', unit: '', Icon: IconDroplet, glow: '#3B82F6' },
];

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [streak, setStreak] = useState<StreakData>({ current: 0, best: 0, lastDay: '' });
  const [badges, setBadges] = useState<Badge[]>([]);
  const { isPremium } = usePremium();

  // ── Premium toast ────────────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPremiumToast = (featureLabel: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastMsg(`🔒 "${featureLabel}" is a premium feature. Upgrade to unlock.`);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    toastTimeout.current = setTimeout(() => setToastMsg(''), 3000);
  };

  const handlePremiumCardPress = (screen: string, label: string) => {
    if (!isPremium) {
      showPremiumToast(label);
      return;
    }
    navigation.navigate(screen as any);
  };

  const {
    latest,
    weeklyValues,
    loading: mLoading,
    refresh: refreshMetrics,
  } = useMetrics({ days: 7 });
  const { activeGoals, refresh: refreshGoals } = useGoals();
  const {
    upcoming: upcomingWorkouts,
    completedToday,
    loading: wLoading,
    refresh: refreshWorkouts,
  } = useWorkouts();
  const {
    todaySteps,
    progress: stepsProgressVal,
    goalSteps: stepsGoalVal,
    refresh: refreshSteps,
  } = useSteps();
  const { todayTotal: caloriesToday } = useCalories();

  const [waterIntake, setWaterIntake] = useState(0);
  const { prefs } = useAppPreferences();
  const [waterGoal, setWaterGoal] = useState(2500);
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    markRead,
    markAllRead,
    remove: removeNotif,
    clearAll: clearAllNotifs,
    load: loadNotifications,
  } = useNotifications();

  // Single unified loading flag — true until both metrics and workouts are ready
  const isLoading = mLoading || wLoading;

  const [s0, s1, s2, s3, s4] = useEntranceAnimation(5, { initialDelay: 60, stagger: 100 });

  const refreshWater = useCallback(async () => {
    try {
      const today = todayKey();

      // 1. Read goal from AsyncStorage directly (same key as WaterIntakeScreen + useAppPreferences)
      const goalEnc = await AsyncStorage.getItem('water_goal_pref').catch(() => null);
      if (goalEnc) {
        const plain = await decryptLocal(goalEnc).catch(() => goalEnc);
        const parsed = parseInt(plain, 10);
        if (!isNaN(parsed)) setWaterGoal(parsed);
      } else {
        setWaterGoal(prefs.dailyWaterGoal);
      }

      // 2. Read intake from local cache first (always up to date — written on every add/swipe)
      const cacheEnc = await AsyncStorage.getItem(`water_intake_v1_${today}`).catch(() => null);
      if (cacheEnc) {
        const plain = await decryptLocal(cacheEnc).catch(() => cacheEnc);
        const cached = JSON.parse(plain);
        if (cached?.intakeMl !== undefined) {
          setWaterIntake(cached.intakeMl);
          return; // local cache is always fresher than backend — no need to fetch
        }
      }

      // 3. Fallback to backend if no local cache
      const records = await fetchWaterRecords(today, today);
      setWaterIntake(records.length > 0 ? records[0].intakeMl : 0);
    } catch {}
  }, [prefs.dailyWaterGoal]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshMetrics(),
      refreshGoals(),
      refreshWorkouts(),
      refreshSteps(),
      refreshWater(),
    ]);
  }, [refreshMetrics, refreshGoals, refreshWorkouts, refreshSteps, refreshWater]);

  // Refresh every time user navigates to dashboard
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      refreshAll().catch(() => {});
      checkInToday().then(setStreak);
      loadBadges().then(setBadges);
    }, [refreshAll])
  );

  // Steps progress for today's ring — use only useSteps hook data (date-scoped to today).
  // Do NOT fall back to latest metrics, which can be from a previous day.
  const stepsNow = todaySteps;
  const stepsGoal = stepsGoalVal;
  const stepsProgress = stepsProgressVal;
  const stepsPct = Math.round(stepsProgress * 100);

  // Active minutes = sum of today's completed workout durations
  const activeMins = completedToday.reduce((sum, w) => sum + w.durationMins, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Background glow */}
      <Svg width={width} height={300} style={{ position: 'absolute', top: 0 }}>
        <Defs>
          <SvgGrad id="hdrG" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.04" />
          </SvgGrad>
        </Defs>
        <Ellipse cx={width * 0.3} cy={-20} rx={200} ry={180} fill="url(#hdrG)" />
        <Circle cx={width * 0.85} cy={120} r={90} fill="#06B6D4" fillOpacity="0.04" />
      </Svg>

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 10,
          paddingBottom: 8,
        }}
      >
        <NexaraLogo size={36} variant="full" showText textSize={20} theme="light" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '500' }}>
              {greet()} 👋
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 1 }}>
              {user?.name || 'Athlete'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: COLORS.bgCard,
              borderWidth: 1,
              borderColor: unreadCount > 0 ? 'rgba(124,58,237,0.5)' : COLORS.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconBell size={17} color={unreadCount > 0 ? '#A78BFA' : COLORS.textSub} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#EF4444',
                  borderWidth: 1.5,
                  borderColor: COLORS.bg,
                }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* ── Skeleton (full screen, shown instantly while loading) ──── */}
        {isLoading && <DashboardSkeleton />}

        {/* ── Real content (fades in once data is ready) ────────────── */}
        <FadeIn visible={!isLoading} style={{ paddingHorizontal: 20 }}>
          {/* ── Today Progress Ring card ─────────────────────────────────── */}
          <Animated.View style={entranceStyle(s0)}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F6FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: RADIUS.xl,
                borderWidth: 1,
                borderColor: '#EDE9FE',
                marginTop: 20,
                padding: 22,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.07,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    fontWeight: '700',
                    letterSpacing: 1,
                    marginBottom: 6,
                  }}
                >
                  TODAY&apos;S PROGRESS
                </Text>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: COLORS.text,
                    letterSpacing: -0.5,
                  }}
                >
                  {stepsNow.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSub, marginTop: 2 }}>
                  steps · {stepsPct}% of {stepsGoal.toLocaleString()} goal
                </Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 18 }}>
                  {[
                    { label: 'Active', val: `${activeMins}m`, c: '#A78BFA' },
                    { label: 'Burned', val: `${caloriesToday} kcal`, c: '#06B6D4' },
                  ].map((s) => (
                    <View key={s.label}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: s.c }}>{s.val}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                        {s.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <RingProgress
                size={120}
                strokeWidth={11}
                progress={stepsProgress}
                gradientColors={['#7C3AED', '#06B6D4']}
                trackColor="#DDD6FE"
                label={`${stepsPct}%`}
                sublabel="Done"
              />
            </LinearGradient>
          </Animated.View>

          {/* ── Water Intake Card ────────────────────────────────────────── */}
          <Animated.View style={entranceStyle(s1)}>
            {(() => {
              const pct = waterGoal > 0 ? Math.min(waterIntake / waterGoal, 1) : 0;
              const pctInt = Math.round(pct * 100);
              const glasses = Math.round(waterIntake / 250);
              const remaining = Math.max(waterGoal - waterIntake, 0);
              const status =
                pct >= 1
                  ? { label: 'Fully Hydrated! 🎉', color: '#10B981' }
                  : pct >= 0.75
                    ? { label: 'Almost there!', color: '#06B6D4' }
                    : pct >= 0.5
                      ? { label: 'Halfway there', color: '#3B82F6' }
                      : pct >= 0.25
                        ? { label: 'Keep drinking', color: '#F59E0B' }
                        : { label: 'Start hydrating', color: '#EF4444' };

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Water')}
                  style={{ marginTop: 16 }}
                >
                  <LinearGradient
                    colors={['#EFF6FF', '#F0FDFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: RADIUS.xl,
                      borderWidth: 1,
                      borderColor: '#DBEAFE',
                      padding: 20,
                      shadowColor: '#7C3AED',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.07,
                      shadowRadius: 16,
                      elevation: 4,
                    }}
                  >
                    {/* Title row */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 18,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <LinearGradient
                          colors={['#1d4ed8', '#0891b2']}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconDroplet size={18} color="#fff" />
                        </LinearGradient>
                        <View>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '800',
                              color: COLORS.text,
                              letterSpacing: -0.3,
                            }}
                          >
                            Water Intake
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: status.color,
                              fontWeight: '600',
                              marginTop: 1,
                            }}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={{
                          backgroundColor: COLORS.tintBlue,
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderWidth: 1,
                          borderColor: '#DBEAFE',
                        }}
                      >
                        <Text style={{ color: '#60A5FA', fontSize: 12, fontWeight: '700' }}>
                          Today
                        </Text>
                      </View>
                    </View>

                    {/* Ring + stats side by side */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                      {/* Ring */}
                      <RingProgress
                        size={110}
                        strokeWidth={10}
                        progress={pct}
                        gradientColors={['#3B82F6', '#06B6D4']}
                        trackColor="#DBEAFE"
                        centerContent={
                          <View style={{ alignItems: 'center' }}>
                            <Text
                              style={{
                                fontSize: 20,
                                fontWeight: '900',
                                color: COLORS.text,
                                letterSpacing: -1,
                              }}
                            >
                              {pctInt}%
                            </Text>
                            <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 1 }}>
                              done
                            </Text>
                          </View>
                        }
                      />

                      {/* Stats column */}

                      <View style={{ flex: 1, gap: 10 }}>
                        {[
                          {
                            label: 'Consumed',
                            value:
                              prefs.waterUnit === 'fl oz'
                                ? `${(waterIntake / 29.5735).toFixed(1)} fl oz`
                                : `${Math.round(waterIntake)} ml`,
                            color: '#60A5FA',
                          },
                          {
                            label: 'Remaining',
                            value:
                              prefs.waterUnit === 'fl oz'
                                ? `${(remaining / 29.5735).toFixed(1)} fl oz`
                                : `${Math.round(remaining)} ml`,
                            color: '#22D3EE',
                          },
                          { label: 'Glasses', value: `${glasses} glasses`, color: '#A78BFA' },
                        ].map((s) => (
                          <View
                            key={s.label}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: s.color,
                                }}
                              />
                              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                                {s.label}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: s.color }}>
                              {s.value}
                            </Text>
                          </View>
                        ))}

                        {/* Mini progress bar */}
                        <View
                          style={{
                            height: 5,
                            backgroundColor: COLORS.tintBlue,
                            borderRadius: 99,
                            overflow: 'hidden',
                            marginTop: 2,
                          }}
                        >
                          <LinearGradient
                            colors={['#3B82F6', '#06B6D4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ height: '100%', width: `${pctInt}%`, borderRadius: 99 }}
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: 10,
                            color: COLORS.textMuted,
                            textAlign: 'right',
                          }}
                        >
                          {prefs.waterUnit === 'fl oz'
                            ? `${(waterIntake / 29.5735).toFixed(1)} / ${(waterGoal / 29.5735).toFixed(1)} fl oz`
                            : `${Math.round(waterIntake)} / ${waterGoal} ml`}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })()}

            {/* ── Today Target ─────────────────────────────────────────────── */}
            <GlassCard
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
              }}
              padding={16}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: COLORS.tintPurple,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconTarget size={18} color="#A78BFA" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>
                    Today Target
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>
                    {upcomingWorkouts.length > 0
                      ? `${upcomingWorkouts.length} workout${upcomingWorkouts.length > 1 ? 's' : ''} remaining`
                      : activeGoals.length > 0
                        ? `${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}`
                        : 'All done for today!'}
                  </Text>
                </View>
              </View>
              <LinearGradient
                colors={['#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: RADIUS.full }}
              >
                <TouchableOpacity
                  onPress={() => navigation.navigate('Workout')}
                  style={{ paddingHorizontal: 18, paddingVertical: 9 }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Check</Text>
                </TouchableOpacity>
              </LinearGradient>
            </GlassCard>
          </Animated.View>

          {/* ── Activity Status Grid ──────────────────────────────────────── */}
          <Animated.View style={entranceStyle(s2)}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '800',
                color: COLORS.text,
                marginTop: 28,
                marginBottom: 14,
                letterSpacing: -0.3,
              }}
            >
              Activity Status
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {STAT_CONFIG.map((stat) => {
                const grad = GRAD_MAP[stat.key] ?? ['#7C3AED', '#06B6D4'];
                const metricVal = latest[stat.key]?.value;
                // Use real-time data for calories and steps
                const displayVal =
                  stat.key === 'nutrition'
                    ? String(caloriesToday)
                    : stat.key === 'steps'
                      ? stepsNow.toLocaleString()
                      : metricVal !== undefined
                        ? String(metricVal)
                        : '0';
                const sparkData = weeklyValues(stat.key);
                return (
                  <GlassCard
                    key={stat.key}
                    style={{ width: (width - 52) / 2 }}
                    padding={16}
                    glow={stat.glow}
                  >
                    <LinearGradient
                      colors={[`${grad[0]}22`, `${grad[1]}11`]}
                      style={{
                        position: 'absolute',
                        borderRadius: RADIUS.lg,
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                      }}
                    />
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: `${grad[0]}30`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <stat.Icon size={17} color={grad[0]} />
                    </View>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>
                      {stat.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: COLORS.text,
                        letterSpacing: -0.5,
                      }}
                    >
                      {displayVal}
                      {stat.unit ? (
                        <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textSub }}>
                          {' '}
                          {stat.unit}
                        </Text>
                      ) : null}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      <Sparkline
                        data={sparkData}
                        color={grad[0]}
                        w={(width - 52) / 2 - 32}
                        h={28}
                      />
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Workout Progress Chart ────────────────────────────────────── */}
          <Animated.View style={entranceStyle(s3)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 28,
                marginBottom: 14,
              }}
            >
              <Text
                style={{ fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 }}
              >
                Workout Progress
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.tintPurple,
                  borderRadius: RADIUS.full,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                  Weekly
                </Text>
              </View>
            </View>
            <GlassCard padding={18}>
              <WeeklyChart values={weeklyValues('steps')} color1="#7C3AED" color2="#06B6D4" />
            </GlassCard>
          </Animated.View>

          {/* ── Upcoming Workouts ─────────────────────────────────────────── */}
          <Animated.View style={entranceStyle(s4)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 28,
                marginBottom: 14,
              }}
            >
              <Text
                style={{ fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 }}
              >
                Upcoming Workouts
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Workout')}>
                <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                  See all →
                </Text>
              </TouchableOpacity>
            </View>

            {upcomingWorkouts.length === 0 ? (
              <GlassCard padding={20}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' }}>
                  No upcoming workouts. Add one in Workout tab.
                </Text>
              </GlassCard>
            ) : (
              upcomingWorkouts.slice(0, 3).map((w, i) => {
                const grad = WORKOUT_GRADS[i % WORKOUT_GRADS.length];
                const scheduledDate = new Date(w.scheduledAt);
                const isToday = scheduledDate.toDateString() === new Date().toDateString();
                const timeStr = isToday
                  ? `Today, ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
                    ', ' +
                    scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <TouchableOpacity
                    key={w.id}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Workout')}
                  >
                    <GlassCard
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                      padding={14}
                    >
                      <LinearGradient
                        colors={grad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>
                          {w.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                          {(w.exercises ?? []).length} exercises · {w.durationMins} mins
                        </Text>
                        <View
                          style={{
                            height: 3,
                            backgroundColor: '#F0EEFF',
                            borderRadius: 99,
                            marginTop: 8,
                            overflow: 'hidden',
                          }}
                        >
                          <LinearGradient
                            colors={grad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              height: '100%',
                              width: w.status === 'completed' ? '100%' : '30%',
                              borderRadius: 99,
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
                          {timeStr}
                        </Text>
                      </View>
                      <IconChevronRight size={16} color={COLORS.textMuted} />
                    </GlassCard>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>

          {/* ── Streak + Badges ───────────────────────────────────────────── */}
          <Animated.View style={entranceStyle(s4)}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '800',
                color: COLORS.text,
                marginTop: 28,
                marginBottom: 14,
                letterSpacing: -0.3,
              }}
            >
              Your Streak
            </Text>
            {/* Streak row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Current streak card */}
              <GlassCard style={{ flex: 1 }} padding={16} glow="#EF4444">
                <LinearGradient
                  colors={['#EF444422', '#DC262611']}
                  style={{
                    position: 'absolute',
                    borderRadius: RADIUS.lg,
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                />
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#EF444430',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                </View>
                <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>
                  Current Streak
                </Text>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '900',
                    color: COLORS.text,
                    letterSpacing: -0.8,
                  }}
                >
                  {streak.current}
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSub }}>
                    {' '}
                    days
                  </Text>
                </Text>
              </GlassCard>
              {/* Best streak */}
              <GlassCard style={{ flex: 1 }} padding={16} glow="#F59E0B">
                <LinearGradient
                  colors={['#F59E0B22', '#D9770611']}
                  style={{
                    position: 'absolute',
                    borderRadius: RADIUS.lg,
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                />
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#F59E0B30',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                </View>
                <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>
                  Best Streak
                </Text>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '900',
                    color: COLORS.text,
                    letterSpacing: -0.8,
                  }}
                >
                  {streak.best}
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSub }}>
                    {' '}
                    days
                  </Text>
                </Text>
              </GlassCard>
            </View>
            {/* Badges */}
            {badges.length > 0 && (
              <View style={{ marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {badges.map((b) => (
                  <View
                    key={b.id}
                    style={{
                      backgroundColor: '#EDE9FE',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      borderWidth: 1,
                      borderColor: '#DDD6FE',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{b.emoji}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>
                      {b.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* ── Quick Tools — Free ────────────────────────────────────────── */}
          <Animated.View style={{ paddingBottom: 4 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '800',
                color: COLORS.text,
                marginTop: 28,
                marginBottom: 14,
                letterSpacing: -0.3,
              }}
            >
              Quick Tools
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {(
                [
                  {
                    screen: 'WeightProgress',
                    label: 'Weight Log',
                    sub: 'BMI · Body fat',
                    Icon: IconWeight,
                    grad: ['#7C3AED', '#4F46E5'] as const,
                    glow: '#7C3AED',
                    premium: false,
                  },
                  {
                    screen: 'FastingTimer',
                    label: 'Fasting Timer',
                    sub: '16:8 · OMAD · 18:6',
                    Icon: IconAlarm,
                    grad: ['#06B6D4', '#0891B2'] as const,
                    glow: '#06B6D4',
                    premium: false,
                  },
                  {
                    screen: 'ExerciseLibrary',
                    label: 'Exercises',
                    sub: '50 moves',
                    Icon: IconDumbbell,
                    grad: ['#10B981', '#059669'] as const,
                    glow: '#10B981',
                    premium: false,
                  },
                ] as {
                  screen: string;
                  label: string;
                  sub: string;
                  Icon: React.FC<any>;
                  grad: readonly [string, string];
                  glow: string;
                  premium: boolean;
                }[]
              ).map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  onPress={() => navigation.navigate(item.screen as any)}
                  activeOpacity={0.88}
                  style={{ width: (width - 52) / 2 }}
                >
                  <GlassCard padding={16} glow={item.glow} style={{ minHeight: 116 }}>
                    <LinearGradient
                      colors={[`${item.grad[0]}22`, `${item.grad[1]}11`]}
                      style={{
                        position: 'absolute',
                        borderRadius: RADIUS.lg,
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                      }}
                    />
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: `${item.grad[0]}30`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <item.Icon size={17} color={item.grad[0]} />
                    </View>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>
                      {item.label}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: COLORS.text,
                          letterSpacing: -0.2,
                          flexShrink: 1,
                        }}
                      >
                        {item.sub}
                      </Text>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          backgroundColor: `${item.grad[0]}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 6,
                        }}
                      >
                        <IconChevronRight size={11} color={item.grad[0]} />
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* ── Premium Features ─────────────────────────────────────────── */}
          <Animated.View style={{ paddingBottom: 28 }}>
            {/* Section header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 24,
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '800',
                    color: COLORS.text,
                    letterSpacing: -0.3,
                  }}
                >
                  Premium Features
                </Text>
                <View
                  style={{
                    backgroundColor: '#EDE9FE',
                    borderRadius: RADIUS.full,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: '#DDD6FE',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#7C3AED' }}>👑 PRO</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Paywall' as any)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#7C3AED',
                  borderRadius: RADIUS.full,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Upgrade →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {(
                [
                  {
                    screen: 'AICoach',
                    label: 'AI Coach',
                    sub: 'Personal AI health',
                    Icon: IconActivity,
                    grad: ['#7C3AED', '#4F46E5'] as const,
                    glow: '#7C3AED',
                  },
                  {
                    screen: 'MealPlanner',
                    label: 'Meal Planner',
                    sub: 'Goal-based plans',
                    Icon: IconUtensils,
                    grad: ['#F59E0B', '#D97706'] as const,
                    glow: '#F59E0B',
                  },
                  {
                    screen: 'BarcodeScanner',
                    label: 'Food Scanner',
                    sub: 'Scan any barcode',
                    Icon: IconApple,
                    grad: ['#EC4899', '#BE185D'] as const,
                    glow: '#EC4899',
                  },
                  {
                    screen: 'WorkoutPrograms',
                    label: 'Programs',
                    sub: 'PPL · 5×5 · HIIT',
                    Icon: IconTrophy,
                    grad: ['#EF4444', '#DC2626'] as const,
                    glow: '#EF4444',
                  },
                  {
                    screen: 'WeeklyReport',
                    label: 'Weekly Report',
                    sub: 'Progress',
                    Icon: IconStar,
                    grad: ['#8B5CF6', '#7C3AED'] as const,
                    glow: '#8B5CF6',
                  },
                ] as {
                  screen: string;
                  label: string;
                  sub: string;
                  Icon: React.FC<any>;
                  grad: readonly [string, string];
                  glow: string;
                }[]
              ).map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  onPress={() => handlePremiumCardPress(item.screen, item.label)}
                  activeOpacity={isPremium ? 0.88 : 1}
                  style={{ width: (width - 52) / 2 }}
                >
                  <GlassCard
                    padding={16}
                    glow={isPremium ? item.glow : '#CBD5E1'}
                    style={{ minHeight: 116, opacity: isPremium ? 1 : 0.72 }}
                  >
                    <LinearGradient
                      colors={[`${item.grad[0]}22`, `${item.grad[1]}11`]}
                      style={{
                        position: 'absolute',
                        borderRadius: RADIUS.lg,
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                      }}
                    />
                    {/* Lock badge for non-premium */}
                    {!isPremium && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          backgroundColor: '#EDE9FE',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 10 }}>🔒</Text>
                      </View>
                    )}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: `${item.grad[0]}30`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <item.Icon size={17} color={item.grad[0]} />
                    </View>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>
                      {item.label}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: COLORS.text,
                          letterSpacing: -0.2,
                          flexShrink: 1,
                        }}
                      >
                        {item.sub}
                      </Text>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          backgroundColor: `${item.grad[0]}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 6,
                        }}
                      >
                        <IconChevronRight size={11} color={item.grad[0]} />
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </FadeIn>
      </ScrollView>

      <NotificationsSheet
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={notifLoading}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onDelete={removeNotif}
        onClearAll={clearAllNotifs}
        onOpen={loadNotifications}
      />

      {/* Premium toast */}
      {!!toastMsg && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 110,
            left: 20,
            right: 20,
            backgroundColor: '#1E1033',
            borderRadius: 14,
            paddingVertical: 13,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            opacity: toastAnim,
            transform: [
              { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600', flex: 1, lineHeight: 18 }}>
            {toastMsg}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

export default DashboardScreen;
