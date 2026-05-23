import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { COLORS, RADIUS } from '../../utils/theme';

const STORAGE_KEY = 'nexara_fasting_state';
const { width: W } = Dimensions.get('window');
const RING_SIZE = W * 0.62;
const RING_STROKE = 14;
const R = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * R;

// ── Fasting protocols ─────────────────────────────────────────────────────────
const PROTOCOLS = [
  {
    id: '16:8',
    label: '16:8',
    fastHours: 16,
    eatHours: 8,
    title: 'LeanGains',
    desc: 'Fast 16h · Eat 8h · Most popular protocol',
    color: '#7C3AED',
    grad: ['#7C3AED', '#4F46E5'] as const,
  },
  {
    id: '18:6',
    label: '18:6',
    fastHours: 18,
    eatHours: 6,
    title: 'Warrior Diet',
    desc: 'Fast 18h · Eat 6h · Accelerated fat burning',
    color: '#06B6D4',
    grad: ['#06B6D4', '#0891B2'] as const,
  },
  {
    id: '20:4',
    label: '20:4',
    fastHours: 20,
    eatHours: 4,
    title: 'Aggressive',
    desc: 'Fast 20h · Eat 4h · Advanced practitioners',
    color: '#8B5CF6',
    grad: ['#8B5CF6', '#7C3AED'] as const,
  },
  {
    id: 'OMAD',
    label: 'OMAD',
    fastHours: 23,
    eatHours: 1,
    title: 'One Meal',
    desc: 'Fast 23h · Eat 1h · Maximum discipline',
    color: '#EC4899',
    grad: ['#EC4899', '#BE185D'] as const,
  },
  {
    id: '5:2',
    label: '5:2',
    fastHours: 0,
    eatHours: 0,
    title: '5:2 Diet',
    desc: '5 normal days · 2 very low calorie days',
    color: '#F59E0B',
    grad: ['#F59E0B', '#D97706'] as const,
  },
  {
    id: '24h',
    label: '24h',
    fastHours: 24,
    eatHours: 0,
    title: '24h Fast',
    desc: 'Full day fast · Once or twice a week',
    color: '#10B981',
    grad: ['#10B981', '#059669'] as const,
  },
];

type FastState = {
  startTime: number | null; // epoch ms
  protocolId: string;
  isActive: boolean;
};

const fmt = (ms: number) => {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
};

const FastingTimerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [selected, setSelected] = useState(PROTOCOLS[0]);
  const [fastState, setFastState] = useState<FastState>({
    startTime: null,
    protocolId: '16:8',
    isActive: false,
  });
  const [elapsed, setElapsed] = useState(0); // ms elapsed
  const [loaded, setLoaded] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist + restore fast state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved: FastState = JSON.parse(raw);
          setFastState(saved);
          const proto = PROTOCOLS.find((p) => p.id === saved.protocolId) ?? PROTOCOLS[0];
          setSelected(proto);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = useCallback((state: FastState) => {
    setFastState(state);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, []);

  // Tick
  useEffect(() => {
    if (!fastState.isActive || !fastState.startTime) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    const tick = () => setElapsed(Date.now() - fastState.startTime!);
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [fastState.isActive, fastState.startTime]);

  const targetMs = selected.fastHours * 3600 * 1000;
  const progress = targetMs > 0 ? Math.min(elapsed / targetMs, 1) : 0;
  const remaining = Math.max(targetMs - elapsed, 0);
  const time = fmt(fastState.isActive ? remaining : 0);
  const elapsedFmt = fmt(elapsed);
  const pct = Math.round(progress * 100);
  const strokeDash = CIRC * progress;

  const phase =
    elapsed < targetMs * 0.5
      ? { label: 'Fat Burning Phase', color: '#F59E0B', icon: '🔥' }
      : elapsed < targetMs * 0.75
        ? { label: 'Ketosis Entering', color: '#7C3AED', icon: '⚡' }
        : { label: 'Deep Ketosis', color: '#10B981', icon: '🌟' };

  const startFast = async () => {
    const state: FastState = { startTime: Date.now(), protocolId: selected.id, isActive: true };
    save(state);
    setElapsed(0);

    // Schedule completion notification
    if (selected.fastHours > 0) {
      await Notifications.cancelScheduledNotificationAsync('fast_complete').catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: 'fast_complete',
        content: {
          title: '🎉 Fast Complete!',
          body: `You completed your ${selected.label} fast! Time to break your fast mindfully.`,
          data: { type: 'fasting' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + selected.fastHours * 3600 * 1000),
        },
      }).catch(() => {});
    }
  };

  const stopFast = () => {
    Alert.alert('Stop Fast?', 'Are you sure you want to end this fast?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Fast',
        style: 'destructive',
        onPress: async () => {
          save({ startTime: null, protocolId: selected.id, isActive: false });
          setElapsed(0);
          await Notifications.cancelScheduledNotificationAsync('fast_complete').catch(() => {});
        },
      },
    ]);
  };

  const completeFast = () => {
    save({ startTime: null, protocolId: selected.id, isActive: false });
    setElapsed(0);
    Alert.alert(
      '🎉 Congratulations!',
      `You completed your ${selected.label} fast! Great discipline.`
    );
  };

  if (!loaded) return null;

  const isComplete = fastState.isActive && elapsed >= targetMs && targetMs > 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Fasting Timer</Text>
          <Text style={s.headerSub}>Intermittent fasting tracker</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 32 }}
      >
        {/* Protocol selector */}
        {!fastState.isActive && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Choose Protocol</Text>
            <View style={s.protocolGrid}>
              {PROTOCOLS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelected(p)}
                  activeOpacity={0.85}
                  style={[
                    s.protocolCard,
                    selected.id === p.id && { borderColor: p.color, borderWidth: 2 },
                  ]}
                >
                  {selected.id === p.id && (
                    <LinearGradient
                      colors={p.grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={[s.protocolLabel, selected.id === p.id && { color: '#fff' }]}>
                    {p.label}
                  </Text>
                  <Text
                    style={[
                      s.protocolTitle,
                      selected.id === p.id && { color: 'rgba(255,255,255,0.9)' },
                    ]}
                  >
                    {p.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.protocolDesc}>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center' }}>
                {selected.desc}
              </Text>
            </View>
          </View>
        )}

        {/* Timer ring */}
        <View style={s.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke="#EDE9FE"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {/* Progress */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke={selected.color}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${strokeDash} ${CIRC}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>

          {/* Center content */}
          <View style={s.ringCenter}>
            {fastState.isActive ? (
              <>
                <Text style={s.ringProtocol}>{selected.label}</Text>
                {isComplete ? (
                  <Text style={[s.ringPct, { color: '#10B981', fontSize: 28 }]}>✓ Done!</Text>
                ) : (
                  <>
                    <Text style={[s.ringTime, { color: selected.color }]}>
                      {time.h}:{time.m}:{time.s}
                    </Text>
                    <Text style={s.ringTimeLabel}>remaining</Text>
                    <Text style={[s.ringPct, { color: selected.color }]}>{pct}%</Text>
                  </>
                )}
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                  {phase.icon} {phase.label}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 36 }}>🕐</Text>
                <Text style={s.ringProtocol}>{selected.label}</Text>
                <Text style={s.ringTimeLabel}>Tap to start</Text>
              </>
            )}
          </View>
        </View>

        {/* Elapsed / phase info */}
        {fastState.isActive && (
          <View style={s.infoRow}>
            <View style={s.infoCard}>
              <Text style={s.infoVal}>
                {elapsedFmt.h}h {elapsedFmt.m}m
              </Text>
              <Text style={s.infoLabel}>Elapsed</Text>
            </View>
            <View
              style={[
                s.infoCard,
                { backgroundColor: selected.color + '15', borderColor: selected.color + '30' },
              ]}
            >
              <Text style={[s.infoVal, { color: selected.color }]}>{selected.fastHours}h</Text>
              <Text style={s.infoLabel}>Target</Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoVal}>
                {time.h}h {time.m}m
              </Text>
              <Text style={s.infoLabel}>Remaining</Text>
            </View>
          </View>
        )}

        {/* CTA */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          {!fastState.isActive ? (
            <TouchableOpacity onPress={startFast} activeOpacity={0.88}>
              <LinearGradient
                colors={selected.grad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.ctaBtn}
              >
                <Text style={s.ctaTxt}>Start {selected.label} Fast 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : isComplete ? (
            <TouchableOpacity onPress={completeFast} activeOpacity={0.88}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.ctaBtn}
              >
                <Text style={s.ctaTxt}>Complete Fast 🎉</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={stopFast}
              activeOpacity={0.88}
              style={[
                s.ctaBtn,
                { backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#FCA5A5' },
              ]}
            >
              <Text style={[s.ctaTxt, { color: '#EF4444' }]}>End Fast Early</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Science card */}
        <View style={s.sciCard}>
          <Text style={s.sciTitle}>⚗️ What happens during your fast</Text>
          {[
            { time: '0–4h', event: 'Digestion & glycogen usage', icon: '🍽️' },
            { time: '4–8h', event: 'Blood sugar stabilises', icon: '📉' },
            { time: '8–12h', event: 'Liver glycogen depleted', icon: '⚡' },
            { time: '12–16h', event: 'Fat burning begins (lipolysis)', icon: '🔥' },
            { time: '16–24h', event: 'Ketosis — body burns fat for fuel', icon: '✨' },
            { time: '24h+', event: 'Autophagy — cellular repair', icon: '🌟' },
          ].map((s, i) => (
            <View key={i} style={ss.sciRow}>
              <Text style={ss.sciIcon}>{s.icon}</Text>
              <View>
                <Text style={ss.sciTime}>{s.time}</Text>
                <Text style={ss.sciEvent}>{s.event}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: COLORS.text, lineHeight: 24 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  protocolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  protocolCard: {
    width: (W - 60) / 3,
    borderRadius: RADIUS.xl,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  protocolLabel: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  protocolTitle: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 3 },
  protocolDesc: {
    marginTop: 12,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.xl,
    padding: 12,
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 4 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringProtocol: { fontSize: 15, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  ringTime: { fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  ringTimeLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  ringPct: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  infoRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoVal: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  infoLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  ctaBtn: {
    borderRadius: RADIUS.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaTxt: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  sciCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sciTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
});
const ss = StyleSheet.create({
  sciRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sciIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  sciTime: { fontSize: 11, fontWeight: '800', color: '#7C3AED' },
  sciEvent: { fontSize: 12, color: COLORS.textSub, marginTop: 1 },
});

export default FastingTimerScreen;
