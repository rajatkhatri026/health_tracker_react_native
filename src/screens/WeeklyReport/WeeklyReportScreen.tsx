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
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { loadStreak, loadBadges, type Badge, type DayScore } from '../../utils/streaks';
import { useMetrics } from '../../hooks/useMetrics';
import { useWorkouts } from '../../hooks/useWorkouts';

const { width: W } = Dimensions.get('window');
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HERO_H = 280;

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

function gradeFromScore(score: number): {
  letter: string;
  color: string;
  label: string;
  bg: string;
} {
  if (score >= 90) return { letter: 'A+', color: '#10B981', label: 'Outstanding', bg: '#D1FAE5' };
  if (score >= 80) return { letter: 'A', color: '#10B981', label: 'Excellent', bg: '#D1FAE5' };
  if (score >= 70) return { letter: 'B', color: '#0891B2', label: 'Good', bg: '#E0F7FA' };
  if (score >= 55) return { letter: 'C', color: '#F59E0B', label: 'Average', bg: '#FEF3C7' };
  return { letter: 'D', color: '#EF4444', label: 'Needs Work', bg: '#FEE2E2' };
}

export default function WeeklyReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { latest } = useMetrics();
  const { workouts } = useWorkouts();
  const { user } = useAuth();

  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [sharing, setSharing] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Promise.all([loadStreak(), loadBadges()]).then(([s, b]) => {
      setStreak(s.current);
      setBadges(b);
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  // Week start (Monday)
  const weekMon = new Date();
  weekMon.setDate(new Date().getDate() - (new Date().getDay() || 7) + 1);
  weekMon.setHours(0, 0, 0, 0);

  const thisWeekWorkouts = workouts.filter((w) => new Date(w.createdAt ?? '') >= weekMon).length;

  // Compute daily activity score from real metrics (steps, water, calories, sleep, workout)
  // Each day max 100 pts: steps(25) + water(25) + calories(20) + sleep(15) + workout(15)
  const weekScores: DayScore[] = DAY_LABELS.map((_, i) => {
    const dayDate = new Date(weekMon);
    dayDate.setDate(weekMon.getDate() + i);
    const dateStr = dayDate.toISOString().slice(0, 10);

    const metricsOnDay = (type: string) =>
      latest[type as keyof typeof latest] ? [latest[type as keyof typeof latest]!] : [];

    // Check latest metric matches this day
    const onDay = (m: { timestamp?: string | Date } | null | undefined) => {
      if (!m) return false;
      const ts = m as any;
      const d = ts.timestamp ? new Date(ts.timestamp) : null;
      return d ? d.toISOString().slice(0, 10) === dateStr : false;
    };

    const workoutDone = workouts.some((w) => {
      const d = new Date(w.scheduledAt ?? w.createdAt ?? '');
      return d.toISOString().slice(0, 10) === dateStr && w.status === 'completed';
    });

    let score = 0;
    if (onDay(latest.steps)) score += 25;
    if (onDay(latest.water)) score += 25;
    if (onDay(latest.nutrition)) score += 20;
    if (onDay(latest.sleep)) score += 15;
    if (workoutDone) score += 15;

    // Only return a score for days that have passed or are today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dayDate > today || score === 0) return null;
    return { date: dateStr, score };
  }).filter(Boolean) as DayScore[];

  const avgScore =
    weekScores.length > 0
      ? Math.round(weekScores.reduce((s, d) => s + d.score, 0) / weekScores.length)
      : 0;
  const grade = gradeFromScore(avgScore > 0 ? avgScore : 72);
  const maxBar = Math.max(...weekScores.map((d) => d.score), 1);

  const shareReport = async () => {
    if (!user || sharing) return;
    setSharing(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      const url = `${baseUrl}/users/${user.user_id}/profile/weekly-report`;

      const firstName = (user.name ?? 'User').split(' ')[0];
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Nexara_Weekly_Report_${firstName}_${dateStr}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const existing = await FileSystem.getInfoAsync(fileUri);
      if (existing.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true });

      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (result.status !== 200) {
        Alert.alert('Error', 'Failed to generate report. Please try again.');
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', 'Your device does not support sharing files.');
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to share report. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  // ── Derived day-of-week index helper ─────────────────────────────────
  const getDayIdx = (ws: DayScore) => (new Date(ws.date).getDay() + 6) % 7;
  const todayIdx = (new Date().getDay() + 6) % 7;

  const STATS = [
    {
      emoji: '🔥',
      label: 'Streak',
      value: `${streak}`,
      unit: 'days',
      color: '#EF4444',
      bg: '#FEF2F2',
      border: '#FECACA',
    },
    {
      emoji: '🏋️',
      label: 'Workouts',
      value: `${thisWeekWorkouts}`,
      unit: 'this week',
      color: '#0891B2',
      bg: '#E0F7FA',
      border: '#BAE6FD',
    },
    {
      emoji: '🏅',
      label: 'Badges',
      value: `${badges.length}`,
      unit: 'earned',
      color: '#F59E0B',
      bg: '#FEF3C7',
      border: '#FDE68A',
    },
    {
      emoji: '📊',
      label: 'Avg Score',
      value: `${avgScore}`,
      unit: '/ 100',
      color: '#8B5CF6',
      bg: '#F5F3FF',
      border: '#DDD6FE',
    },
  ];

  const SNAPSHOT = [
    {
      emoji: '⚖️',
      label: 'Weight',
      value: latest.weight ? `${latest.weight.value} kg` : '—',
      color: '#0891B2',
    },
    {
      emoji: '😴',
      label: 'Sleep',
      value: latest.sleep ? `${latest.sleep.value} hrs` : '—',
      color: '#8B5CF6',
    },
    {
      emoji: '🔥',
      label: 'Calories',
      value: latest.nutrition ? `${latest.nutrition.value} kcal` : '—',
      color: '#F59E0B',
    },
    {
      emoji: '💧',
      label: 'Water',
      value: latest.water ? `${latest.water.value} ml` : '—',
      color: '#38BDF8',
    },
  ];

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Fixed Gradient Hero ─────────────────────────────────────────── */}
      <View style={s.heroWrap}>
        <LinearGradient
          colors={['#0C2340', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.heroGrad, { paddingTop: insets.top + 12 }]}
        >
          {/* Decorative circles */}
          <View
            style={[s.deco, { width: 200, height: 200, top: -60, right: -50, opacity: 0.08 }]}
          />
          <View
            style={[s.deco, { width: 120, height: 120, bottom: 10, left: -30, opacity: 0.06 }]}
          />

          {/* Top row — title absolutely centred */}
          <View style={s.topRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={s.backBtn}
              activeOpacity={0.8}
            >
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            {/* Centred title — absolute so back btn width doesn't shift it */}
            <View style={s.topTitleWrap} pointerEvents="none">
              <Text style={s.heroTitle}>Weekly Report</Text>
              <Text style={s.heroSub}>{weekRange()}</Text>
            </View>
            <TouchableOpacity
              onPress={shareReport}
              style={s.shareBtn}
              activeOpacity={0.8}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size={13} color="#fff" />
              ) : (
                <Text style={s.shareTxt}>↑ Share</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Grade centre + stat chips row */}
          <View style={s.heroBody}>
            {/* Grade circle */}
            <View style={s.gradeBox}>
              <View style={[s.gradePill, { borderColor: 'rgba(255,255,255,0.35)' }]}>
                <Text style={s.gradeLetter}>{grade.letter}</Text>
              </View>
              <Text style={s.gradeLabel}>{grade.label}</Text>
              <Text style={s.gradeScore}>{avgScore}% score</Text>
            </View>

            {/* Divider */}
            <View style={s.heroVertDivider} />

            {/* Right — 4 inline mini-stats */}
            <View style={s.heroStatsCol}>
              {[
                { label: 'STREAK', value: `${streak}d`, color: '#FCA5A5' },
                { label: 'WORKOUTS', value: `${thisWeekWorkouts}`, color: '#BAE6FD' },
                { label: 'BADGES', value: `${badges.length}`, color: '#FDE68A' },
                { label: 'AVG SCORE', value: `${avgScore}%`, color: '#C4B5FD' },
              ].map((item) => (
                <View key={item.label} style={s.heroMiniStat}>
                  <Text style={[s.heroMiniVal, { color: item.color }]}>{item.value}</Text>
                  <Text style={s.heroMiniLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── Scrollable Content ───────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ marginTop: HERO_H }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 20 }}
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          {/* ── Activity Bar Chart ── */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Daily Activity Score</Text>
              <View style={s.pill}>
                <Text style={s.pillTxt}>7 days</Text>
              </View>
            </View>
            <View style={s.barChart}>
              {DAY_LABELS.map((day, i) => {
                const ds = weekScores.find((ws) => getDayIdx(ws) === i);
                const h = ds ? Math.max(6, (ds.score / maxBar) * 96) : 4;
                const isToday = i === todayIdx;
                return (
                  <View key={day} style={s.barCol}>
                    <Text style={[s.barScore, ds && { color: isToday ? '#0891B2' : '#6B7280' }]}>
                      {ds ? ds.score : ''}
                    </Text>
                    <View style={s.barTrack}>
                      <LinearGradient
                        colors={
                          isToday
                            ? ['#0C2340', '#0891B2']
                            : ds
                              ? ['#BAE6FD', '#38BDF8']
                              : ['#E4E7F0', '#E4E7F0']
                        }
                        start={{ x: 0, y: 1 }}
                        end={{ x: 0, y: 0 }}
                        style={[s.bar, { height: h }]}
                      />
                    </View>
                    <Text style={[s.barDay, isToday && { color: '#0891B2', fontWeight: '800' }]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Health Snapshot ── */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Health Snapshot</Text>
              <View style={s.pill}>
                <Text style={s.pillTxt}>Latest</Text>
              </View>
            </View>
            <View style={s.snapshotGrid}>
              {SNAPSHOT.map((row, i) => (
                <View key={row.label} style={[s.snapCard, { borderLeftColor: row.color }]}>
                  {/* Coloured left accent + icon */}
                  <View style={[s.snapIconWrap, { backgroundColor: row.color + '15' }]}>
                    <Text style={{ fontSize: 22 }}>{row.emoji}</Text>
                  </View>
                  {/* Label + value */}
                  <View style={s.snapTextCol}>
                    <Text style={s.snapLabel}>{row.label}</Text>
                    <Text style={[s.snapVal, { color: row.color }]}>{row.value}</Text>
                  </View>
                  {/* Subtle progress bar at bottom */}
                  <View style={[s.snapAccentBar, { backgroundColor: row.color + '20' }]}>
                    <View
                      style={[
                        s.snapAccentFill,
                        { backgroundColor: row.color, width: row.value === '—' ? '0%' : '65%' },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Badges ── */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Badges Earned</Text>
              <View style={s.pill}>
                <Text style={s.pillTxt}>{badges.length} total</Text>
              </View>
            </View>
            {badges.length === 0 ? (
              <View style={s.emptyBadges}>
                <Text style={{ fontSize: 36 }}>🎖️</Text>
                <Text style={s.emptyTxt}>Keep your streak going to earn badges!</Text>
              </View>
            ) : (
              <View style={s.badgeGrid}>
                {badges.map((b) => (
                  <View key={b.id} style={s.badgeCard}>
                    <LinearGradient colors={['#E0F7FA', '#BAE6FD']} style={s.badgeIconBg}>
                      <Text style={{ fontSize: 26 }}>{b.emoji}</Text>
                    </LinearGradient>
                    <Text style={s.badgeName} numberOfLines={2}>
                      {b.label}
                    </Text>
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

          {/* ── Share CTA ── */}
          <TouchableOpacity
            onPress={shareReport}
            activeOpacity={0.88}
            style={{ marginHorizontal: 20, marginTop: 4 }}
          >
            <LinearGradient
              colors={['#0C2340', '#0891B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.shareCta}
            >
              {sharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.shareCtaTxt}>↑ Export & Share PDF</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  // Hero
  heroWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, height: HERO_H },
  heroGrad: {
    height: HERO_H,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  deco: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
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
  shareBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 1,
  },
  shareTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },

  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingHorizontal: 4 },

  // Grade box
  gradeBox: { alignItems: 'center', gap: 5, width: 96 },
  gradePill: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeLetter: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  gradeLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  gradeScore: { fontSize: 10, color: 'rgba(186,230,253,0.8)', fontWeight: '600' },

  heroVertDivider: {
    width: 1,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 14,
  },

  // Right mini-stats
  heroStatsCol: { flex: 1, gap: 7 },
  heroMiniStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroMiniVal: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  heroMiniLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(186,230,253,0.75)',
    letterSpacing: 0.5,
  },

  // Day track
  dayTrack: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 4,
  },
  dayTrackCol: { flex: 1, alignItems: 'center', gap: 4 },
  dayChip: {
    width: '100%',
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipTxt: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  dayTrackScore: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(186,230,253,0.65)',
    textAlign: 'center',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  statCard: {
    width: (W - 50) / 2,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statEmoji: { fontSize: 26 },
  statTextCol: { flex: 1 },
  statVal: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8, lineHeight: 30 },
  statUnit: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 1 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', marginTop: 3 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 14,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F8',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  pill: {
    backgroundColor: '#E0F7FA',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  pillTxt: { fontSize: 10, color: '#0891B2', fontWeight: '700' },

  // Bar chart
  barChart: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 130 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barScore: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: '600',
    height: 12,
    textAlign: 'center',
  },
  barTrack: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { width: '100%', borderRadius: 6 },
  barDay: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Snapshot grid — 2×2
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 10 },
  snapCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  snapIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  snapTextCol: { flex: 1 },
  snapLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.3 },
  snapVal: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  snapAccentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  snapAccentFill: { height: 3 },

  // Badges
  emptyBadges: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  emptyTxt: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { alignItems: 'center', gap: 6, width: (W - 80) / 4 },
  badgeIconBg: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  badgeName: { fontSize: 9, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  badgeDate: { fontSize: 8, color: COLORS.textMuted },

  // Share CTA
  shareCta: {
    borderRadius: RADIUS.full,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  shareCtaTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
});
