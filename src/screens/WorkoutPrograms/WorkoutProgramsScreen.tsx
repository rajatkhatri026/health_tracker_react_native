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
const HERO_H = 200;

// ── Types ─────────────────────────────────────────────────────────────────────
interface WorkoutDay {
  name: string;
  focus: string;
  exercises: string[];
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
  duration: string;
  frequency: string;
  level: string;
  goal: string;
  description: string;
  color: string;
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
    color: '#0891B2',
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
    color: '#EF4444',
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
    color: '#10B981',
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
    color: '#F59E0B',
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

const LEVEL_COLOR: Record<string, string> = {
  Beginner: '#10B981',
  Intermediate: '#F59E0B',
  Advanced: '#EF4444',
};

// ── Program Card ──────────────────────────────────────────────────────────────
const ProgramCard: React.FC<{ program: Program; isActive: boolean; onPress: () => void }> = ({
  program,
  isActive,
  onPress,
}) => {
  const [scale] = useState(() => new Animated.Value(1));
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

  const workDays = program.weeks[0].days.filter((d) => !d.rest).length;
  const levelColor = LEVEL_COLOR[program.level] ?? '#0891B2';

  return (
    <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
      <Animated.View style={[c.card, { transform: [{ scale }] }]}>
        {/* Left accent bar */}
        <View style={[c.accentBar, { backgroundColor: program.color }]} />

        <View style={c.cardInner}>
          {/* Top row */}
          <View style={c.cardTop}>
            <View style={[c.emojiWrap, { backgroundColor: program.color + '18' }]}>
              <Text style={{ fontSize: 28 }}>{program.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={c.nameRow}>
                <Text style={c.cardName}>{program.name}</Text>
                {isActive && (
                  <View style={[c.activePill, { backgroundColor: program.color }]}>
                    <Text style={c.activeTxt}>▶ ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={c.cardGoal}>{program.goal}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={c.cardDesc} numberOfLines={2}>
            {program.description}
          </Text>

          {/* Stats row */}
          <View style={c.statsRow}>
            {[
              { icon: '📅', val: program.duration },
              { icon: '⚡', val: program.frequency },
              { icon: '🏋️', val: `${workDays} days/wk` },
            ].map((s, i) => (
              <View key={i} style={c.statChip}>
                <Text style={{ fontSize: 10 }}>{s.icon}</Text>
                <Text style={c.statVal}>{s.val}</Text>
              </View>
            ))}
            <View
              style={[
                c.levelPill,
                { backgroundColor: levelColor + '18', borderColor: levelColor + '40' },
              ]}
            >
              <Text style={[c.levelTxt, { color: levelColor }]}>{program.level}</Text>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <View style={c.chevronWrap}>
          <Text style={[c.chevron, { color: program.color }]}>›</Text>
        </View>
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
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <LinearGradient
          colors={['#0C2340', program.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[d.header, { paddingTop: insets.top + 12 }]}
        >
          {/* Decorative circles */}
          <View
            style={[d.deco, { width: 180, height: 180, top: -50, right: -40, opacity: 0.08 }]}
          />
          <View
            style={[d.deco, { width: 100, height: 100, bottom: 0, left: -20, opacity: 0.06 }]}
          />

          <View style={d.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={d.closeBtn} activeOpacity={0.8}>
              <Text style={d.closeTxt}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {isActive && (
              <View style={d.activeChip}>
                <Text style={d.activeChipTxt}>▶ ACTIVE</Text>
              </View>
            )}
          </View>

          <View style={d.headerBody}>
            <View style={[d.emojiCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={{ fontSize: 36 }}>{program.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={d.headerTitle}>{program.name}</Text>
              <Text style={d.headerGoal}>{program.goal}</Text>
              <View style={d.headerChips}>
                {[program.duration, program.frequency, program.level].map((v, i) => (
                  <View key={i} style={d.headerChip}>
                    <Text style={d.headerChipTxt}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: 16 }}
        >
          {/* About */}
          <View style={d.section}>
            <View style={d.sectionHeader}>
              <View style={[d.sectionDot, { backgroundColor: program.color }]} />
              <Text style={d.sectionTitle}>About this Program</Text>
            </View>
            <Text style={d.descTxt}>{program.description}</Text>
          </View>

          {/* Weekly schedule */}
          <View style={d.section}>
            <View style={d.sectionHeader}>
              <View style={[d.sectionDot, { backgroundColor: program.color }]} />
              <Text style={d.sectionTitle}>Weekly Schedule</Text>
            </View>
            {week.days.map((day, i) => (
              <View
                key={i}
                style={[
                  d.dayRow,
                  i < week.days.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                  },
                ]}
              >
                <View
                  style={[
                    d.dayNum,
                    day.rest
                      ? { backgroundColor: COLORS.bgInput }
                      : { backgroundColor: program.color + '20' },
                  ]}
                >
                  <Text
                    style={[d.dayNumTxt, { color: day.rest ? COLORS.textMuted : program.color }]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[d.dayName, day.rest && { color: COLORS.textMuted }]}>
                    {day.name}
                  </Text>
                  {!day.rest && <Text style={d.dayFocus}>{day.focus}</Text>}
                </View>
                {!day.rest && (
                  <View style={[d.moveBadge, { backgroundColor: program.color + '15' }]}>
                    <Text style={[d.moveTxt, { color: program.color }]}>
                      {day.exercises.length} moves
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Sample workout */}
          {week.days
            .filter((d) => !d.rest)
            .slice(0, 1)
            .map((day, i) => (
              <View key={i} style={d.section}>
                <View style={d.sectionHeader}>
                  <View style={[d.sectionDot, { backgroundColor: program.color }]} />
                  <Text style={d.sectionTitle}>Sample: {day.name}</Text>
                </View>
                {day.exercises.map((ex, j) => (
                  <View
                    key={j}
                    style={[
                      d.exRow,
                      j < day.exercises.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.border,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#0C2340', program.color]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={d.exNum}
                    >
                      <Text style={d.exNumTxt}>{j + 1}</Text>
                    </LinearGradient>
                    <Text style={d.exTxt}>{ex}</Text>
                  </View>
                ))}
              </View>
            ))}
        </ScrollView>

        {/* CTA */}
        <View style={[d.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity onPress={onStart} activeOpacity={0.88}>
            <LinearGradient
              colors={['#0C2340', program.color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={d.ctaBtn}
            >
              <Text style={d.ctaTxt}>
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

  const activeProgram = PROGRAMS.find((p) => p.id === activeId);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Fixed Gradient Hero ── */}
      <View style={s.heroWrap}>
        <LinearGradient
          colors={['#0C2340', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.heroGrad, { paddingTop: insets.top + 12 }]}
        >
          <View
            style={[s.deco, { width: 200, height: 200, top: -60, right: -50, opacity: 0.08 }]}
          />
          <View
            style={[s.deco, { width: 120, height: 120, bottom: -20, left: -30, opacity: 0.06 }]}
          />

          {/* Top row */}
          <View style={s.topRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={s.backBtn}
              activeOpacity={0.8}
            >
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.topTitleWrap} pointerEvents="none">
              <Text style={s.heroTitle}>Workout Programs</Text>
              <Text style={s.heroSub}>Structured plans to follow daily</Text>
            </View>
            <View style={s.countBadge}>
              <Text style={s.countTxt}>{PROGRAMS.length}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={s.heroStats}>
            {[
              { label: 'PROGRAMS', value: `${PROGRAMS.length}` },
              { label: 'LEVELS', value: '3' },
              { label: 'MAX WEEKS', value: '8' },
              { label: 'ACTIVE', value: activeProgram ? '1' : '0' },
            ].map((item) => (
              <View key={item.label} style={s.heroStat}>
                <Text style={s.heroStatVal}>{item.value}</Text>
                <Text style={s.heroStatLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ marginTop: HERO_H }}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: insets.bottom + 40 }}
      >
        {/* Active banner */}
        {activeProgram && (
          <View style={s.activeBanner}>
            <View style={[s.activeDot, { backgroundColor: activeProgram.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.activeBannerLabel}>ACTIVE PROGRAM</Text>
              <Text style={s.activeBannerName}>
                {activeProgram.emoji} {activeProgram.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                AsyncStorage.removeItem(ACTIVE_PROGRAM_KEY);
                setActiveId(null);
              }}
              style={s.stopBtn}
            >
              <Text style={s.stopTxt}>Stop</Text>
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

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  heroWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, height: HERO_H },
  heroGrad: {
    height: HERO_H,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  deco: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backArrow: { fontSize: 22, color: '#fff', lineHeight: 26 },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  heroSub: { fontSize: 11, color: 'rgba(186,230,253,0.85)', marginTop: 2 },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  countTxt: { fontSize: 13, fontWeight: '900', color: '#fff' },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 14,
    gap: 0,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroStatLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(186,230,253,0.75)',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Active banner
  activeBanner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  activeBannerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  activeBannerName: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  stopBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  stopTxt: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
});

// Program card
const c = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  accentBar: { width: 4 },
  cardInner: { flex: 1, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 },
  activePill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeTxt: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  cardGoal: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  cardDesc: { fontSize: 12, color: COLORS.textSub, lineHeight: 18, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  statChip: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statVal: { fontSize: 10, fontWeight: '700', color: COLORS.textSub },
  levelPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  levelTxt: { fontSize: 10, fontWeight: '800' },
  chevronWrap: { justifyContent: 'center', paddingRight: 14 },
  chevron: { fontSize: 24, fontWeight: '300' },
});

// Detail modal
const d = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    gap: 14,
  },
  deco: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 22, color: '#fff', lineHeight: 26 },
  activeChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeChipTxt: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emojiCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerGoal: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  headerChips: { flexDirection: 'row', gap: 6, marginTop: 8 },
  headerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerChipTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionDot: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, letterSpacing: -0.1 },
  descTxt: { fontSize: 14, color: COLORS.textSub, lineHeight: 22 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  dayNum: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumTxt: { fontSize: 12, fontWeight: '800' },
  dayName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  dayFocus: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  moveBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  moveTxt: { fontSize: 11, fontWeight: '700' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  exNum: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
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
