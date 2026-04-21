/**
 * Local AsyncStorage layer for data that has no backend endpoint yet.
 * Keys are namespaced per user: e.g. "workouts_<userId>"
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toUTCISOString, localDateString } from '../utils/format';

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
  const raw = await AsyncStorage.getItem(k);
  return raw ? JSON.parse(raw) : [];
}

async function saveList<T>(k: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(k, JSON.stringify(items));
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
  const entry: MealEntry = { ...payload, id: uuid(), loggedAt: toUTCISOString(new Date()) };
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
  const today = localDateString();
  const existing = await getMeals(userId, today);
  if (existing.length > 0) return;
  const defaults: Omit<MealEntry, 'id' | 'loggedAt'>[] = [
    {
      name: 'Salmon Nigiri',
      category: 'breakfast',
      calories: 120,
      protein: 12,
      carbs: 14,
      fat: 3,
      emoji: '🍣',
    },
    {
      name: 'Lowfat Milk',
      category: 'breakfast',
      calories: 80,
      protein: 8,
      carbs: 12,
      fat: 2,
      emoji: '🥛',
    },
    {
      name: 'Grilled Chicken',
      category: 'lunch',
      calories: 320,
      protein: 42,
      carbs: 8,
      fat: 12,
      emoji: '🍗',
    },
    {
      name: 'Brown Rice Bowl',
      category: 'lunch',
      calories: 240,
      protein: 6,
      carbs: 48,
      fat: 3,
      emoji: '🍚',
    },
  ];
  for (const d of defaults) await addMeal(userId, d);
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

export const seedDefaultSleepSchedules = async (userId: string): Promise<void> => {
  const existing = await getSleepSchedules(userId);
  if (existing.length > 0) return;
  const defaults: SleepSchedule[] = [
    { id: uuid(), type: 'bedtime', time: '21:00', label: 'Bedtime', enabled: true },
    { id: uuid(), type: 'alarm', time: '05:10', label: 'Alarm', enabled: true },
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
