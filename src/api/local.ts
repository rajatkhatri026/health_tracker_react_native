/**
 * Local AsyncStorage layer for data that has no backend endpoint yet.
 * Keys are namespaced per user: e.g. "workouts_<userId>"
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toUTCISOString, localDateString } from '../utils/format';
import { encryptLocalJSON, decryptLocalJSON } from '../utils/localCrypto';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkoutEntry {
  id: string;
  name: string;
  category: string;
  exercises: number;
  durationMins: number;
  scheduledAt: string; // ISO
  completed: boolean;
  emoji: string;
}

export interface MealEntry {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
  loggedAt: string; // ISO
}

export interface SleepSchedule {
  id: string;
  type: 'bedtime' | 'alarm';
  time: string; // "HH:MM" 24h
  label: string;
  enabled: boolean;
  days: number[]; // 0=Sun … 6=Sat, empty = every day
  repeat: boolean;
  vibrate: boolean;
  snoozeMin: number;
}

export interface SleepEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  bedtime: string; // ISO
  wakeTime: string; // ISO
  durationHrs: number;
  qualityScore: number; // 0–100
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const key = (userId: string, namespace: string) => `${namespace}_${userId}`;

async function loadList<T>(k: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) return [];
    try {
      return await decryptLocalJSON<T[]>(raw);
    } catch {
      // Legacy plaintext fallback — if this also fails, return empty list
      try {
        return JSON.parse(raw) as T[];
      } catch {
        return [];
      }
    }
  } catch {
    return []; // AsyncStorage read failure — return empty gracefully
  }
}

async function saveList<T>(k: string, items: T[]): Promise<void> {
  try {
    const encrypted = await encryptLocalJSON(items);
    await AsyncStorage.setItem(k, encrypted);
  } catch (e) {
    throw e instanceof Error ? e : new Error('Failed to save data locally');
  }
}

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Workouts ─────────────────────────────────────────────────────────────────

export const getWorkouts = (userId: string) => loadList<WorkoutEntry>(key(userId, 'workouts'));

export const addWorkout = async (
  userId: string,
  payload: Omit<WorkoutEntry, 'id'>
): Promise<WorkoutEntry> => {
  const list = await getWorkouts(userId);
  const entry: WorkoutEntry = { ...payload, id: uuid() };
  await saveList(key(userId, 'workouts'), [entry, ...list]);
  return entry;
};

export const toggleWorkoutComplete = async (userId: string, id: string): Promise<void> => {
  const list = await getWorkouts(userId);
  await saveList(
    key(userId, 'workouts'),
    list.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w))
  );
};

export const seedDefaultWorkouts = async (userId: string): Promise<void> => {
  const existing = await getWorkouts(userId);
  if (existing.length > 0) return;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const day3 = new Date(now);
  day3.setDate(now.getDate() + 2);
  const defaults: Omit<WorkoutEntry, 'id'>[] = [
    {
      name: 'Fullbody Workout',
      category: 'Strength',
      exercises: 11,
      durationMins: 32,
      scheduledAt: new Date(now.setHours(15, 0, 0, 0)).toISOString(),
      completed: false,
      emoji: '🏋️',
    },
    {
      name: 'Upperbody Workout',
      category: 'Strength',
      exercises: 12,
      durationMins: 40,
      scheduledAt: new Date(tomorrow.setHours(9, 0, 0, 0)).toISOString(),
      completed: false,
      emoji: '💪',
    },
    {
      name: 'Ab Workout',
      category: 'Core',
      exercises: 14,
      durationMins: 20,
      scheduledAt: new Date(day3.setHours(7, 30, 0, 0)).toISOString(),
      completed: false,
      emoji: '🤸',
    },
  ];
  for (const d of defaults) await addWorkout(userId, d);
};

// ── Meals ─────────────────────────────────────────────────────────────────────

export const getMeals = async (userId: string, date?: string): Promise<MealEntry[]> => {
  const all = await loadList<MealEntry>(key(userId, 'meals'));
  if (!date) return all;
  return all.filter((m) => m.loggedAt.startsWith(date));
};

export const addMeal = async (
  userId: string,
  payload: Omit<MealEntry, 'id' | 'loggedAt'>
): Promise<MealEntry> => {
  const all = await loadList<MealEntry>(key(userId, 'meals'));
  // Store loggedAt as local date prefix YYYY-MM-DD + T + local time so date filtering works in any timezone
  const now = new Date();
  const localISO = `${localDateString(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00.000`;
  const entry: MealEntry = { ...payload, id: uuid(), loggedAt: localISO };
  await saveList(key(userId, 'meals'), [entry, ...all]);
  return entry;
};

export const deleteMeal = async (userId: string, id: string): Promise<void> => {
  const all = await loadList<MealEntry>(key(userId, 'meals'));
  await saveList(
    key(userId, 'meals'),
    all.filter((m) => m.id !== id)
  );
};

export const seedDefaultMeals = async (userId: string): Promise<void> => {
  // Only seed once ever — check a permanent flag, not daily meals
  const flagKey = key(userId, 'meals_seeded');
  const flagRaw = await AsyncStorage.getItem(flagKey);
  if (flagRaw === 'true') return;
  await AsyncStorage.setItem(flagKey, 'true');
};

// ── Sleep Schedules ───────────────────────────────────────────────────────────

export const getSleepSchedules = (userId: string) =>
  loadList<SleepSchedule>(key(userId, 'sleep_schedules'));

export const saveSleepSchedules = (userId: string, schedules: SleepSchedule[]) =>
  saveList(key(userId, 'sleep_schedules'), schedules);

export const toggleSleepSchedule = async (userId: string, id: string): Promise<void> => {
  const list = await getSleepSchedules(userId);
  await saveList(
    key(userId, 'sleep_schedules'),
    list.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
  );
};

export const addSleepSchedule = async (
  userId: string,
  payload: Omit<SleepSchedule, 'id'>
): Promise<SleepSchedule> => {
  const list = await getSleepSchedules(userId);
  const entry: SleepSchedule = { ...payload, id: uuid() };
  await saveList(key(userId, 'sleep_schedules'), [...list, entry]);
  return entry;
};

export const deleteSleepSchedule = async (userId: string, id: string): Promise<void> => {
  const list = await getSleepSchedules(userId);
  await saveList(
    key(userId, 'sleep_schedules'),
    list.filter((s) => s.id !== id)
  );
};

export const updateSleepSchedule = async (
  userId: string,
  id: string,
  patch: Partial<Omit<SleepSchedule, 'id'>>
): Promise<void> => {
  const list = await getSleepSchedules(userId);
  await saveList(
    key(userId, 'sleep_schedules'),
    list.map((s) => (s.id === id ? { ...s, ...patch } : s))
  );
};

export const seedDefaultSleepSchedules = async (userId: string): Promise<void> => {
  const existing = await getSleepSchedules(userId);
  // Migrate old schedules missing new fields
  if (existing.length > 0) {
    const needsMigration = existing.some((s) => s.days === undefined);
    if (needsMigration) {
      const migrated = existing.map((s) => ({
        ...s,
        days: s.days ?? [],
        repeat: s.repeat ?? true,
        vibrate: s.vibrate ?? false,
        snoozeMin: s.snoozeMin ?? 5,
      }));
      await saveList(key(userId, 'sleep_schedules'), migrated);
    }
    return;
  }
  const defaults: SleepSchedule[] = [
    {
      id: uuid(),
      type: 'bedtime',
      time: '22:30',
      label: 'Bedtime',
      enabled: true,
      days: [],
      repeat: true,
      vibrate: false,
      snoozeMin: 5,
    },
    {
      id: uuid(),
      type: 'alarm',
      time: '07:00',
      label: 'Wake Up',
      enabled: true,
      days: [],
      repeat: true,
      vibrate: true,
      snoozeMin: 5,
    },
  ];
  await saveList(key(userId, 'sleep_schedules'), defaults);
};

// ── Sleep Entries ─────────────────────────────────────────────────────────────

export const getSleepEntries = (userId: string) =>
  loadList<SleepEntry>(key(userId, 'sleep_entries'));

export const addSleepEntry = async (
  userId: string,
  payload: Omit<SleepEntry, 'id'>
): Promise<SleepEntry> => {
  const list = await getSleepEntries(userId);
  const entry: SleepEntry = { ...payload, id: uuid() };
  await saveList(key(userId, 'sleep_entries'), [entry, ...list]);
  return entry;
};
