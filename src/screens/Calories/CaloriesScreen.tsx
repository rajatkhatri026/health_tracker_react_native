import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  StyleSheet,
} from 'react-native';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import { useScrollToTopOnTabPress } from '../../hooks/useScrollToTopOnTabPress';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useCalories, type CaloriesProfile } from '../../hooks/useCalories';
import { COLORS, RADIUS } from '../../utils/theme';
import { IconFlame, IconRun, IconActivity, IconUser } from '../../components/icons/Icons';
import { CaloriesSkeleton } from '../../components/Skeleton/Skeleton';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_H = 110;

const formatCal = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

// ── Ring ──────────────────────────────────────────────────────────────────────
const CalorieRing: React.FC<{ value: number; goal: number }> = ({ value, goal }) => {
  const R = 54;
  const stroke = 10;
  const circumference = 2 * Math.PI * R;
  const progress = Math.min(value / Math.max(goal, 1), 1);
  const strokeDash = circumference * progress;
  const pct = Math.round(progress * 100);
  const size = 130;
  const cx = size / 2;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgGrad id="calGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F59E0B" />
            <Stop offset="1" stopColor="#EF4444" />
          </SvgGrad>
          <SvgGrad id="trackGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.15" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0.15" />
          </SvgGrad>
        </Defs>
        {/* Track */}
        <Circle cx={cx} cy={cx} r={R} stroke="url(#trackGrad)" strokeWidth={stroke} fill="none" />
        {/* Progress */}
        <Circle
          cx={cx}
          cy={cx}
          r={R}
          stroke="url(#calGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <View style={s.ringCenter}>
        <Text style={s.ringValue}>{formatCal(value)}</Text>
        <Text style={s.ringUnit}>kcal burned</Text>
        <View style={s.ringPctBadge}>
          <Text style={s.ringPctText}>{pct}%</Text>
        </View>
      </View>
    </View>
  );
};

// ── Profile Modal ─────────────────────────────────────────────────────────────
const ProfileModal: React.FC<{
  visible: boolean;
  initial: CaloriesProfile | null;
  onSave: (p: CaloriesProfile) => void;
  onClose: () => void;
}> = ({ visible, initial, onSave, onClose }) => {
  const [weight, setWeight] = useState(String(initial?.weightKg ?? ''));
  const [age, setAge] = useState(String(initial?.ageYears ?? ''));
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(initial?.gender ?? 'male');

  React.useEffect(() => {
    if (visible) {
      setWeight(String(initial?.weightKg ?? ''));
      setAge(String(initial?.ageYears ?? ''));
      setGender(initial?.gender ?? 'male');
    }
  }, [visible, initial]);

  const handleSave = async () => {
    const w = parseFloat(weight);
    const a = parseInt(age, 10);
    if (!w || w <= 0 || !a || a <= 0) return;
    try {
      await onSave({ weightKg: w, ageYears: a, gender });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,15,26,0.45)' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalSheet}>
          {/* Handle */}
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Your Profile</Text>

          <Text style={s.inputLabel}>WEIGHT (KG)</Text>
          <TextInput
            style={s.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="e.g. 70"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.inputLabel}>AGE</Text>
          <TextInput
            style={s.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="e.g. 25"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.inputLabel}>GENDER</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
            {(['male', 'female', 'other'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGender(g)}
                style={[s.genderBtn, gender === g && s.genderBtnActive]}
              >
                <Text style={[s.genderText, gender === g && s.genderTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleSave}>
            <LinearGradient
              colors={['#F59E0B', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.saveBtn}
            >
              <Text style={s.saveBtnText}>Save Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const CaloriesScreen: React.FC = () => {
  const [cal0, cal1, cal2, cal3] = useEntranceAnimation(4, { initialDelay: 60, stagger: 110 });
  const {
    todayTotal,
    todaySteps,
    todayStepsCalories,
    todayWorkoutCalories,
    weeklyData,
    weeklyTotal,
    weeklyAvg,
    dailyGoal,
    profile,
    saveProfile,
    refresh,
  } = useCalories();

  const [showProfile, setShowProfile] = useState(false);
  const hasPromptedProfile = React.useRef(false);

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

  React.useEffect(() => {
    if (!profile && !hasPromptedProfile.current) {
      hasPromptedProfile.current = true;
      setShowProfile(true);
    }
  }, [profile]);

  const maxCal = Math.max(...weeklyData.map((d) => d.total), dailyGoal, 1);

  const pct = Math.round(Math.min(todayTotal / Math.max(dailyGoal, 1), 1) * 100);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Fixed Gradient Hero ── */}
      <Animated.View style={[s.heroWrap, entranceStyle(cal0)]}>
        <LinearGradient
          colors={['#7C2D12', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroGrad}
        >
          {/* Decorative circles */}
          <View
            style={[s.deco, { width: 220, height: 220, top: -70, right: -60, opacity: 0.08 }]}
          />
          <View
            style={[s.deco, { width: 130, height: 130, bottom: 20, left: -40, opacity: 0.06 }]}
          />

          {/* Top row */}
          <View style={s.heroTopRow}>
            <View style={s.heroTitleWrap}>
              <IconFlame size={16} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroTitle}>Calories Burned</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfile(true)} style={s.heroProfileBtn}>
              <IconUser size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroProfileTxt}>
                {profile ? `${profile.weightKg}kg` : 'Set Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ring + 3 chips */}
          <View style={s.heroContent}>
            {!profile ? (
              /* No-profile state inside hero */
              <View style={s.heroEmpty}>
                <View style={s.heroEmptyIcon}>
                  <IconFlame size={32} color="#F59E0B" />
                </View>
                <Text style={s.heroEmptyTxt}>Set profile to track calories</Text>
                <TouchableOpacity onPress={() => setShowProfile(true)} style={s.heroEmptyBtn}>
                  <Text style={s.heroEmptyBtnTxt}>Set Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Ring */}
                <View style={s.heroRingWrap}>
                  <CalorieRing value={todayTotal} goal={dailyGoal} />
                </View>
                {/* 3 frosted chips */}
                <View style={s.heroChips}>
                  {[
                    { label: 'GOAL', value: `${dailyGoal}`, unit: 'kcal' },
                    { label: 'BURNED', value: `${todayTotal}`, unit: 'kcal' },
                    {
                      label: 'REMAINING',
                      value: `${Math.max(dailyGoal - todayTotal, 0)}`,
                      unit: 'kcal',
                    },
                  ].map((chip) => (
                    <View key={chip.label} style={s.heroChip}>
                      <Text style={s.heroChipLabel}>{chip.label}</Text>
                      <Text style={s.heroChipVal}>
                        {chip.value} <Text style={s.heroChipUnit}>{chip.unit}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={{ marginTop: HERO_H }}
        contentContainerStyle={{ paddingBottom: 110, paddingTop: 20 }}
      >
        {/* ── Breakdown chips ── */}
        {profile && (
          <Animated.View style={[entranceStyle(cal0), s.section]}>
            <View style={s.breakdownRow}>
              <View style={s.breakdownChip}>
                <LinearGradient
                  colors={['#FEF3C7', '#FDE68A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.breakdownChipGrad}
                >
                  <View style={s.breakdownChipIcon}>
                    <IconRun size={16} color="#D97706" />
                  </View>
                  <View>
                    <Text style={[s.breakdownChipVal, { color: '#D97706' }]}>
                      {todayStepsCalories} kcal
                    </Text>
                    <Text style={s.breakdownChipLabel}>{todaySteps.toLocaleString()} steps</Text>
                  </View>
                </LinearGradient>
              </View>
              <View style={s.breakdownChip}>
                <LinearGradient
                  colors={['#FEE2E2', '#FECACA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.breakdownChipGrad}
                >
                  <View style={[s.breakdownChipIcon, { backgroundColor: '#FCA5A5' }]}>
                    <IconActivity size={16} color="#EF4444" />
                  </View>
                  <View>
                    <Text style={[s.breakdownChipVal, { color: '#EF4444' }]}>
                      {todayWorkoutCalories} kcal
                    </Text>
                    <Text style={s.breakdownChipLabel}>from workouts</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Stats row ── */}
        <Animated.View style={[entranceStyle(cal1), s.section]}>
          {!profile && (
            <View style={s.warningBanner}>
              <Text style={s.warningTitle}>⚠️ Profile required</Text>
              <Text style={s.warningDesc}>
                Enter your weight, age and gender to calculate accurate calories burned.
              </Text>
            </View>
          )}
          <View style={s.statsRow}>
            {[
              {
                label: 'Week Total',
                value: formatCal(weeklyTotal),
                color: '#F59E0B',
                bg: '#FFFBEB',
                border: '#FDE68A',
              },
              {
                label: 'Daily Avg',
                value: formatCal(weeklyAvg),
                color: '#EF4444',
                bg: '#FFF5F5',
                border: '#FECACA',
              },
              {
                label: 'Today',
                value: formatCal(todayTotal),
                color: '#10B981',
                bg: '#F0FDF4',
                border: '#A7F3D0',
              },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[s.statCard, { backgroundColor: stat.bg, borderColor: stat.border }]}
              >
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Weekly chart ── */}
        <Animated.View style={[entranceStyle(cal2), s.section]}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>This Week</Text>
              <View style={s.chartLegend}>
                <View style={s.legendDot}>
                  <View style={[s.legendColor, { backgroundColor: '#F59E0B' }]} />
                  <Text style={s.legendText}>Steps</Text>
                </View>
                <View style={s.legendDot}>
                  <View style={[s.legendColor, { backgroundColor: '#EF4444' }]} />
                  <Text style={s.legendText}>Workout</Text>
                </View>
              </View>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: CHART_H + 36 }}
            >
              {weeklyData.map((d, i) => {
                const totalH = Math.max((d.total / maxCal) * CHART_H, d.total > 0 ? 8 : 3);
                const stepsH = d.total > 0 ? (d.stepsCalories / d.total) * totalH : 0;
                const workoutH = totalH - stepsH;
                const isToday = i === weeklyData.length - 1;
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
                    {d.total > 0 && (
                      <Text style={[s.barLabel, isToday && { color: '#F59E0B' }]}>
                        {formatCal(d.total)}
                      </Text>
                    )}
                    <View style={{ width: '100%', height: CHART_H, justifyContent: 'flex-end' }}>
                      {d.total > 0 ? (
                        <Svg
                          width="100%"
                          height={totalH}
                          style={{ position: 'absolute', bottom: 0 }}
                        >
                          <Defs>
                            <SvgGrad id="stepsBar" x1="0" y1="1" x2="0" y2="0">
                              <Stop offset="0" stopColor="#FCD34D" />
                              <Stop offset="1" stopColor="#F59E0B" />
                            </SvgGrad>
                            <SvgGrad id="workoutBar" x1="0" y1="1" x2="0" y2="0">
                              <Stop offset="0" stopColor="#FCA5A5" />
                              <Stop offset="1" stopColor="#EF4444" />
                            </SvgGrad>
                          </Defs>
                          <Rect
                            x="0"
                            y={workoutH}
                            width="100%"
                            height={stepsH}
                            fill="url(#stepsBar)"
                            rx={5}
                          />
                          {workoutH > 0 && (
                            <Rect
                              x="0"
                              y={0}
                              width="100%"
                              height={workoutH}
                              fill="url(#workoutBar)"
                              rx={5}
                            />
                          )}
                        </Svg>
                      ) : (
                        <View style={s.barEmpty} />
                      )}
                    </View>
                    <Text style={[s.barDay, isToday && { color: '#F59E0B', fontWeight: '700' }]}>
                      {DAYS[dayIdx].slice(0, 2)}
                    </Text>
                    <Text style={[s.barDate, isToday && { color: '#F59E0B' }]}>
                      {new Date(d.date + 'T12:00:00').getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── How it works ── */}
        <Animated.View style={[entranceStyle(cal3), s.section]}>
          <View style={s.card}>
            <Text style={s.cardTitle}>How calories are calculated</Text>
            <View style={{ marginTop: 14, gap: 14 }}>
              {[
                {
                  icon: '👟',
                  title: 'Steps (walking)',
                  desc: 'Uses your step count with the standard MET 3.5 walking formula: (steps ÷ 1000) × 0.57 × weight kg',
                },
                {
                  icon: '🏋️',
                  title: 'Workouts',
                  desc: 'Uses MET values per activity type × your weight × duration. E.g. HIIT = 8.5 MET, Yoga = 3.0 MET.',
                },
                {
                  icon: '📊',
                  title: 'Accuracy',
                  desc: 'Results are ~85% accurate — same method used by Apple Health and Fitbit. For exact figures a heart rate monitor is needed.',
                },
              ].map((item) => (
                <View key={item.title} style={s.howRow}>
                  <View style={s.howIcon}>
                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.howTitle}>{item.title}</Text>
                    <Text style={s.howDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <ProfileModal
        visible={showProfile}
        initial={profile}
        onSave={saveProfile}
        onClose={() => setShowProfile(false)}
      />
    </View>
  );
};

const HERO_H = 280;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  // ── Fixed Hero ──────────────────────────────────────────────────────────
  heroWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, height: HERO_H },
  heroGrad: {
    height: HERO_H,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  deco: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  heroProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroProfileTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingTop: 8 },
  heroRingWrap: { alignItems: 'center', justifyContent: 'center' },
  heroChips: { flex: 1, gap: 7 },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroChipLabel: {
    fontSize: 9,
    color: 'rgba(255,220,100,0.85)',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroChipVal: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroChipUnit: { fontSize: 9, color: 'rgba(255,220,100,0.7)', fontWeight: '600' },

  // Hero empty
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  heroEmptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmptyTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center' },
  heroEmptyBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  heroEmptyBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Ring center (inside hero — white text)
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  ringUnit: { fontSize: 9, color: 'rgba(255,220,100,0.85)', marginTop: 1 },
  ringPctBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ringPctText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // Breakdown chips
  breakdownRow: { flexDirection: 'row', gap: 12 },
  breakdownChip: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
  breakdownChipGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FDE68A44',
  },
  breakdownChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownChipVal: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  breakdownChipLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // Section wrapper
  section: { paddingHorizontal: 20, marginTop: 20 },

  // Warning banner
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: { color: '#D97706', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  warningDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#FDE8C8',
    padding: 18,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  chartLegend: { flexDirection: 'row', gap: 12 },
  legendDot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendColor: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11, color: COLORS.textMuted },

  // Bar chart
  barLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  barEmpty: { height: 3, backgroundColor: '#FDE68A', borderRadius: 2, opacity: 0.5 },
  barDay: { fontSize: 10, color: COLORS.textMuted, marginTop: 5 },
  barDate: { fontSize: 9, color: COLORS.textMuted },

  // How it works
  howRow: { flexDirection: 'row', gap: 12 },
  howIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  howTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  howDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },

  // Profile Modal
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  inputLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E4E7F0',
    borderRadius: RADIUS.md,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
  },
  genderBtn: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F8',
    borderWidth: 1.5,
    borderColor: '#E4E7F0',
  },
  genderBtnActive: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  genderText: { color: COLORS.textSub, fontWeight: '600', fontSize: 13 },
  genderTextActive: { color: '#D97706' },
  saveBtn: {
    borderRadius: RADIUS.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default CaloriesScreen;
