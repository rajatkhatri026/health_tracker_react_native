import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
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
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import { useMetrics } from '../../hooks/useMetrics';
import { useGoals } from '../../hooks/useGoals';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useSteps } from '../../hooks/useSteps';
import type { MainTabParamList } from '../../navigation/types';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import RingProgress from '../../components/RingProgress/RingProgress';
import NexaraLogo from '../../components/NexaraLogo/NexaraLogo';
import {
  IconBell,
  IconHeart,
  IconDroplet,
  IconMoon,
  IconFlame,
  IconChevronRight,
  IconTarget,
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
                colors={
                  i === todayIdx
                    ? [color1, color2]
                    : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.12)']
                }
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
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const {
    latest,
    weeklyValues,
    loading: mLoading,
    refresh: refreshMetrics,
  } = useMetrics({ days: 7 });
  const { activeGoals, refresh: refreshGoals } = useGoals();
  const { upcoming: upcomingWorkouts, loading: wLoading, refresh: refreshWorkouts } = useWorkouts();
  const {
    todaySteps,
    progress: stepsProgressVal,
    goalSteps: stepsGoalVal,
    refresh: refreshSteps,
  } = useSteps();

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshMetrics(), refreshGoals(), refreshWorkouts(), refreshSteps()]);
  }, [refreshMetrics, refreshGoals, refreshWorkouts, refreshSteps]);

  // Refresh every time user navigates to dashboard
  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll])
  );

  // Steps progress for today's ring
  const stepsNow = todaySteps || (latest['steps']?.value ?? 0);
  const stepsGoal = stepsGoalVal;
  const stepsProgress = stepsProgressVal;
  const stepsPct = Math.round(stepsProgress * 100);

  // Calories burned from activity metric
  const activityVal = latest['activity']?.value ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />

      {/* Background glow */}
      <Svg width={width} height={300} style={{ position: 'absolute', top: 0 }}>
        <Defs>
          <SvgGrad id="hdrG" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.06" />
          </SvgGrad>
        </Defs>
        <Ellipse cx={width * 0.3} cy={-20} rx={200} ry={180} fill="url(#hdrG)" />
        <Circle cx={width * 0.85} cy={120} r={90} fill="#06B6D4" fillOpacity="0.05" />
      </Svg>

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingTop: 56,
          paddingBottom: 8,
        }}
      >
        <NexaraLogo size={36} variant="full" showText textSize={20} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '500' }}>
              {greet()} 👋
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 1 }}>
              {user?.name || 'Athlete'}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: COLORS.bgCard,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconBell size={17} color={COLORS.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20 }}
      >
        {/* ── Today Progress Ring card ─────────────────────────────────── */}
        <LinearGradient
          colors={['#1A1040', '#0D1F3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            borderColor: 'rgba(124,58,237,0.3)',
            marginTop: 20,
            padding: 22,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 12,
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
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>
              {stepsNow.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSub, marginTop: 2 }}>
              steps · {stepsPct}% of {stepsGoal.toLocaleString()} goal
            </Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 18 }}>
              {[
                { label: 'Active', val: `${latest['activity']?.value ?? 0}m`, c: '#A78BFA' },
                {
                  label: 'Burned',
                  val: `${activityVal > 0 ? Math.round(activityVal * 5) : (latest['nutrition']?.value ?? 0)} kcal`,
                  c: '#06B6D4',
                },
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
            label={`${stepsPct}%`}
            sublabel="Done"
          />
        </LinearGradient>

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
                backgroundColor: 'rgba(124,58,237,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconTarget size={18} color="#A78BFA" />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Today Target</Text>
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

        {/* ── Activity Status Grid ──────────────────────────────────────── */}
        <Text
          style={{
            fontSize: 17,
            fontWeight: '800',
            color: '#fff',
            marginTop: 28,
            marginBottom: 14,
            letterSpacing: -0.3,
          }}
        >
          Activity Status
        </Text>
        {mLoading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginVertical: 24 }} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {STAT_CONFIG.map((stat) => {
              const grad = GRAD_MAP[stat.key] ?? ['#7C3AED', '#06B6D4'];
              const metricVal = latest[stat.key]?.value;
              const displayVal = metricVal !== undefined ? String(metricVal) : '0';
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
                    style={{ fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}
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
                    <Sparkline data={sparkData} color={grad[0]} w={(width - 52) / 2 - 32} h={28} />
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}

        {/* ── Workout Progress Chart ────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 28,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }}>
            Workout Progress
          </Text>
          <View
            style={{
              backgroundColor: 'rgba(124,58,237,0.2)',
              borderRadius: RADIUS.full,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '600' }}>Weekly</Text>
          </View>
        </View>
        <GlassCard padding={18}>
          <WeeklyChart values={weeklyValues('steps')} color1="#7C3AED" color2="#06B6D4" />
        </GlassCard>

        {/* ── Upcoming Workouts ─────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 28,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }}>
            Upcoming Workouts
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Workout')}>
            <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '600' }}>See all →</Text>
          </TouchableOpacity>
        </View>

        {wLoading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginVertical: 16 }} />
        ) : upcomingWorkouts.length === 0 ? (
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
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{w.name}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                      {w.exercises.length} exercises · {w.durationMins} mins
                    </Text>
                    <View
                      style={{
                        height: 3,
                        backgroundColor: 'rgba(255,255,255,0.08)',
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
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;
