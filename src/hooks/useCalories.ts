import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { getWorkouts } from '../api/workouts';
import { getTodaySteps, getWeeklySteps } from '../utils/stepTracker';
import { createMetric } from '../api/metrics';
import { calcStepsCalories, calcWorkoutCalories, calcDailyGoal } from '../utils/calorieCalc';

const PROFILE_KEY = 'calories_user_profile';

export const clearCaloriesCache = (): void => {
  _cache = null;
};

// Module-level cache — survives tab switches, cleared after 5 minutes
interface CaloriesCache {
  weeklyData: DailyCalories[];
  todaySteps: number;
  timestamp: number;
}
let _cache: CaloriesCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface CaloriesProfile {
  weightKg: number;
  ageYears: number;
  gender: 'male' | 'female' | 'other';
}

export interface DailyCalories {
  date: string; // YYYY-MM-DD
  stepsCalories: number;
  workoutCalories: number;
  total: number;
}

interface UseCaloriesResult {
  todayTotal: number;
  todaySteps: number;
  todayStepsCalories: number;
  todayWorkoutCalories: number;
  weeklyData: DailyCalories[];
  weeklyTotal: number;
  weeklyAvg: number;
  dailyGoal: number;
  error: string | null;
  profile: CaloriesProfile | null;
  saveProfile: (p: CaloriesProfile) => Promise<void>;
  refresh: () => Promise<void>;
}

const localDateStr = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const useCalories = (): UseCaloriesResult => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CaloriesProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  // Seed from cache synchronously — screen renders with real data on first frame
  const [weeklyData, setWeeklyData] = useState<DailyCalories[]>(_cache?.weeklyData ?? []);
  const [todaySteps, setTodaySteps] = useState(_cache?.todaySteps ?? 0);
  const [error, setError] = useState<string | null>(null);

  // Load profile from SecureStore once on mount
  useEffect(() => {
    SecureStore.getItemAsync(PROFILE_KEY)
      .then((raw) => {
        if (raw) setProfile(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setProfileReady(true));
  }, []);

  const saveProfile = useCallback(async (p: CaloriesProfile): Promise<void> => {
    try {
      await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(p));
      clearCaloriesCache(); // weight changed → stale cache
      setProfile(p);
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to save profile');
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user || !profile) return;

    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Fetch weekly steps, today's live steps, and workouts all in parallel
      const [weeklySteps, todayLiveSteps, workouts] = await Promise.all([
        getWeeklySteps(),
        getTodaySteps(),
        getWorkouts(user.user_id, {
          status: 'completed',
          from: sevenDaysAgo.toISOString(),
        }),
      ]);

      const liveSteps = todayLiveSteps ?? weeklySteps[weeklySteps.length - 1]?.steps ?? 0;
      setTodaySteps(liveSteps);

      // Build a map of date -> workout calories
      // Always recalculate from MET so numbers are consistent regardless of
      // what was stored by older app versions (which used a flat 7 kcal/min).
      const workoutCalByDate: Record<string, number> = {};
      workouts.forEach((w) => {
        const date = localDateStr(new Date(w.completedAt ?? w.scheduledAt));
        const cal = calcWorkoutCalories(w.durationMins, w.category, profile.weightKg);
        workoutCalByDate[date] = (workoutCalByDate[date] ?? 0) + cal;
      });

      // Build 7-day array
      const data: DailyCalories[] = weeklySteps.map((d, i) => {
        const isToday = i === weeklySteps.length - 1;
        const steps = isToday ? liveSteps : d.steps;
        const stepsCalories = calcStepsCalories(steps, profile.weightKg);
        const workoutCalories = workoutCalByDate[d.date] ?? 0;
        return {
          date: d.date,
          stepsCalories,
          workoutCalories,
          total: stepsCalories + workoutCalories,
        };
      });

      _cache = { weeklyData: data, todaySteps: liveSteps, timestamp: Date.now() };
      setWeeklyData(data);

      // Fire-and-forget backend sync — does not block UI
      const todayData = data[data.length - 1];
      if (todayData && todayData.total > 0) {
        createMetric(user.user_id, {
          type: 'calories_burned',
          value: todayData.total,
          unit: 'kcal',
          timestamp: new Date().toISOString(),
          source: 'manual',
        }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calories');
    }
  }, [user, profile]);

  // Only run after profile is loaded from storage
  useEffect(() => {
    if (profileReady) refresh();
  }, [profileReady, refresh]);

  const today = weeklyData[weeklyData.length - 1];
  const weeklyTotal = weeklyData.reduce((s, d) => s + d.total, 0);
  const weeklyAvg = weeklyData.length > 0 ? Math.round(weeklyTotal / weeklyData.length) : 0;
  const dailyGoal = profile
    ? calcDailyGoal(profile.weightKg, profile.ageYears, profile.gender)
    : 2000;

  return {
    todayTotal: today?.total ?? 0,
    todaySteps,
    todayStepsCalories: today?.stepsCalories ?? 0,
    todayWorkoutCalories: today?.workoutCalories ?? 0,
    weeklyData,
    weeklyTotal,
    weeklyAvg,
    dailyGoal,
    error,
    profile,
    saveProfile,
    refresh,
  };
};
