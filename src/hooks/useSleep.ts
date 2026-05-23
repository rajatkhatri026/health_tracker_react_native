import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getSleepSchedules,
  toggleSleepSchedule,
  seedDefaultSleepSchedules,
  getSleepEntries,
  addSleepEntry,
  addSleepSchedule,
  deleteSleepSchedule,
  updateSleepSchedule,
  type SleepSchedule,
  type SleepEntry,
} from '../api/local';

interface UseSleepResult {
  schedules: SleepSchedule[];
  entries: SleepEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
  logSleep: (payload: Omit<SleepEntry, 'id'>) => Promise<void>;
  addSchedule: (payload: Omit<SleepSchedule, 'id'>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  updateSchedule: (id: string, patch: Partial<Omit<SleepSchedule, 'id'>>) => Promise<void>;
  lastNight: SleepEntry | null;
  weeklyHours: number[]; // last 7 days oldest→newest
}

export const useSleep = (): UseSleepResult => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<SleepSchedule[]>([]);
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await seedDefaultSleepSchedules(user.user_id);
      const [s, e] = await Promise.all([
        getSleepSchedules(user.user_id),
        getSleepEntries(user.user_id),
      ]);
      setSchedules(s);
      setEntries(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sleep data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const toggle = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;
      try {
        await toggleSleepSchedule(user.user_id, id);
        const updated = await getSleepSchedules(user.user_id);
        setSchedules(updated);
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to toggle alarm');
      }
    },
    [user]
  );

  const logSleep = useCallback(
    async (payload: Omit<SleepEntry, 'id'>): Promise<void> => {
      if (!user) return;
      try {
        await addSleepEntry(user.user_id, payload);
        await fetch();
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to log sleep');
      }
    },
    [user, fetch]
  );

  const addSchedule = useCallback(
    async (payload: Omit<SleepSchedule, 'id'>): Promise<void> => {
      if (!user) return;
      try {
        await addSleepSchedule(user.user_id, payload);
        const updated = await getSleepSchedules(user.user_id);
        setSchedules(updated);
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to add alarm');
      }
    },
    [user]
  );

  const deleteSchedule = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;
      try {
        await deleteSleepSchedule(user.user_id, id);
        const updated = await getSleepSchedules(user.user_id);
        setSchedules(updated);
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to delete alarm');
      }
    },
    [user]
  );

  const updateSchedule = useCallback(
    async (id: string, patch: Partial<Omit<SleepSchedule, 'id'>>): Promise<void> => {
      if (!user) return;
      try {
        await updateSleepSchedule(user.user_id, id, patch);
        const updated = await getSleepSchedules(user.user_id);
        setSchedules(updated);
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to update alarm');
      }
    },
    [user]
  );

  const lastNight =
    entries.length > 0 ? entries.sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  // Last 7 days of sleep hours oldest→newest
  const weeklyHours: number[] = Array(7)
    .fill(0)
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const entry = entries.find((e) => e.date === dateStr);
      return entry ? entry.durationHrs : 0;
    });

  return {
    schedules,
    entries,
    loading,
    error,
    refresh: fetch,
    toggle,
    logSleep,
    addSchedule,
    deleteSchedule,
    updateSchedule,
    lastNight,
    weeklyHours,
  };
};
