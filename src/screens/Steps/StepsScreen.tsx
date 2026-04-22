import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSteps } from '../../hooks/useSteps';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';

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

  // Ring progress
  const R = 90;
  const stroke = 14;
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1A0A3C', '#0D1F3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 56,
            paddingHorizontal: 24,
            paddingBottom: 32,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 24 }}>
            Step Tracker
          </Text>

          {/* Ring */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Svg width={220} height={220} viewBox="0 0 220 220">
              <Defs>
                <SvgGrad id="stepGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#7C3AED" />
                  <Stop offset="1" stopColor="#06B6D4" />
                </SvgGrad>
              </Defs>
              {/* Track */}
              <Circle
                cx={110}
                cy={110}
                r={R}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={stroke}
                fill="none"
              />
              {/* Progress */}
              <Circle
                cx={110}
                cy={110}
                r={R}
                stroke="url(#stepGrad)"
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(-90 110 110)"
              />
            </Svg>
            {/* Center text overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -2 }}>
                {formatSteps(todaySteps)}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                steps today
              </Text>
              <Text style={{ fontSize: 13, color: '#A78BFA', fontWeight: '700', marginTop: 4 }}>
                {pct}% of goal
              </Text>
            </View>
          </View>

          {/* Goal row */}
          <View
            style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Daily goal:</Text>
            <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>
              {goalSteps.toLocaleString()} steps
            </Text>
          </View>
        </LinearGradient>

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
                <Text style={{ color: '#A78BFA', fontFamily: 'monospace' }}>
                  npx expo run:android
                </Text>{' '}
                or{' '}
                <Text style={{ color: '#A78BFA', fontFamily: 'monospace' }}>npx expo run:ios</Text>{' '}
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
                  colors={['#7C3AED', '#06B6D4']}
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
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Week Total', value: formatSteps(weekTotal), color: '#A78BFA' },
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

          {/* Weekly bar chart */}
          <GlassCard padding={16} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
              This Week
            </Text>
            {loading ? (
              <ActivityIndicator color="#7C3AED" style={{ height: CHART_H }} />
            ) : (
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
                            color: metGoal ? '#10B981' : '#A78BFA',
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
                              ? ['#7C3AED', '#06B6D4']
                              : metGoal
                                ? ['#059669', '#10B981']
                                : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)']
                          }
                          start={{ x: 0, y: 1 }}
                          end={{ x: 0, y: 0 }}
                          style={{ height: barH, borderRadius: 6, width: '100%' }}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 10,
                          color: isToday ? '#A78BFA' : COLORS.textMuted,
                          marginTop: 5,
                          fontWeight: isToday ? '700' : '400',
                        }}
                      >
                        {DAYS[dayIdx].slice(0, 2)}
                      </Text>
                      <Text style={{ fontSize: 9, color: isToday ? '#A78BFA' : COLORS.textMuted }}>
                        {new Date(d.date + 'T12:00:00').getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            {/* Goal line label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <View style={{ width: 12, height: 2, backgroundColor: '#10B981', borderRadius: 1 }} />
              <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                Green = goal reached ({goalSteps.toLocaleString()} steps)
              </Text>
            </View>
          </GlassCard>

          {/* Goal setter */}
          <GlassCard padding={16} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 14 }}>
              Daily Goal
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[5000, 7500, 8000, 10000, 12000, 15000].map((g) => (
                <TouchableOpacity key={g} onPress={() => setGoal(g)}>
                  {goalSteps === g ? (
                    <LinearGradient
                      colors={['#7C3AED', '#06B6D4']}
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
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 6 }}>
                🏆 Best Day This Week
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#A78BFA' }}>
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
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 10 }}>
              How it works
            </Text>
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
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                    {item.title}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 17 }}
                  >
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
};

export default StepsScreen;
