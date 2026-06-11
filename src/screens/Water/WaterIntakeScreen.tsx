/* eslint-disable react-hooks/refs */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  PanResponder,
  Dimensions,
  StyleSheet,
  Animated,
} from 'react-native';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import { useScrollToTopOnTabPress } from '../../hooks/useScrollToTopOnTabPress';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  ClipPath,
  Path,
  Rect,
  Ellipse,
  G,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import CustomDateTimePicker from '../../components/DateTimePicker/CustomDateTimePicker';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWaterRecords, upsertWaterRecord, todayKey } from '../../api/water';
import { encryptLocal, decryptLocal } from '../../utils/localCrypto';
import { useAppPreferences } from '../../hooks/useAppPreferences';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import { WaterSkeleton } from '../../components/Skeleton/Skeleton';

const { width } = Dimensions.get('window');

const DAILY_GOAL_ML = 2500;
const STEP_ML = 250;
const QUICK_AMOUNTS = [150, 250, 350, 500];
const STORAGE_KEY = 'water_intake_v1';
const GOAL_PREF_KEY = 'water_goal_pref'; // persists user's preferred goal across all dates

// Glass SVG canvas (used for drag zone sizing)
const GW = 220;
const GH = 300;
const CX = GW / 2;

const TIPS = [
  'Drink a glass of water right after waking up.',
  'Carry a reusable bottle to sip throughout the day.',
  'Eat water-rich foods like cucumber, watermelon & oranges.',
  'Set hourly reminders to drink at least one cup.',
  'Drink a glass before every meal to aid digestion.',
  'Replace one sugary drink per day with water.',
];

// ── Tumbler glass — matches reference image ───────────────────────────────────
const WaterGlass: React.FC<{ fillPct: number; goalMl: number; intakeMl: number }> = ({
  fillPct,
  goalMl,
  intakeMl,
}) => {
  const pct = Math.min(Math.max(fillPct, 0), 1);

  // SVG canvas
  const W = 220;
  const H = 300;
  const cx = W / 2;

  // Glass dimensions — wide tumbler, slightly wider at top
  const oTopRx = 88;
  const oTopRy = 14; // outer rim
  const oBotRx = 56;
  const oBotRy = 9; // outer base — narrower for real glass shape
  const wallT = 11; // wall thickness
  const iTopRx = oTopRx - wallT;
  const iTopRy = oTopRy - 3;
  const iBotRx = oBotRx - wallT;
  const iBotRy = oBotRy - 3;

  const rimY = 22;
  const botY = 272;
  const bodyH = botY - rimY;

  // x on inner wall at y
  const ix = (y: number, r: boolean) => {
    const t = (y - rimY) / bodyH;
    const rx = iTopRx + (iBotRx - iTopRx) * t;
    return r ? cx + rx : cx - rx;
  };

  // Inner liquid space
  const innerTop = rimY + iTopRy;
  const innerBot = botY - 4;
  const innerH = innerBot - innerTop;
  const waterH = pct * innerH;
  const wY = innerBot - waterH; // water surface y

  // Water surface ellipse radii at wY

  // Clip path — full glass outline (outer edges) so water fills wall-to-wall
  const clipD = `M${cx - oTopRx} ${rimY} L${cx + oTopRx} ${rimY} L${cx + oBotRx} ${botY} L${cx - oBotRx} ${botY} Z`;

  // Water surface x at wY follows outer wall
  const owt = (wY - rimY) / bodyH;
  const owRx = oTopRx + (oBotRx - oTopRx) * owt;

  // Water fill path — uses outer wall width so no side gaps
  const wAmp = 4;
  const waterD =
    pct <= 0
      ? ''
      : pct >= 1
        ? `M${cx - oTopRx} ${rimY} L${cx + oTopRx} ${rimY} L${cx + oBotRx} ${botY} L${cx - oBotRx} ${botY} Z`
        : `M${cx - owRx} ${wY}
       C${cx - owRx * 0.6} ${wY - wAmp}, ${cx - owRx * 0.1} ${wY + wAmp * 0.8}, ${cx} ${wY}
       C${cx + owRx * 0.1} ${wY - wAmp * 0.8}, ${cx + owRx * 0.6} ${wY + wAmp}, ${cx + owRx} ${wY}
       L${cx + oBotRx} ${botY} L${cx - oBotRx} ${botY} Z`;

  // Bubbles — only inside water area
  const bubbles =
    pct > 0.05
      ? [
          { x: cx - 22, y: wY + waterH * 0.25, r: 4.5 },
          { x: cx + 14, y: wY + waterH * 0.4, r: 3.0 },
          { x: cx - 6, y: wY + waterH * 0.55, r: 3.8 },
          { x: cx + 30, y: wY + waterH * 0.3, r: 2.5 },
          { x: cx - 34, y: wY + waterH * 0.5, r: 2.0 },
          { x: cx + 5, y: wY + waterH * 0.7, r: 2.8 },
          { x: cx - 16, y: wY + waterH * 0.65, r: 1.8 },
        ]
      : [];

  const wC1 = `rgba(160,220,255,${0.55 + pct * 0.3})`;
  const wC2 = `rgba(30,140,220,${0.8 + pct * 0.15})`;
  const wC3 = `rgba(8,80,160,${0.85 + pct * 0.12})`;

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <Defs>
          {/* Water */}
          <SvgGrad id="g_w" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={wC1} />
            <Stop offset="0.3" stopColor={wC2} />
            <Stop offset="1" stopColor={wC3} />
          </SvgGrad>

          {/* Rim face */}
          <SvgGrad id="g_rim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="rgba(230,245,255,0.55)" />
            <Stop offset="1" stopColor="rgba(160,215,255,0.15)" />
          </SvgGrad>

          {/* Base */}
          <SvgGrad id="g_base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="rgba(180,225,255,0.30)" />
            <Stop offset="1" stopColor="rgba(60,140,220,0.40)" />
          </SvgGrad>

          {/* Clip inner */}
          <ClipPath id="g_clip">
            <Path d={clipD} />
          </ClipPath>
        </Defs>

        {/* ── 0. Side outline lines — rim to base ────────────────────── */}
        <Path
          d={`M${cx - oTopRx} ${rimY} L${cx - oBotRx} ${botY}`}
          stroke={COLORS.border}
          strokeWidth="1"
          fill="none"
        />
        <Path
          d={`M${cx + oTopRx} ${rimY} L${cx + oBotRx} ${botY}`}
          stroke={COLORS.border}
          strokeWidth="1"
          fill="none"
        />

        {/* ── 1. Heavy rounded base ───────────────────────────────────── */}
        <Ellipse
          cx={cx}
          cy={botY + 2}
          rx={oBotRx + 2}
          ry={oBotRy + 4}
          fill="url(#g_base)"
          opacity={0.5}
        />
        <Ellipse cx={cx} cy={botY} rx={oBotRx} ry={oBotRy} fill="rgba(120,190,240,0.18)" />
        <Ellipse cx={cx} cy={botY} rx={iBotRx} ry={iBotRy} fill="rgba(30,80,160,0.15)" />

        {/* ── 2. Water body ──────────────────────────────────────────── */}
        {pct > 0 && (
          <G clipPath="url(#g_clip)">
            <Path d={waterD} fill="url(#g_w)" />

            {/* Bubbles */}
            {bubbles.map((b, i) => (
              <G key={i}>
                {/* Bubble body */}
                <Ellipse cx={b.x} cy={b.y} rx={b.r} ry={b.r * 0.9} fill="rgba(200,235,255,0.10)" />
                {/* Bubble highlight */}
                <Ellipse
                  cx={b.x - b.r * 0.3}
                  cy={b.y - b.r * 0.3}
                  rx={b.r * 0.4}
                  ry={b.r * 0.35}
                  fill="rgba(255,255,255,0.55)"
                />
              </G>
            ))}

            {/* Left inner reflection stripe on water */}
            <Path
              d={`M${cx - owRx + 2} ${wY} L${cx - oBotRx + 2} ${botY}
                  L${cx - oBotRx + 14} ${botY} L${cx - owRx + 14} ${wY} Z`}
              fill="rgba(255,255,255,0.10)"
            />
          </G>
        )}

        {/* ── 6. Rim — top ellipse face ─────── */}
        {/* Outer rim ring */}
        <Ellipse cx={cx} cy={rimY} rx={oTopRx} ry={oTopRy} fill="url(#g_rim)" opacity={0.5} />
        {/* Rim top catch-light */}
        <Ellipse
          cx={cx}
          cy={rimY - 2}
          rx={oTopRx - 5}
          ry={oTopRy - 3}
          fill="rgba(240,250,255,0.25)"
        />

        {/* ── 7. Level markers ──────────────────────────────────────── */}
        {[0.25, 0.5, 0.75].map((lvl) => {
          const ty = innerBot - lvl * innerH;
          const lx = ix(ty, false) + 4;
          return (
            <Rect
              key={lvl}
              x={lx}
              y={ty - 0.5}
              width={14}
              height={1}
              fill={COLORS.textMuted}
              rx={0.5}
            />
          );
        })}
      </Svg>

      {/* Text */}
      <View style={gs.label} pointerEvents="none">
        <Text style={gs.pct}>{Math.round(pct * 100)}%</Text>
        <Text style={gs.ml}>
          {Math.round(intakeMl)} / {goalMl} ml
        </Text>
      </View>
    </View>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────
const toDisplayVolume = (ml: number, unit: 'ml' | 'fl oz'): string =>
  unit === 'fl oz' ? `${(ml / 29.5735).toFixed(1)} fl oz` : `${Math.round(ml)} ml`;

const WaterIntakeScreen: React.FC = () => {
  const [wat0, wat1, wat2, wat3] = useEntranceAnimation(4, { initialDelay: 60, stagger: 110 });
  const { prefs } = useAppPreferences();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [intakeMl, setIntakeMl] = useState(0);
  const [goal, setGoal] = useState(DAILY_GOAL_ML);
  const [history, setHistory] = useState<{ time: string; amount: number }[]>([]);
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useScrollToTopOnTabPress();
  const goalRef = useRef(goal);
  const intakeRef = useRef(intakeMl);
  const dateRef = useRef(selectedDate);
  const dragStartIntake = useRef(0);
  const historyRef = useRef(history);
  const setIntakeMlRef = useRef(setIntakeMl);
  const setHistoryRef = useRef(setHistory);
  const setScrollRef = useRef(setScrollEnabled);
  const dragZoneHeightRef = useRef(300); // updated by onLayout

  const isToday = selectedDate === todayKey();

  useEffect(() => {
    goalRef.current = goal;
  }, [goal]);
  useEffect(() => {
    intakeRef.current = intakeMl;
  }, [intakeMl]);
  useEffect(() => {
    dateRef.current = selectedDate;
  }, [selectedDate]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // ── Persist to backend immediately on every change ───────────────────────
  const syncToBackend = useCallback((ml: number, g: number, date: string) => {
    upsertWaterRecord(date, Math.round(ml), g).catch(() => {});
  }, []);

  // ── Save locally + sync ──────────────────────────────────────────────────
  const save = useCallback(
    async (ml: number, hist: { time: string; amount: number }[], g?: number) => {
      const goalVal = g ?? goalRef.current;
      const date = dateRef.current;
      const payload = JSON.stringify({ date, intakeMl: ml, goal: goalVal, history: hist });
      await AsyncStorage.setItem(`${STORAGE_KEY}_${date}`, await encryptLocal(payload));
      if (g !== undefined) {
        await AsyncStorage.setItem(GOAL_PREF_KEY, await encryptLocal(String(goalVal)));
      }
      syncToBackend(ml, goalVal, date);
    },
    [syncToBackend]
  );

  // ── Load data for a given date ───────────────────────────────────────────
  const loadDate = useCallback(
    async (date: string) => {
      // Read user's preferred goal (falls back to DAILY_GOAL_ML if never set)
      const prefGoalEnc = await AsyncStorage.getItem(GOAL_PREF_KEY).catch(() => null);
      const prefGoalRaw = prefGoalEnc
        ? await decryptLocal(prefGoalEnc).catch(() => prefGoalEnc)
        : null;
      const prefGoal = prefGoalRaw ? parseInt(prefGoalRaw, 10) : DAILY_GOAL_ML;
      setGoal(prefGoal);
      goalRef.current = prefGoal;

      try {
        // Local cache first for instant display — show immediately without loading state
        const rawEnc = await AsyncStorage.getItem(`${STORAGE_KEY}_${date}`);
        const raw = rawEnc ? await decryptLocal(rawEnc).catch(() => rawEnc) : null;
        if (raw) {
          const cached = JSON.parse(raw);
          setIntakeMl(cached.intakeMl ?? 0);
          setHistory(cached.history ?? []);
          intakeRef.current = cached.intakeMl ?? 0;
          setLoading(false); // hide skeleton immediately from cache
        } else {
          // No cache — reset and show loading
          setIntakeMl(0);
          setHistory([]);
          intakeRef.current = 0;
          setLoading(true);
        }
        // Authoritative intake from backend, but keep prefGoal as the goal
        const records = await fetchWaterRecords(date, date);
        if (records.length > 0) {
          const r = records[0];
          setIntakeMl(r.intakeMl);
          intakeRef.current = r.intakeMl;
          const existingHistory = raw ? (JSON.parse(raw).history ?? []) : [];
          // Store with prefGoal so next load uses updated goal
          const merged = JSON.stringify({
            date,
            intakeMl: r.intakeMl,
            goal: prefGoal,
            history: existingHistory,
          });
          await AsyncStorage.setItem(`${STORAGE_KEY}_${date}`, await encryptLocal(merged));
          // Sync updated goal to backend too
          syncToBackend(r.intakeMl, prefGoal, date);
        }
        // No record exists for this date — save a new one with prefGoal
        else if (date === todayKey()) {
          const init = JSON.stringify({ date, intakeMl: 0, goal: prefGoal, history: [] });
          await AsyncStorage.setItem(`${STORAGE_KEY}_${date}`, await encryptLocal(init));
          syncToBackend(0, prefGoal, date);
        }
      } catch {
        // Local/network failure — UI already shows 0ml from the reset above
        // Non-blocking: user can still add water manually
      }
      setLoading(false);
    },
    [syncToBackend]
  );

  useFocusEffect(
    useCallback(() => {
      loadDate(selectedDate);
    }, [loadDate, selectedDate])
  );

  const onDateChange = useCallback(
    (date: string) => {
      setSelectedDate(date);
      dateRef.current = date;
      loadDate(date);
    },
    [loadDate]
  );

  // ── Add water (today only) ───────────────────────────────────────────────
  const addWater = useCallback(
    (ml: number) => {
      if (!isToday) return;
      const next = Math.min(Math.max(intakeRef.current + ml, 0), goalRef.current);
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      intakeRef.current = next;
      setIntakeMl(next);
      setHistory((h) => {
        const newH = ml > 0 ? [{ time, amount: ml }, ...h].slice(0, 20) : h;
        save(next, newH);
        return newH;
      });
    },
    [isToday, save]
  );

  const resetDay = useCallback(async () => {
    if (!isToday) return;
    setIntakeMl(0);
    intakeRef.current = 0;
    setHistory([]);
    await save(0, []);
  }, [isToday, save]);

  // ── PanResponder (today only) ────────────────────────────────────────────
  // Stable ref — all values read through refs so closures never go stale
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (_e, _gs) => {
        dragStartIntake.current = intakeRef.current;
        setScrollRef.current(false);
      },
      onPanResponderMove: (_e, gs) => {
        if (dateRef.current !== todayKey()) return;
        const mlPerPx = goalRef.current / dragZoneHeightRef.current;
        const next = Math.round(
          Math.min(Math.max(dragStartIntake.current - gs.dy * mlPerPx, 0), goalRef.current)
        );
        intakeRef.current = next;
        setIntakeMlRef.current(next);
      },
      onPanResponderRelease: (_e, gs) => {
        setScrollRef.current(true);
        if (dateRef.current !== todayKey()) return;
        const date = dateRef.current;
        const goal = goalRef.current;
        const mlPerPx = goal / dragZoneHeightRef.current;
        const raw = dragStartIntake.current - gs.dy * mlPerPx;
        const final = Math.min(Math.max(Math.round(raw), 0), goal);
        intakeRef.current = final;
        setIntakeMlRef.current(final);
        const added = final - dragStartIntake.current;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newH =
          added > 0
            ? [{ time, amount: Math.round(added) }, ...historyRef.current].slice(0, 20)
            : historyRef.current;
        historyRef.current = newH;
        setHistoryRef.current(newH);
        encryptLocal(JSON.stringify({ date, intakeMl: final, goal, history: newH }))
          .then((enc) => AsyncStorage.setItem(`${STORAGE_KEY}_${date}`, enc))
          .catch(() => {});
        upsertWaterRecord(date, Math.round(final), goal).catch(() => {});
      },
      onPanResponderTerminate: () => {
        setScrollRef.current(true);
      },
    })
  ).current;

  if (loading) return <WaterSkeleton />;

  // ── Derived ───────────────────────────────────────────────────────────────
  const fillPct = goal > 0 ? intakeMl / goal : 0;
  const remaining = Math.max(goal - intakeMl, 0);
  const glasses = Math.round(intakeMl / 250);

  const status =
    fillPct >= 1
      ? { label: 'Fully Hydrated!', color: '#10B981' }
      : fillPct >= 0.75
        ? { label: 'Almost there!', color: '#06B6D4' }
        : fillPct >= 0.5
          ? { label: 'Halfway there', color: COLORS.primary }
          : fillPct >= 0.25
            ? { label: 'Keep drinking', color: '#F59E0B' }
            : { label: 'Start hydrating', color: '#EF4444' };

  const displayDate = (() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (isToday) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Fixed hero */}
      <Animated.View style={entranceStyle(wat0)}>
        <LinearGradient
          colors={['#0C2340', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
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

          {/* Title row + date nav top-right */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              marginTop: 7,
            }}
          >
            <Text style={s.headerTitle}>Water Intake</Text>

            {/* Date nav */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => {
                  const prev = new Date(`${selectedDate}T12:00:00`);
                  prev.setDate(prev.getDate() - 1);
                  onDateChange(prev.toISOString().slice(0, 10));
                }}
                style={s.dateArrow}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>‹</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={s.dateLabelBtn}>
                <Text style={s.dateLabel}>{displayDate}</Text>
                <Text
                  style={{
                    color: 'rgba(186,230,253,0.75)',
                    fontSize: 10,
                    marginTop: 1,
                    textAlign: 'center',
                  }}
                >
                  {selectedDate}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (isToday) return;
                  const next = new Date(`${selectedDate}T12:00:00`);
                  next.setDate(next.getDate() + 1);
                  const nextStr = next.toISOString().slice(0, 10);
                  if (nextStr <= todayKey()) onDateChange(nextStr);
                }}
                style={[s.dateArrow, isToday && { opacity: 0.2 }]}
                disabled={isToday}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <CustomDateTimePicker
            visible={showDatePicker}
            value={new Date(`${selectedDate}T12:00:00`)}
            mode="date"
            maximumDate={new Date()}
            onConfirm={(d) => {
              setShowDatePicker(false);
              onDateChange(d.toISOString().slice(0, 10));
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          {/* Glass (left) + chips (right) */}
          <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 14, marginTop: 12 }}>
            {/* Glass — aligned to top */}
            <View
              {...panResponder.panHandlers}
              collapsable={false}
              onLayout={(e) => {
                dragZoneHeightRef.current = e.nativeEvent.layout.height;
              }}
              style={{ width: 99, overflow: 'hidden', alignSelf: 'center' }}
            >
              <View style={{ height: 135 }}>
                <View
                  style={{
                    transform: [{ scale: 0.45 }],
                    marginTop: -(GH * 0.275),
                    marginLeft: -(GW * 0.275),
                    width: GW,
                    height: GH,
                  }}
                >
                  <WaterGlass fillPct={fillPct} goalMl={goal} intakeMl={intakeMl} />
                </View>
              </View>
            </View>

            {/* Chips — stretch to fill same height as glass */}
            <View style={{ flex: 1, justifyContent: 'center', gap: 6, paddingTop: 6 }}>
              {[
                { label: 'CONSUMED', value: toDisplayVolume(intakeMl, prefs.waterUnit) },
                { label: 'REMAINING', value: toDisplayVolume(remaining, prefs.waterUnit) },
                { label: 'GLASSES', value: `${glasses}` },
              ].map((chip, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.18)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: '700',
                      color: 'rgba(186,230,253,0.65)',
                      letterSpacing: 0.5,
                    }}
                  >
                    {chip.label}
                  </Text>
                  <Text
                    style={{ fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: -0.3 }}
                  >
                    {chip.value}
                  </Text>
                </View>
              ))}
              {isToday ? (
                <Text style={{ fontSize: 10, color: 'rgba(186,230,253,0.45)', textAlign: 'right' }}>
                  ↕ swipe glass to fill
                </Text>
              ) : (
                <Text style={{ fontSize: 10, color: COLORS.amber, textAlign: 'right' }}>
                  Past date — view only
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <Animated.View style={entranceStyle(wat1)}>
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            {/* Quick add — today only */}
            {isToday && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <Text style={[s.sectionTitle, { marginBottom: 0 }]}>Quick Add</Text>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: status.color + '55',
                      backgroundColor: status.color + '15',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status.color }}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <View style={s.quickRow}>
                  {QUICK_AMOUNTS.map((ml) => (
                    <TouchableOpacity key={ml} onPress={() => addWater(ml)} activeOpacity={0.75}>
                      <View style={s.quickBtn}>
                        <Text style={s.quickBtnTop}>+{ml}</Text>
                        <Text style={s.quickBtnSub}>ml</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Progress bar */}
            <GlassCard padding={18} style={{ marginBottom: 16 }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                  Daily Progress
                </Text>

                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                  {toDisplayVolume(intakeMl, prefs.waterUnit)} /{' '}
                  {toDisplayVolume(goal, prefs.waterUnit)}
                </Text>
              </View>
              <View style={s.progressTrack}>
                <LinearGradient
                  colors={['#0891B2', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.progressFill, { width: `${Math.min(fillPct * 100, 100)}%` }]}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>0 ml</Text>
                <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>
                  {Math.round(fillPct * 100)}%
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  {toDisplayVolume(goal, prefs.waterUnit)}
                </Text>
              </View>
            </GlassCard>

            {/* Goal setter — today only */}
            {isToday && (
              <GlassCard padding={16} style={{ marginBottom: 16 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}
                >
                  Daily Goal
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[1500, 2000, 2500, 3000, 3500, 4000].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={async () => {
                        setGoal(g);
                        goalRef.current = g;
                        await save(intakeMl, history, g);
                      }}
                    >
                      {goal === g ? (
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
                            {(g / 1000).toFixed(1)}L
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={s.goalChip}>
                          <Text style={{ color: COLORS.textSub, fontSize: 12 }}>
                            {(g / 1000).toFixed(1)}L
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>
            )}
          </View>
        </Animated.View>
        {/* Log */}
        <Animated.View style={entranceStyle(wat2)}>
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <Text style={s.sectionTitle}>{isToday ? "Today's Log" : `${displayDate}'s Log`}</Text>
              {isToday && history.length > 0 && (
                <TouchableOpacity onPress={resetDay}>
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            {history.length === 0 ? (
              <GlassCard padding={20} style={{ marginBottom: 16 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                  {isToday
                    ? 'No entries yet. Swipe up on the glass or use quick add.'
                    : 'No log entries for this day.'}
                </Text>
              </GlassCard>
            ) : (
              history.map((entry, i) => (
                <GlassCard
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                  padding={14}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={s.logDot} />
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}>
                      {entry.amount} ml
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{entry.time}</Text>
                </GlassCard>
              ))
            )}
          </View>
        </Animated.View>
        {/* Tip */}
        <Animated.View style={entranceStyle(wat3)}>
          <View style={{ paddingHorizontal: 20 }}>
            <GlassCard
              padding={16}
              style={{ marginBottom: 16, borderColor: 'rgba(8,145,178,0.3)', borderWidth: 1 }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.primary,
                  fontWeight: '700',
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}
              >
                💧 HYDRATION TIP
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 20 }}>
                {TIPS[tipIdx]}
              </Text>
            </GlassCard>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    height: 280,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(186,230,253,0.75)', marginBottom: 20 },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 12,
  },
  dateArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabelBtn: { alignItems: 'center', minWidth: 90 },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickBtn: {
    width: (width - 80) / 4,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  quickBtnTop: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  quickBtnSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  progressTrack: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  goalChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
});

const gs = StyleSheet.create({
  label: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  ml: {
    fontSize: 12,
    color: 'rgba(186,230,253,0.9)',
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default WaterIntakeScreen;
