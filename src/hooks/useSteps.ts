import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getSteps, syncSteps, syncStepsBulk, type DailyStepsRecord } from '../api/steps';
import {
  getTodaySteps,
  getWeeklySteps,
  initStepTracker,
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
  supported: boolean; // false on web
  permissionGranted: boolean;
  refresh: () => Promise<void>;
  setGoal: (steps: number) => void;
}

const DEFAULT_GOAL = 10000;

export const useSteps = (): UseStepsResult => {
  const { user } = useAuth();
  const userId = user?.user_id;

  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklySteps, setWeeklySteps] = useState<DailyStepsRecord[]>([]);
  const [goalSteps, setGoalSteps] = useState(DEFAULT_GOAL);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const supported = isStepTrackingSupported();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const syncFromDevice = useCallback(async () => {
    if (!supported || !userId) return;

    // Init + request permissions
    const ok = await initStepTracker();
    setPermissionGranted(ok);
    if (!ok) return;

    // Sync weekly steps to backend in one bulk call
    const weekly = await getWeeklySteps();
    if (weekly.length > 0) {
      await syncStepsBulk(userId, weekly).catch(() => {});
    }

    // Get today's live count
    const today = await getTodaySteps();
    if (today !== null) {
      setTodaySteps(today);
      await syncSteps(userId, localDateStr(), today).catch(() => {});
    }
  }, [userId, supported]);

  const fetchFromBackend = useCallback(async () => {
    if (!userId) return;
    const records = await getSteps(userId, 7);
    setWeeklySteps(records);
    const todayRecord = records.find((r) => r.date === localDateStr());
    if (todayRecord) setTodaySteps(todayRecord.steps);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await syncFromDevice();
      await fetchFromBackend();
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
    supported,
    permissionGranted,
    refresh,
    setGoal: setGoalSteps,
  };
};
