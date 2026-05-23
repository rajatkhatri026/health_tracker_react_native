import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getSteps, syncSteps, syncStepsBulk, type DailyStepsRecord } from '../api/steps';
import {
  getTodaySteps,
  getWeeklySteps,
  initStepTracker,
  resetStepTracker,
  isStepTrackingSupported,
} from '../utils/stepTracker';

const localDateStr = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

interface UseStepsResult {
  todaySteps: number;
  weeklySteps: DailyStepsRecord[]; // 7 days, index 0 = 6 days ago
  goalSteps: number;
  progress: number; // 0–1
  loading: boolean;
  error: string | null;
  supported: boolean; // false on web
  permissionGranted: boolean;
  refresh: () => Promise<void>;
  setGoal: (steps: number) => void;
}

const DEFAULT_GOAL = 10000;
const STEP_GOAL_KEY = 'nexara_step_goal';

export const useSteps = (): UseStepsResult => {
  const { user } = useAuth();
  const userId = user?.user_id;

  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklySteps, setWeeklySteps] = useState<DailyStepsRecord[]>([]);
  const [goalSteps, setGoalSteps] = useState(DEFAULT_GOAL);

  // Load persisted goal from AsyncStorage (set by useAppPreferences)
  useEffect(() => {
    AsyncStorage.getItem(STEP_GOAL_KEY)
      .then((v) => {
        if (v) setGoalSteps(parseInt(v, 10));
      })
      .catch(() => {});
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const supported = isStepTrackingSupported();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const syncFromDevice = useCallback(async () => {
    if (!supported || !userId) return;

    // Reset so initStepTracker re-requests permissions if previously denied
    resetStepTracker();
    const ok = await initStepTracker();
    setPermissionGranted(ok);
    if (!ok) return;

    // Sync the past 6 days to backend (exclude today — handled separately below
    // so weekly bulk-sync can't overwrite today with stale accumulated data).
    const weekly = await getWeeklySteps();
    const todayStr = localDateStr();
    const pastDays = weekly.filter((r) => r.date !== todayStr);
    if (pastDays.length > 0) {
      await syncStepsBulk(userId, pastDays).catch(() => {});
    }

    // Get today's live count and sync separately
    const today = await getTodaySteps();
    if (today !== null) {
      setTodaySteps(today);
      await syncSteps(userId, todayStr, today).catch(() => {});
    }
  }, [userId, supported]);

  const fetchFromBackend = useCallback(async () => {
    if (!userId) return;
    const records = await getSteps(userId, 7);
    setWeeklySteps(records);
    // Always set today's steps from the backend record for today's date.
    // If no record exists yet (genuinely 0 steps day), set to 0 explicitly —
    // never leave a stale previous-day value in state.
    const todayRecord = records.find((r) => r.date === localDateStr());
    setTodaySteps(todayRecord?.steps ?? 0);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const stored = await AsyncStorage.getItem(STEP_GOAL_KEY).catch(() => null);
      if (stored) setGoalSteps(parseInt(stored, 10));
      await syncFromDevice();
      await fetchFromBackend();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load steps');
    } finally {
      setLoading(false);
    }
  }, [userId, syncFromDevice, fetchFromBackend]);

  // Initial load — intentionally omitting `refresh` from deps to avoid loop;
  // refresh is memoized on userId so re-running when userId changes is sufficient.

  useEffect(() => {
    refresh();
  }, [userId]);

  // Re-sync when app comes to foreground (steps accumulate while app is closed)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev !== 'active' && next === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const progress = goalSteps > 0 ? Math.min(todaySteps / goalSteps, 1) : 0;

  return {
    todaySteps,
    weeklySteps,
    goalSteps,
    progress,
    loading,
    error,
    supported,
    permissionGranted,
    refresh,
    setGoal: (steps: number) => {
      setGoalSteps(steps);
      AsyncStorage.setItem(STEP_GOAL_KEY, String(steps)).catch(() => {});
    },
  };
};
