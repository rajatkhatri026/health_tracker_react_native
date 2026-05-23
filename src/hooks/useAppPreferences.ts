import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptLocal } from '../utils/localCrypto';

const PREFS_KEY = 'nexara_app_preferences';
const WATER_GOAL_KEY = 'water_goal_pref'; // shared with WaterIntakeScreen
const STEP_GOAL_KEY = 'nexara_step_goal'; // shared with useSteps

export interface AppPreferences {
  weightUnit: 'kg' | 'lbs';
  heightUnit: 'cm' | 'ft';
  waterUnit: 'ml' | 'fl oz';
  dailyStepGoal: number;
  dailyWaterGoal: number; // ml
}

const DEFAULTS: AppPreferences = {
  weightUnit: 'kg',
  heightUnit: 'cm',
  waterUnit: 'ml',
  dailyStepGoal: 10000,
  dailyWaterGoal: 2500,
};

export function useAppPreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const savePrefs = useCallback(async (updated: AppPreferences): Promise<void> => {
    setPrefs(updated); // optimistic update
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
      // Sync water goal so WaterIntakeScreen picks it up immediately
      await AsyncStorage.setItem(
        WATER_GOAL_KEY,
        await encryptLocal(String(updated.dailyWaterGoal))
      );
      // Sync step goal so useSteps picks it up immediately
      await AsyncStorage.setItem(STEP_GOAL_KEY, String(updated.dailyStepGoal));
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to save preferences');
    }
  }, []);

  return { prefs, savePrefs, loading };
}
