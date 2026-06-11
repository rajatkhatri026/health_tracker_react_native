import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Animated,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import { useScrollToTopOnTabPress } from '../../hooks/useScrollToTopOnTabPress';

import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSteps } from '../../hooks/useSteps';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import { StepsSkeleton } from '../../components/Skeleton/Skeleton';

const CHART_H = 120;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatSteps = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const StepsScreen: React.FC = () => {
  const {
    todaySteps,
    weeklySteps,
    goalSteps,
    progress,
    loading,
    supported,
    permissionGranted,
    refresh,
    setGoal,
  } = useSteps();

  const [ss0, ss1, ss2, ss3] = useEntranceAnimation(4, { initialDelay: 60, stagger: 110 });
  const scrollRef = useScrollToTopOnTabPress();
  const refreshRef = React.useRef(refresh);
  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      refreshRef.current();
    }, [])
  );

  const maxSteps = Math.max(...weeklySteps.map((d) => d.steps), goalSteps, 1);
  const pct = Math.round(progress * 100);

  // Ring
  const R = 66;
  const stroke = 12;
  const circumference = 2 * Math.PI * R;
  const strokeDash = circumference * Math.min(progress, 1);

  // Stats
  const weekTotal = weeklySteps.reduce((s, d) => s + d.steps, 0);
  const weekAvg = weeklySteps.length > 0 ? Math.round(weekTotal / weeklySteps.length) : 0;
  const bestDay = weeklySteps.reduce((best, d) => (d.steps > best.steps ? d : best), {
    date: '',
    steps: 0,
  });
  const activeDays = weeklySteps.filter((d) => d.steps >= goalSteps).length;

  if (loading) {
    return <StepsSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero — fixed, not scrollable */}
      <Animated.View style={entranceStyle(ss0)}>
        <LinearGradient
          colors={['#0C2340', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 280,
            paddingTop: 56,
            paddingHorizontal: 24,
            paddingBottom: 16,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: 100,
              top: -60,
              right: -50,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              bottom: -30,
              left: -30,
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          />

          {/* Title */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: '#fff',
              marginBottom: 16,
              marginTop: 7,
            }}
          >
            Step Tracker
          </Text>

          {/* Ring (left) + chips (right) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {/* Ring — 160×160 */}
            <View
              style={{ alignItems: 'center', justifyContent: 'center', width: 160, height: 160 }}
            >
              <Svg width={160} height={160} viewBox="0 0 160 160">
                <Defs>
                  <SvgGrad id="stepGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#fff" />
                    <Stop offset="1" stopColor="rgba(186,230,253,0.85)" />
                  </SvgGrad>
                </Defs>
                <Circle
                  cx={80}
                  cy={80}
                  r={R}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={stroke}
                  fill="none"
                />
                <Circle
                  cx={80}
                  cy={80}
                  r={R}
                  stroke="url(#stepGrad)"
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                />
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text
                  style={{ fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -1.2 }}
                >
                  {formatSteps(todaySteps)}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: 'rgba(186,230,253,0.8)',
                    fontWeight: '600',
                    marginTop: 2,
                  }}
                >
                  steps today
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: 'rgba(186,230,253,0.9)',
                    marginTop: 4,
                  }}
                >
                  {pct}%
                </Text>
              </View>
            </View>

            {/* Chips */}
            <View style={{ flex: 1, gap: 10 }}>
              {[
                { label: 'GOAL', value: formatSteps(goalSteps) },
                { label: 'REMAINING', value: formatSteps(Math.max(goalSteps - todaySteps, 0)) },
                { label: 'THIS WEEK', value: formatSteps(weekTotal) },
              ].map((s, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.15)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '700',
                      color: 'rgba(186,230,253,0.7)',
                      letterSpacing: 0.5,
                    }}
                  >
                    {s.label}
                  </Text>
                  <Text
                    style={{ fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }}
                  >
                    {s.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Scrollable content */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {/* Not supported banner */}
          {!supported && (
            <GlassCard
              padding={16}
              style={{ marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }}
            >
              <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                📱 Native step tracking not available
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 18 }}>
                Step counting requires a native dev build.{'\n'}
                Run{' '}
                <Text style={{ color: COLORS.primary, fontFamily: 'monospace' }}>
                  npx expo run:android
                </Text>{' '}
                or{' '}
                <Text style={{ color: COLORS.primary, fontFamily: 'monospace' }}>
                  npx expo run:ios
                </Text>{' '}
                to enable real step tracking.
              </Text>
            </GlassCard>
          )}

          {/* Permission denied banner */}
          {supported && !permissionGranted && !loading && (
            <GlassCard
              padding={16}
              style={{ marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                ⚠️ Permission required
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 18 }}>
                Allow Nexara to access Motion & Fitness in your device settings to track steps.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('app-settings:')}
                style={{ marginTop: 10 }}
              >
                <LinearGradient
                  colors={['#0891B2', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: RADIUS.full,
                    paddingVertical: 8,
                    paddingHorizontal: 20,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    Grant Permission
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* Weekly stats */}
          <Animated.View style={entranceStyle(ss1)}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Week Total', value: formatSteps(weekTotal), color: COLORS.primary },
                { label: 'Daily Avg', value: formatSteps(weekAvg), color: '#06B6D4' },
                { label: 'Goal Days', value: `${activeDays}/7`, color: '#10B981' },
              ].map((s) => (
                <GlassCard key={s.label} style={{ flex: 1, alignItems: 'center' }} padding={14}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.value}</Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: COLORS.textMuted,
                      marginTop: 3,
                      textAlign: 'center',
                    }}
                  >
                    {s.label}
                  </Text>
                </GlassCard>
              ))}
            </View>
          </Animated.View>
          {/* Weekly bar chart */}
          <Animated.View style={entranceStyle(ss2)}>
            <GlassCard padding={16} style={{ marginBottom: 20 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
              >
                <View
                  style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }}
                />
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                  This Week
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 6,
                  height: CHART_H + 36,
                }}
              >
                {weeklySteps.map((d, i) => {
                  const barH = Math.max((d.steps / maxSteps) * CHART_H, d.steps > 0 ? 8 : 3);
                  const isToday = i === weeklySteps.length - 1;
                  const metGoal = d.steps >= goalSteps;
                  const dayIdx = new Date(d.date + 'T12:00:00').getDay();
                  return (
                    <View
                      key={d.date}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: CHART_H + 36,
                      }}
                    >
                      {d.steps > 0 && (
                        <Text
                          style={{
                            fontSize: 9,
                            color: metGoal ? '#10B981' : COLORS.primary,
                            fontWeight: '700',
                            marginBottom: 3,
                          }}
                        >
                          {formatSteps(d.steps)}
                        </Text>
                      )}
                      {/* Goal line marker */}
                      <View style={{ width: '100%', height: CHART_H, justifyContent: 'flex-end' }}>
                        <LinearGradient
                          colors={
                            isToday
                              ? ['#0891B2', '#06B6D4']
                              : metGoal
                                ? ['#059669', '#10B981']
                                : ['#E0F7FA', '#BAE6FD']
                          }
                          start={{ x: 0, y: 1 }}
                          end={{ x: 0, y: 0 }}
                          style={{ height: barH, borderRadius: 6, width: '100%' }}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 10,
                          color: isToday ? COLORS.primary : COLORS.textMuted,
                          marginTop: 5,
                          fontWeight: isToday ? '700' : '400',
                        }}
                      >
                        {DAYS[dayIdx].slice(0, 2)}
                      </Text>
                      <Text
                        style={{ fontSize: 9, color: isToday ? COLORS.primary : COLORS.textMuted }}
                      >
                        {new Date(d.date + 'T12:00:00').getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {/* Goal line label */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <View
                  style={{ width: 12, height: 2, backgroundColor: '#10B981', borderRadius: 1 }}
                />
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Green = goal reached ({goalSteps.toLocaleString()} steps)
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
          {/* Goal setter */}
          <Animated.View style={entranceStyle(ss3)}>
            <GlassCard padding={16} style={{ marginBottom: 20 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}
              >
                <View
                  style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }}
                />
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                  Daily Goal
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[5000, 7500, 8000, 10000, 12000, 15000].map((g) => (
                  <TouchableOpacity key={g} onPress={() => setGoal(g)}>
                    {goalSteps === g ? (
                      <LinearGradient
                        colors={['#0891B2', '#06B6D4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          borderRadius: RADIUS.full,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                          {g.toLocaleString()}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          borderRadius: RADIUS.full,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          backgroundColor: COLORS.bgCard,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <Text style={{ color: COLORS.textSub, fontSize: 12 }}>
                          {g.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>

            {/* Best day */}
            {bestDay.steps > 0 && (
              <GlassCard padding={16} style={{ marginBottom: 20 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 }}
                >
                  🏆 Best Day This Week
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.primary }}>
                  {bestDay.steps.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                  {new Date(bestDay.date + 'T12:00:00').toLocaleDateString([], {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </GlassCard>
            )}

            {/* How it works */}
            <GlassCard padding={16}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
              >
                <View
                  style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }}
                />
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                  How it works
                </Text>
              </View>
              {[
                {
                  icon: '📱',
                  title: 'Hardware counting',
                  desc: "Your phone's motion coprocessor counts steps in the background — no battery drain.",
                },
                {
                  icon: '🔄',
                  title: 'Auto sync',
                  desc: 'Steps sync automatically when you open the app or return from background.',
                },
                {
                  icon: '☁️',
                  title: 'Cloud backup',
                  desc: 'Daily step counts are saved to your Nexara account for history and trends.',
                },
              ].map((item) => (
                <View key={item.title} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text }}>
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        marginTop: 2,
                        lineHeight: 17,
                      }}
                    >
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
};

export default StepsScreen;
