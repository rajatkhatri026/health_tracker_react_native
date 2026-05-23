/**
 * useCalories
 *
 * Calculates daily calories burned from two sources:
 *   1. Steps  — Harris-Benedict BMR × activity factor derived from step count
 *   2. Workouts — MET-based formula using workout duration and category
 *
 * Formula references:
 *   Steps:   Calories = (steps / 1000) × 0.57 × weight_kg  (peer-reviewed walking MET ≈ 3.5)
 *   Workout: Calories = MET × weight_kg × duration_hrs
 *
 * User profile (weight, age, gender) is persisted in AsyncStorage so the
 * user only needs to enter it once.
 */

import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { getWorkouts } from '../api/workouts';
import { getTodaySteps, getWeeklySteps } from '../utils/stepTracker';
import { createMetric, getMetrics } from '../api/metrics';

const PROFILE_KEY = 'calories_user_profile';

// MET values per workout category (standard ACSM values)
const MET_BY_CATEGORY: Record<string, number> = {
  strength: 5.0,
  cardio: 7.0,
  hiit: 8.5,
  yoga: 3.0,
  pilates: 3.5,
  cycling: 7.5,
  running: 9.0,
  swimming: 7.0,
  stretching: 2.5,
  sports: 7.0,
  default: 5.0,
};

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
  loading: boolean;
  error: string | null;
  profile: CaloriesProfile | null;
  saveProfile: (p: CaloriesProfile) => Promise<void>;
  refresh: () => Promise<void>;
}

const localDateStr = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const calcStepsCalories = (steps: number, weightKg: number): number => {
  // (steps / 1000) × 0.57 × weight_kg — derived from MET 3.5 walking
  return Math.round((steps / 1000) * 0.57 * weightKg);
};

const calcWorkoutCalories = (durationMins: number, category: string, weightKg: number): number => {
  const met = MET_BY_CATEGORY[category.toLowerCase()] ?? MET_BY_CATEGORY.default;
  // MET × weight_kg × duration_hrs
  return Math.round(met * weightKg * (durationMins / 60));
};

export const useCalories = (): UseCaloriesResult => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CaloriesProfile | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyCalories[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile from SecureStore (PHI: weight, age, gender)
  useEffect(() => {
    SecureStore.getItemAsync(PROFILE_KEY)
      .then((raw) => {
        if (raw) setProfile(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const saveProfile = useCallback(async (p: CaloriesProfile): Promise<void> => {
    try {
      await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(p));
      setProfile(p);
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to save profile');
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Fetch weekly steps and completed workouts in parallel
      const [weeklySteps, workouts] = await Promise.all([
        getWeeklySteps(),
        getWorkouts(user.user_id, {
          status: 'completed',
          from: sevenDaysAgo.toISOString(),
        }),
      ]);

      // Today's live step count
      const todayLiveSteps = await getTodaySteps();
      setTodaySteps(todayLiveSteps ?? weeklySteps[weeklySteps.length - 1]?.steps ?? 0);

      // Build a map of date -> workout calories
      const workoutCalByDate: Record<string, number> = {};
      workouts.forEach((w) => {
        const date = localDateStr(new Date(w.completedAt ?? w.scheduledAt));
        // Use stored caloriesBurned if available, else calculate from MET
        const cal =
          w.caloriesBurned > 0
            ? w.caloriesBurned
            : calcWorkoutCalories(w.durationMins, w.category, profile.weightKg);
        workoutCalByDate[date] = (workoutCalByDate[date] ?? 0) + cal;
      });

      // Build 7-day array
      const data: DailyCalories[] = weeklySteps.map((d, i) => {
        const isToday = i === weeklySteps.length - 1;
        const steps = isToday && todayLiveSteps !== null ? todayLiveSteps : d.steps;
        const stepsCalories = calcStepsCalories(steps, profile.weightKg);
        const workoutCalories = workoutCalByDate[d.date] ?? 0;
        return {
          date: d.date,
          stepsCalories,
          workoutCalories,
          total: stepsCalories + workoutCalories,
        };
      });

      setWeeklyData(data);

      // Sync today's total to backend as a metric
      const todayData = data[data.length - 1];
      if (todayData && todayData.total > 0) {
        try {
          await createMetric(user.user_id, {
            type: 'calories_burned',
            value: todayData.total,
            unit: 'kcal',
            timestamp: new Date().toISOString(),
            source: 'manual',
          });
        } catch {
          // Sync failure is non-critical
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calories');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const today = weeklyData[weeklyData.length - 1];
  const weeklyTotal = weeklyData.reduce((s, d) => s + d.total, 0);
  const weeklyAvg = weeklyData.length > 0 ? Math.round(weeklyTotal / weeklyData.length) : 0;

  return {
    todayTotal: today?.total ?? 0,
    todaySteps,
    todayStepsCalories: today?.stepsCalories ?? 0,
    todayWorkoutCalories: today?.workoutCalories ?? 0,
    weeklyData,
    weeklyTotal,
    weeklyAvg,
    loading,
    error,
    profile,
    saveProfile,
    refresh,
  };
};
