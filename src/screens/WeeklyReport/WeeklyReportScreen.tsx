/* eslint-disable react-hooks/refs */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';
import {
  loadStreak,
  loadBadges,
  loadWeeklyScores,
  type Badge,
  type DayScore,
} from '../../utils/streaks';
import { useMetrics } from '../../hooks/useMetrics';
import { useWorkouts } from '../../hooks/useWorkouts';

const { width: W } = Dimensions.get('window');
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekRange(): string {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function gradeFromScore(score: number): { letter: string; color: string; label: string } {
  if (score >= 90) return { letter: 'A+', color: '#10B981', label: 'Outstanding' };
  if (score >= 80) return { letter: 'A', color: '#10B981', label: 'Excellent' };
  if (score >= 70) return { letter: 'B', color: '#06B6D4', label: 'Good' };
  if (score >= 55) return { letter: 'C', color: '#F59E0B', label: 'Average' };
  return { letter: 'D', color: '#EF4444', label: 'Needs Work' };
}

export default function WeeklyReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { latest } = useMetrics();
  const { completedToday, workouts } = useWorkouts();

  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [weekScores, setWeekScores] = useState<DayScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Promise.all([loadStreak(), loadBadges(), loadWeeklyScores()]).then(([s, b, ws]) => {
      setStreak(s.current);
      setBadges(b);
      setWeekScores(ws);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  // Weekly stats derived from data
  const thisWeekWorkouts = workouts.filter((w) => {
    const d = new Date(w.createdAt ?? '');
    const day = d.getDay() || 7;
    const mon = new Date();
    mon.setDate(new Date().getDate() - (new Date().getDay() || 7) + 1);
    mon.setHours(0, 0, 0, 0);
    return d >= mon;
  }).length;

  const avgScore =
    weekScores.length > 0
      ? Math.round(weekScores.reduce((s, d) => s + d.score, 0) / weekScores.length)
      : 72;
  const grade = gradeFromScore(avgScore);
  const maxBar = Math.max(...weekScores.map((d) => d.score), 1);

  const stats = [
    { emoji: '🔥', label: 'Current Streak', value: `${streak}d`, color: '#EF4444', bg: '#FEF2F2' },
    {
      emoji: '🏋️',
      label: 'Workouts',
      value: String(thisWeekWorkouts),
      color: '#7C3AED',
      bg: '#EDE9FE',
    },
    {
      emoji: '🏅',
      label: 'Badges Earned',
      value: String(badges.length),
      color: '#F59E0B',
      bg: '#FEF3C7',
    },
    { emoji: '📊', label: 'Weekly Score', value: `${avgScore}%`, color: '#06B6D4', bg: '#ECFEFF' },
  ];

  const shareReport = async () => {
    try {
      await Share.share({
        message: `📊 My Nexara Weekly Report (${weekRange()})\n\n🔥 Streak: ${streak} days\n🏋️ Workouts: ${thisWeekWorkouts}\n📈 Score: ${avgScore}% — ${grade.label}\n🏅 Badges: ${badges.length}\n\nTracked with Nexara Health App`,
      });
    } catch {
      Alert.alert('Could not share', 'Try again later.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Weekly Report</Text>
          <Text style={s.sub}>{weekRange()}</Text>
        </View>
        <TouchableOpacity onPress={shareReport} style={s.shareBtn} activeOpacity={0.8}>
          <Text style={s.shareTxt}>↑ Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          {/* ── Grade Hero ── */}
          <LinearGradient
            colors={['#1A0A3B', '#07040F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.gradeCard}
          >
            <View style={[s.gradeCircle, { borderColor: grade.color + '60' }]}>
              <Text style={[s.gradeLetter, { color: grade.color }]}>{grade.letter}</Text>
            </View>
            <Text style={s.gradeLabel}>{grade.label} Week</Text>
            <Text style={s.gradeScore}>{avgScore}% overall score</Text>
            <View style={s.weekChips}>
              {DAY_LABELS.map((d, i) => {
                const dayScore = weekScores.find((ws) => {
                  const date = new Date(ws.date);
                  const dayIdx = (date.getDay() + 6) % 7;
                  return dayIdx === i;
                });
                const active = !!dayScore;
                return (
                  <View key={d} style={[s.dayChip, active && { backgroundColor: grade.color }]}>
                    <Text style={[s.dayChipTxt, active && { color: '#fff' }]}>{d[0]}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>

          {/* ── Stats grid ── */}
          <View style={s.statsGrid}>
            {stats.map((st, i) => (
              <View key={i} style={[s.statCard, { backgroundColor: st.bg }]}>
                <Text style={{ fontSize: 22, marginBottom: 6 }}>{st.emoji}</Text>
                <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Activity Bar Chart ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Daily Activity Score</Text>
            <View style={s.barChart}>
              {DAY_LABELS.map((day, i) => {
                const dayScore = weekScores.find((ws) => {
                  const date = new Date(ws.date);
                  const dayIdx = (date.getDay() + 6) % 7;
                  return dayIdx === i;
                });
                const h = dayScore ? Math.max(4, (dayScore.score / maxBar) * 100) : 4;
                const isToday = new Date().getDay() === (i + 1) % 7;
                return (
                  <View key={day} style={s.barCol}>
                    <Text style={s.barScoreTxt}>{dayScore ? dayScore.score : ''}</Text>
                    <View
                      style={[
                        s.bar,
                        {
                          height: h,
                          backgroundColor: isToday
                            ? '#7C3AED'
                            : dayScore
                              ? '#A78BFA'
                              : COLORS.border,
                        },
                      ]}
                    />
                    <Text style={[s.barLabel, isToday && { color: '#7C3AED', fontWeight: '800' }]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Badges ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Badges Earned</Text>
            {badges.length === 0 ? (
              <View style={s.emptyBadges}>
                <Text style={{ fontSize: 32 }}>🎖️</Text>
                <Text style={s.emptyBadgeTxt}>Keep your streak going to unlock badges!</Text>
              </View>
            ) : (
              <View style={s.badgeGrid}>
                {badges.map((b) => (
                  <View key={b.id} style={s.badgeCard}>
                    <LinearGradient colors={['#7C3AED22', '#4F46E511']} style={s.badgeIconBg}>
                      <Text style={{ fontSize: 28 }}>{b.emoji}</Text>
                    </LinearGradient>
                    <Text style={s.badgeName}>{b.label}</Text>
                    <Text style={s.badgeDate}>
                      {new Date(b.unlockedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Metrics snapshot ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Health Snapshot</Text>
            {[
              {
                label: 'Weight',
                value: latest.weight ? `${latest.weight.value} kg` : '—',
                emoji: '⚖️',
              },
              {
                label: 'Sleep',
                value: latest.sleep ? `${latest.sleep.value} hrs` : '—',
                emoji: '😴',
              },
              {
                label: 'Calories',
                value: latest.nutrition ? `${latest.nutrition.value} kcal` : '—',
                emoji: '🔥',
              },
              {
                label: 'Water',
                value: latest.water ? `${latest.water.value} ml` : '—',
                emoji: '💧',
              },
            ].map((row, i) => (
              <View
                key={i}
                style={[
                  s.snapRow,
                  i < 3 && { borderBottomWidth: 1, borderBottomColor: COLORS.border },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
                <Text style={s.snapLabel}>{row.label}</Text>
                <Text style={s.snapVal}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* ── Share CTA ── */}
          <TouchableOpacity
            onPress={shareReport}
            activeOpacity={0.88}
            style={{ marginHorizontal: 20 }}
          >
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.shareCta}
            >
              <Text style={s.shareCtaTxt}>↑ Share My Report Card</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
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
  shareBtn: {
    backgroundColor: '#EDE9FE',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  shareTxt: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },

  // Grade hero
  gradeCard: { margin: 16, borderRadius: 24, padding: 24, alignItems: 'center' },
  gradeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gradeLetter: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  gradeLabel: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  gradeScore: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  weekChips: { flexDirection: 'row', gap: 8, marginTop: 16 },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipTxt: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  statCard: { width: (W - 42) / 2, borderRadius: 18, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },

  // Section
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
    marginBottom: 14,
  },

  // Bar chart
  barChart: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 120 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barScoreTxt: { fontSize: 8, color: COLORS.textMuted, fontWeight: '600', height: 12 },
  bar: { width: '100%', borderRadius: 4, maxWidth: 28 },
  barLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Badges
  emptyBadges: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyBadgeTxt: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { alignItems: 'center', gap: 4 },
  badgeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  badgeName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    maxWidth: 60,
  },
  badgeDate: { fontSize: 9, color: COLORS.textMuted },

  // Snapshot
  snapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  snapLabel: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  snapVal: { fontSize: 14, fontWeight: '800', color: COLORS.text },

  // Share CTA
  shareCta: {
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  shareCtaTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
