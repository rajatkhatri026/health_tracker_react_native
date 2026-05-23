import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STREAK = '@nexara_streak';
const KEY_LAST_DAY = '@nexara_streak_last';
const KEY_BADGES = '@nexara_badges';

export interface StreakData {
  current: number;
  best: number;
  lastDay: string; // YYYY-MM-DD
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  unlockedAt: string; // ISO
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function loadStreak(): Promise<StreakData> {
  const raw = await AsyncStorage.getItem(KEY_STREAK);
  const lastDay = await AsyncStorage.getItem(KEY_LAST_DAY);
  const data: StreakData = raw ? JSON.parse(raw) : { current: 0, best: 0, lastDay: '' };
  return { ...data, lastDay: lastDay ?? data.lastDay };
}

export async function checkInToday(): Promise<StreakData> {
  const data = await loadStreak();
  const t = today();

  if (data.lastDay === t) return data; // already checked in today

  const isConsecutive = data.lastDay === yesterday();
  const newCurrent = isConsecutive ? data.current + 1 : 1;
  const newBest = Math.max(data.best, newCurrent);

  const updated: StreakData = { current: newCurrent, best: newBest, lastDay: t };
  await AsyncStorage.setItem(KEY_STREAK, JSON.stringify(updated));
  await AsyncStorage.setItem(KEY_LAST_DAY, t);

  // Check badge unlocks
  await checkBadgeUnlocks(updated);

  return updated;
}

// ── Badges ────────────────────────────────────────────────────────────────────
const BADGE_DEFS: Array<{ id: string; label: string; emoji: string; streakNeeded: number }> = [
  { id: 'spark', label: 'First Spark', emoji: '✨', streakNeeded: 1 },
  { id: 'fire3', label: '3-Day Fire', emoji: '🔥', streakNeeded: 3 },
  { id: 'week', label: 'One Week Strong', emoji: '💪', streakNeeded: 7 },
  { id: 'fortnight', label: 'Fortnight Grind', emoji: '⚡', streakNeeded: 14 },
  { id: 'month', label: 'Month Warrior', emoji: '🏆', streakNeeded: 30 },
  { id: 'century', label: 'Century Club', emoji: '💯', streakNeeded: 100 },
];

export async function loadBadges(): Promise<Badge[]> {
  const raw = await AsyncStorage.getItem(KEY_BADGES);
  return raw ? JSON.parse(raw) : [];
}

async function checkBadgeUnlocks(streak: StreakData): Promise<void> {
  const earned = await loadBadges();
  const earnedIds = new Set(earned.map((b) => b.id));
  const newBadges: Badge[] = [];

  for (const def of BADGE_DEFS) {
    if (!earnedIds.has(def.id) && streak.current >= def.streakNeeded) {
      newBadges.push({
        id: def.id,
        label: def.label,
        emoji: def.emoji,
        unlockedAt: new Date().toISOString(),
      });
    }
  }
  if (newBadges.length > 0) {
    await AsyncStorage.setItem(KEY_BADGES, JSON.stringify([...earned, ...newBadges]));
  }
}

// ── Weekly Score (0–100) ──────────────────────────────────────────────────────
// Stored separately per day as a simple check-in score
const KEY_WEEKLY = '@nexara_weekly_score';

export interface DayScore {
  date: string;
  score: number;
}

export async function addDayScore(score: number): Promise<DayScore[]> {
  const raw = await AsyncStorage.getItem(KEY_WEEKLY);
  const all: DayScore[] = raw ? JSON.parse(raw) : [];
  const t = today();
  const filtered = all.filter((d) => d.date !== t); // replace today
  const updated = [...filtered, { date: t, score }];
  // Keep last 7 days
  const last7 = updated.slice(-7);
  await AsyncStorage.setItem(KEY_WEEKLY, JSON.stringify(last7));
  return last7;
}

export async function loadWeeklyScores(): Promise<DayScore[]> {
  const raw = await AsyncStorage.getItem(KEY_WEEKLY);
  return raw ? JSON.parse(raw) : [];
}
