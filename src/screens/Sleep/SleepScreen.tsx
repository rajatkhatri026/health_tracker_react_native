import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSleep } from '../../hooks/useSleep';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import RingProgress from '../../components/RingProgress/RingProgress';
import { IconMoon, IconAlarm, IconPlus } from '../../components/icons/Icons';

const { width } = Dimensions.get('window');
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_SLEEP = 10;

// SVG sleep wave chart using real data
const SleepWave: React.FC<{ data: number[] }> = ({ data }) => {
  const chartW = width - 80;
  const chartH = 80;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * chartW,
    y: chartH - (Math.min(v, MAX_SLEEP) / MAX_SLEEP) * chartH,
  }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i].x - pts[i - 1].x) / 3;
    d += ` C ${pts[i - 1].x + cpx} ${pts[i - 1].y} ${pts[i].x - cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const fill = `${d} L ${pts[pts.length - 1].x} ${chartH} L 0 ${chartH} Z`;
  const todayIdx = new Date().getDay();
  return (
    <Svg width={chartW} height={chartH + 20}>
      <Defs>
        <SvgGrad id="swFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
        </SvgGrad>
        <SvgGrad id="swLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#7C3AED" />
          <Stop offset="100%" stopColor="#06B6D4" />
        </SvgGrad>
      </Defs>
      <Path d={fill} fill="url(#swFill)" />
      <Path d={d} fill="none" stroke="url(#swLine)" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === todayIdx ? 5 : 3}
          fill={i === todayIdx ? '#7C3AED' : 'rgba(255,255,255,0.3)'}
          stroke={i === todayIdx ? '#A78BFA' : 'none'}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
};

const fmt12 = (time24: string) => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const SleepScreen: React.FC = () => {
  const { schedules, lastNight, weeklyHours, toggle, loading } = useSleep();

  const lastScore = lastNight?.qualityScore ?? 0;
  const lastDur = lastNight?.durationHrs ?? 0;
  const hrs = Math.floor(lastDur);
  const mins = Math.round((lastDur - hrs) * 60);
  const sleepGoalHrs = 8.5;
  const sleepProgress = Math.min(lastDur / sleepGoalHrs, 1);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 56,
          paddingHorizontal: 24,
          paddingBottom: 16,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Sleep Tracker</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20 }}
      >
        {/* Wave chart */}
        <GlassCard style={{ marginTop: 4 }} padding={20}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Sleep History</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DAYS.map((d, i) => (
                <Text
                  key={i}
                  style={{
                    fontSize: 10,
                    color: i === new Date().getDay() ? '#A78BFA' : COLORS.textMuted,
                    fontWeight: i === new Date().getDay() ? '700' : '400',
                  }}
                >
                  {d}
                </Text>
              ))}
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color="#7C3AED" style={{ height: 80 }} />
          ) : (
            <SleepWave data={weeklyHours} />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {['0h', '2h', '4h', '6h', '8h', '10h'].map((l) => (
              <Text key={l} style={{ fontSize: 9, color: COLORS.textMuted }}>
                {l}
              </Text>
            ))}
          </View>
        </GlassCard>

        {/* Last night card */}
        <LinearGradient
          colors={['#1A0A3C', '#0D1230']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            borderColor: 'rgba(124,58,237,0.35)',
            marginTop: 16,
            padding: 22,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 11,
                color: COLORS.textMuted,
                fontWeight: '700',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              LAST NIGHT SLEEP
            </Text>
            {lastNight ? (
              <>
                <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
                  {hrs}
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#A78BFA' }}>h </Text>
                  {mins}
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#A78BFA' }}>m</Text>
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSub, marginTop: 6 }}>
                  {Math.round(sleepProgress * 100)}% of goal ·{' '}
                  {lastScore >= 80 ? 'Excellent' : lastScore >= 60 ? 'Good' : 'Fair'}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 16, color: COLORS.textMuted, marginTop: 4 }}>
                No data yet — log your sleep below.
              </Text>
            )}
            <View style={{ marginTop: 14 }}>
              <View
                style={{
                  height: 8,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={['#7C3AED', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    width: `${Math.round(sleepProgress * 100)}%` as any,
                    borderRadius: 99,
                  }}
                />
              </View>
            </View>
          </View>
          <RingProgress
            size={110}
            strokeWidth={10}
            progress={sleepProgress}
            gradientColors={['#7C3AED', '#A78BFA']}
            label={lastNight ? `${Math.round(sleepProgress * 100)}` : '—'}
            sublabel={lastNight ? 'Score' : ''}
          />
        </LinearGradient>

        {/* Schedules */}
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
          Today Schedule
        </Text>

        {loading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
        ) : schedules.length === 0 ? (
          <GlassCard padding={20}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' }}>
              No schedules set. Add one below.
            </Text>
          </GlassCard>
        ) : (
          schedules.map((item) => {
            const grad: [string, string] =
              item.type === 'bedtime' ? ['#7C3AED', '#4F46E5'] : ['#F59E0B', '#EF4444'];
            const Icon = item.type === 'bedtime' ? IconMoon : IconAlarm;
            return (
              <GlassCard
                key={item.id}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                padding={14}
                glow={grad[0]}
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
                  <Icon size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                    {item.label},{' '}
                    <Text style={{ fontWeight: '400', color: COLORS.textSub }}>
                      {fmt12(item.time)}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                    {item.type === 'bedtime' ? 'Wind-down reminder' : 'Wake-up alarm'}
                  </Text>
                </View>
                {/* Toggle */}
                <TouchableOpacity
                  onPress={() => toggle(item.id)}
                  style={{
                    width: 46,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: item.enabled ? 'transparent' : 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                    padding: 2,
                    overflow: 'hidden',
                  }}
                >
                  {item.enabled && (
                    <LinearGradient
                      colors={grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ ...StyleSheet.absoluteFillObject, borderRadius: 13 }}
                    />
                  )}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#fff',
                      alignSelf: item.enabled ? 'flex-end' : 'flex-start',
                    }}
                  />
                </TouchableOpacity>
              </GlassCard>
            );
          })
        )}

        {/* Add alarm */}
        <TouchableOpacity>
          <GlassCard
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            padding={16}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: 'rgba(124,58,237,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconPlus size={15} color="#A78BFA" strokeWidth={2.5} />
            </View>
            <Text style={{ color: '#A78BFA', fontSize: 14, fontWeight: '600' }}>Add New Alarm</Text>
          </GlassCard>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default SleepScreen;
