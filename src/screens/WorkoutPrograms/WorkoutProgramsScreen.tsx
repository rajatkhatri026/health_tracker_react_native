/* eslint-disable react-hooks/refs */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');
const ACTIVE_PROGRAM_KEY = '@nexara_active_program';

// ── Types ─────────────────────────────────────────────────────────────────────
interface WorkoutDay {
  name: string; // e.g. "Push A"
  focus: string; // e.g. "Chest · Shoulders · Triceps"
  exercises: string[]; // exercise names
  rest: boolean;
}
interface Week {
  days: WorkoutDay[];
}
interface Program {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  duration: string; // "6 weeks"
  frequency: string; // "3×/week"
  level: string;
  goal: string;
  description: string;
  grad: [string, string];
  weeks: Week[];
}

// ── Program Data ──────────────────────────────────────────────────────────────
const REST: WorkoutDay = { name: 'Rest Day', focus: 'Recovery', exercises: [], rest: true };

const PROGRAMS: Program[] = [
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    tag: 'PPL',
    emoji: '💪',
    duration: '6 weeks',
    frequency: '6×/week',
    level: 'Intermediate',
    goal: 'Muscle & Strength',
    grad: ['#7C3AED', '#4F46E5'],
    description:
      'The gold-standard hypertrophy program. Train each muscle group twice per week with dedicated push, pull, and leg sessions.',
    weeks: [
      {
        days: [
          {
            name: 'Push A',
            focus: 'Chest · Shoulders · Triceps',
            rest: false,
            exercises: [
              'Bench Press 4×6-8',
              'Incline Dumbbell Press 3×10',
              'Overhead Press 3×8',
              'Lateral Raise 3×15',
              'Cable Fly 3×12',
              'Tricep Pushdown 3×15',
              'Skull Crusher 3×10',
            ],
          },
          {
            name: 'Pull A',
            focus: 'Back · Biceps · Rear Delts',
            rest: false,
            exercises: [
              'Deadlift 4×5',
              'Pull-Up 4×8',
              'Barbell Row 3×8',
              'Lat Pulldown 3×12',
              'Face Pull 3×20',
              'Barbell Curl 3×10',
              'Hammer Curl 3×12',
            ],
          },
          {
            name: 'Legs A',
            focus: 'Quads · Hamstrings · Calves',
            rest: false,
            exercises: [
              'Squat 4×6-8',
              'Romanian Deadlift 3×10',
              'Leg Press 3×12',
              'Walking Lunge 3×12',
              'Leg Curl 3×15',
              'Calf Raise 4×20',
            ],
          },
          {
            name: 'Push B',
            focus: 'Chest · Shoulders · Triceps',
            rest: false,
            exercises: [
              'Incline Bench Press 4×8',
              'Dumbbell Press 3×10',
              'Arnold Press 3×10',
              'Front Raise 3×12',
              'Cable Fly 3×15',
              'Diamond Push-Up 3×15',
              'Tricep Pushdown 3×15',
            ],
          },
          {
            name: 'Pull B',
            focus: 'Back · Biceps · Rear Delts',
            rest: false,
            exercises: [
              'Pull-Up 4×10',
              'Seated Cable Row 3×12',
              'Single-Arm DB Row 3×10',
              'Lat Pulldown 3×12',
              'Face Pull 3×20',
              'Concentration Curl 3×12',
              'Preacher Curl 3×12',
            ],
          },
          {
            name: 'Legs B',
            focus: 'Quads · Glutes · Calves',
            rest: false,
            exercises: [
              'Goblet Squat 4×12',
              'Hip Thrust 4×12',
              'Walking Lunge 3×15',
              'Leg Press 3×15',
              'Calf Raise 4×25',
              'Romanian Deadlift 3×12',
            ],
          },
          REST,
        ],
      },
    ],
  },
  {
    id: '5x5',
    name: 'StrongLifts 5×5',
    tag: '5×5',
    emoji: '🏋️',
    duration: '8 weeks',
    frequency: '3×/week',
    level: 'Beginner',
    goal: 'Raw Strength',
    grad: ['#EF4444', '#DC2626'],
    description:
      'The most proven strength program for beginners. Three compound lifts per session, alternating A and B workouts, adding weight every session.',
    weeks: [
      {
        days: [
          {
            name: 'Workout A',
            focus: 'Squat · Bench · Row',
            rest: false,
            exercises: ['Squat 5×5', 'Bench Press 5×5', 'Barbell Row 5×5'],
          },
          REST,
          {
            name: 'Workout B',
            focus: 'Squat · Press · Deadlift',
            rest: false,
            exercises: ['Squat 5×5', 'Overhead Press 5×5', 'Deadlift 1×5'],
          },
          REST,
          {
            name: 'Workout A',
            focus: 'Squat · Bench · Row',
            rest: false,
            exercises: ['Squat 5×5', 'Bench Press 5×5', 'Barbell Row 5×5'],
          },
          REST,
          REST,
        ],
      },
    ],
  },
  {
    id: 'fullbody',
    name: 'Full Body 3×',
    tag: 'FB',
    emoji: '⚡',
    duration: '4 weeks',
    frequency: '3×/week',
    level: 'Beginner',
    goal: 'General Fitness',
    grad: ['#10B981', '#059669'],
    description:
      'Hit every muscle group three times per week with compound movements. Perfect for beginners building a foundation.',
    weeks: [
      {
        days: [
          {
            name: 'Day 1',
            focus: 'Full Body — Heavy',
            rest: false,
            exercises: [
              'Squat 3×8',
              'Bench Press 3×8',
              'Barbell Row 3×8',
              'Overhead Press 3×8',
              'Romanian Deadlift 3×10',
              'Plank 3×45s',
            ],
          },
          REST,
          {
            name: 'Day 2',
            focus: 'Full Body — Moderate',
            rest: false,
            exercises: [
              'Goblet Squat 3×12',
              'Incline Dumbbell Press 3×12',
              'Pull-Up 3×8',
              'Lateral Raise 3×15',
              'Walking Lunge 3×12',
              'Crunch 3×20',
            ],
          },
          REST,
          {
            name: 'Day 3',
            focus: 'Full Body — Light+Volume',
            rest: false,
            exercises: [
              'Leg Press 3×15',
              'Push-Up 3×20',
              'Seated Cable Row 3×15',
              'Hammer Curl 3×15',
              'Calf Raise 3×25',
              'Russian Twist 3×20',
            ],
          },
          REST,
          REST,
        ],
      },
    ],
  },
  {
    id: 'hiit',
    name: 'HIIT Fat Burn',
    tag: 'HIIT',
    emoji: '🔥',
    duration: '4 weeks',
    frequency: '4×/week',
    level: 'Intermediate',
    goal: 'Fat Loss & Cardio',
    grad: ['#F59E0B', '#D97706'],
    description:
      'High-intensity interval training designed to maximise calorie burn. Short rest, high output. Combine with a calorie deficit for rapid results.',
    weeks: [
      {
        days: [
          {
            name: 'HIIT A',
            focus: 'Lower Body Blast',
            rest: false,
            exercises: [
              'Burpee 4×45s',
              'Box Jump 4×10',
              'High Knees 4×45s',
              'Walking Lunge 3×20',
              'Mountain Climber 3×45s',
              'Jump Rope 3×60s',
            ],
          },
          {
            name: 'HIIT B',
            focus: 'Upper Body & Core',
            rest: false,
            exercises: [
              'Battle Ropes 4×30s',
              'Push-Up 4×20',
              'Mountain Climber 4×45s',
              'Plank 3×45s',
              'Burpee 3×10',
              'Russian Twist 3×30',
            ],
          },
          REST,
          {
            name: 'HIIT C',
            focus: 'Full Body Circuit',
            rest: false,
            exercises: [
              'Burpee 5×10',
              'Box Jump 4×10',
              'High Knees 5×30s',
              'Battle Ropes 3×30s',
              'Jump Rope 4×60s',
              'Plank 3×60s',
            ],
          },
          {
            name: 'HIIT D',
            focus: 'Tabata Style',
            rest: false,
            exercises: [
              'Mountain Climber 8×20s',
              'Burpee 8×20s',
              'High Knees 8×20s',
              'Jump Rope 8×20s',
            ],
          },
          REST,
          REST,
        ],
      },
    ],
  },
];

// ── Program Card ──────────────────────────────────────────────────────────────
const ProgramCard: React.FC<{ program: Program; isActive: boolean; onPress: () => void }> = ({
  program,
  isActive,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  const onOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  return (
    <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={program.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={p.card}
        >
          {/* Active indicator */}
          {isActive && (
            <View style={p.activePill}>
              <Text style={p.activeTxt}>▶ ACTIVE</Text>
            </View>
          )}
          <View style={p.cardTop}>
            <View style={p.tagCircle}>
              <Text style={p.tagTxt}>{program.emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={p.cardName}>{program.name}</Text>
              <Text style={p.cardGoal}>{program.goal}</Text>
            </View>
          </View>
          <Text style={p.cardDesc} numberOfLines={2}>
            {program.description}
          </Text>
          <View style={p.statsRow}>
            {[
              { icon: '📅', val: program.duration },
              { icon: '⚡', val: program.frequency },
              { icon: '🎯', val: program.level },
            ].map((s, i) => (
              <View key={i} style={p.statChip}>
                <Text style={{ fontSize: 11 }}>{s.icon}</Text>
                <Text style={p.statVal}>{s.val}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Program Detail Modal ──────────────────────────────────────────────────────
const ProgramDetail: React.FC<{
  program: Program;
  isActive: boolean;
  onStart: () => void;
  onClose: () => void;
}> = ({ program, isActive, onStart, onClose }) => {
  const insets = useSafeAreaInsets();
  const week = program.weeks[0];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StatusBar barStyle="dark-content" />
        {/* Header */}
        <LinearGradient
          colors={program.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[m.header, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity onPress={onClose} style={m.closeBtn} activeOpacity={0.8}>
            <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 20 }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>{program.emoji}</Text>
            <Text style={m.headerTitle}>{program.name}</Text>
            <Text style={m.headerSub}>{program.goal}</Text>
            <View style={m.statsRow}>
              {[program.duration, program.frequency, program.level].map((v, i) => (
                <View key={i} style={m.statPill}>
                  <Text style={m.statPillTxt}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        >
          {/* Description */}
          <View style={m.section}>
            <Text style={m.sectionTitle}>About this Program</Text>
            <Text style={m.descTxt}>{program.description}</Text>
          </View>

          {/* Weekly schedule */}
          <View style={m.section}>
            <Text style={m.sectionTitle}>Weekly Schedule</Text>
            {week.days.map((day, i) => (
              <View
                key={i}
                style={[
                  m.dayRow,
                  i < week.days.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                  },
                ]}
              >
                <View style={[m.dayBadge, day.rest && m.dayBadgeRest]}>
                  <Text style={[m.dayBadgeTxt, day.rest && { color: COLORS.textMuted }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[m.dayName, day.rest && { color: COLORS.textMuted }]}>
                    {day.name}
                  </Text>
                  {!day.rest && <Text style={m.dayFocus}>{day.focus}</Text>}
                </View>
                {!day.rest && (
                  <Text style={[m.dayCount, { color: program.grad[0] }]}>
                    {day.exercises.length} moves
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Sample day */}
          {week.days
            .filter((d) => !d.rest)
            .slice(0, 1)
            .map((day, i) => (
              <View key={i} style={m.section}>
                <Text style={m.sectionTitle}>Sample: {day.name}</Text>
                {day.exercises.map((ex, j) => (
                  <View key={j} style={m.exRow}>
                    <LinearGradient
                      colors={program.grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={m.exNum}
                    >
                      <Text style={m.exNumTxt}>{j + 1}</Text>
                    </LinearGradient>
                    <Text style={m.exTxt}>{ex}</Text>
                  </View>
                ))}
              </View>
            ))}
        </ScrollView>

        {/* Start CTA */}
        <View style={[m.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={onStart}
            activeOpacity={0.88}
            style={{ borderRadius: RADIUS.full, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={program.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={m.ctaBtn}
            >
              <Text style={m.ctaTxt}>
                {isActive ? '✓ Currently Active' : `Start ${program.name}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WorkoutProgramsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Program | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem(ACTIVE_PROGRAM_KEY).then((v) => {
      if (v) setActiveId(v);
    });
  }, []);

  const startProgram = async (id: string) => {
    await AsyncStorage.setItem(ACTIVE_PROGRAM_KEY, id);
    setActiveId(id);
    setDetail(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[sc.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={sc.backBtn}
          activeOpacity={0.8}
        >
          <Text style={sc.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={sc.title}>Workout Programs</Text>
          <Text style={sc.sub}>Structured plans to follow daily</Text>
        </View>
        <View style={sc.countBadge}>
          <Text style={sc.countTxt}>{PROGRAMS.length} plans</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 40 }}
      >
        {activeId && (
          <View style={sc.activeBanner}>
            <Text style={sc.activeBannerTxt}>
              🏃 Active: {PROGRAMS.find((p) => p.id === activeId)?.name ?? activeId}
            </Text>
            <TouchableOpacity
              onPress={() => {
                AsyncStorage.removeItem(ACTIVE_PROGRAM_KEY);
                setActiveId(null);
              }}
            >
              <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700' }}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {PROGRAMS.map((prog) => (
          <ProgramCard
            key={prog.id}
            program={prog}
            isActive={activeId === prog.id}
            onPress={() => setDetail(prog)}
          />
        ))}
      </ScrollView>

      {detail && (
        <ProgramDetail
          program={detail}
          isActive={activeId === detail.id}
          onStart={() => startProgram(detail.id)}
          onClose={() => setDetail(null)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: COLORS.text, lineHeight: 26 },
  title: { fontSize: 19, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  countBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  countTxt: { fontSize: 11, fontWeight: '800', color: '#7C3AED' },
  activeBanner: {
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  activeBannerTxt: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
});

const p = StyleSheet.create({
  card: { borderRadius: 22, padding: 20 },
  activePill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeTxt: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tagCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagTxt: { fontSize: 26 },
  cardName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  cardGoal: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statVal: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

const m = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statPillTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  descTxt: { fontSize: 14, color: COLORS.textSub, lineHeight: 22 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeRest: { backgroundColor: COLORS.bgInput },
  dayBadgeTxt: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  dayName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  dayFocus: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  dayCount: { fontSize: 11, fontWeight: '700' },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exNum: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  exNumTxt: { fontSize: 10, fontWeight: '900', color: '#fff' },
  exTxt: { fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1 },
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaBtn: { borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center' },
  ctaTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
