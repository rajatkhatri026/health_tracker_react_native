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
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useCalories, type CaloriesProfile } from '../../hooks/useCalories';
import { COLORS, RADIUS } from '../../utils/theme';
import { IconFlame, IconRun, IconActivity, IconUser } from '../../components/icons/Icons';
import { CaloriesSkeleton } from '../../components/Skeleton/Skeleton';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_H = 110;
const DAILY_GOAL = 500;

const formatCal = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

// ── Ring ──────────────────────────────────────────────────────────────────────
const CalorieRing: React.FC<{ value: number; goal: number }> = ({ value, goal }) => {
  const R = 88;
  const stroke = 14;
  const circumference = 2 * Math.PI * R;
  const progress = Math.min(value / Math.max(goal, 1), 1);
  const strokeDash = circumference * progress;
  const pct = Math.round(progress * 100);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={210} height={210} viewBox="0 0 210 210">
        <Defs>
          <SvgGrad id="calGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F59E0B" />
            <Stop offset="1" stopColor="#EF4444" />
          </SvgGrad>
          <SvgGrad id="trackGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FDE68A" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#FECACA" stopOpacity="0.8" />
          </SvgGrad>
        </Defs>
        {/* Track */}
        <Circle cx={105} cy={105} r={R} stroke="url(#trackGrad)" strokeWidth={stroke} fill="none" />
        {/* Progress */}
        <Circle
          cx={105}
          cy={105}
          r={R}
          stroke="url(#calGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 105 105)"
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
    loading,
    profile,
    saveProfile,
    refresh,
  } = useCalories();

  const [showProfile, setShowProfile] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const refreshRef = React.useRef(refresh);
  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      refreshRef.current();
    }, [])
  );

  React.useEffect(() => {
    if (!loading && !profile) setShowProfile(true);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxCal = Math.max(...weeklyData.map((d) => d.total), DAILY_GOAL, 1);

  if (loading) return <CaloriesSkeleton />;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Header ── */}
        <Animated.View style={entranceStyle(cal0)}>
          <View style={s.header}>
            {/* Title row */}
            <View style={s.titleRow}>
              <View style={s.titleLeft}>
                <View style={s.titleIconWrap}>
                  <IconFlame size={18} color="#F59E0B" />
                </View>
                <Text style={s.titleText}>Calories Burned</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfile(true)} style={s.profileBtn}>
                <IconUser size={13} color="#F59E0B" />
                {profile ? (
                  <View>
                    <Text style={s.profileBtnValue}>
                      {profile.weightKg}kg · {profile.ageYears}y
                    </Text>
                    <Text style={s.profileBtnSub}>{profile.gender}</Text>
                  </View>
                ) : (
                  <Text style={s.profileBtnEmpty}>Set Profile</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Ring or empty state */}
            {!profile ? (
              <View style={s.emptyRing}>
                <View style={s.emptyRingIcon}>
                  <IconFlame size={44} color="#F59E0B" />
                </View>
                <Text style={s.emptyRingText}>
                  Set your profile to{'\n'}start tracking calories
                </Text>
                <TouchableOpacity onPress={() => setShowProfile(true)}>
                  <LinearGradient
                    colors={['#F59E0B', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.emptyRingBtn}
                  >
                    <Text style={s.emptyRingBtnText}>Set Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <CalorieRing value={todayTotal} goal={DAILY_GOAL} />
            )}

            {/* Breakdown chips */}
            {profile && (
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
            )}
          </View>
        </Animated.View>

        {/* ── Stats row ── */}
        <Animated.View style={entranceStyle(cal1)}>
          <View style={s.section}>
            {/* No profile banner */}
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
          </View>
        </Animated.View>

        {/* ── Weekly chart ── */}
        <Animated.View style={entranceStyle(cal2)}>
          <View style={s.section}>
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
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 6,
                  height: CHART_H + 36,
                }}
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
          </View>
        </Animated.View>

        {/* ── How it works ── */}
        <Animated.View style={entranceStyle(cal3)}>
          <View style={s.section}>
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

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    backgroundColor: COLORS.bg,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  titleText: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  profileBtnValue: { color: '#D97706', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  profileBtnSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 13,
    textTransform: 'capitalize',
  },
  profileBtnEmpty: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },

  // Ring center overlay
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { fontSize: 42, fontWeight: '900', color: COLORS.text, letterSpacing: -2 },
  ringUnit: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  ringPctBadge: {
    marginTop: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ringPctText: { fontSize: 12, color: '#D97706', fontWeight: '700' },

  // Empty state
  emptyRing: { height: 210, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyRingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  emptyRingText: { color: COLORS.textSub, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  emptyRingBtn: { borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 10 },
  emptyRingBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Breakdown
  breakdownRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
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
