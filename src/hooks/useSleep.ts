import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getSleepSchedules,
  toggleSleepSchedule,
  seedDefaultSleepSchedules,
  getSleepEntries,
  addSleepEntry,
  type SleepSchedule,
  type SleepEntry,
} from '../api/local';

interface UseSleepResult {
  schedules: SleepSchedule[];
  entries: SleepEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
  logSleep: (payload: Omit<SleepEntry, 'id'>) => Promise<void>;
  lastNight: SleepEntry | null;
  weeklyHours: number[]; // last 7 days oldest→newest
}

export const useSleep = (): UseSleepResult => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<SleepSchedule[]>([]);
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await seedDefaultSleepSchedules(user.user_id);
    const [s, e] = await Promise.all([
      getSleepSchedules(user.user_id),
      getSleepEntries(user.user_id),
    ]);
    setSchedules(s);
    setEntries(e);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const toggle = useCallback(
    async (id: string) => {
      if (!user) return;
      await toggleSleepSchedule(user.user_id, id);
      const updated = await getSleepSchedules(user.user_id);
      setSchedules(updated);
    },
    [user]
  );

  const logSleep = useCallback(
    async (payload: Omit<SleepEntry, 'id'>) => {
      if (!user) return;
      await addSleepEntry(user.user_id, payload);
      await fetch();
    },
    [user, fetch]
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

  return { schedules, entries, loading, refresh: fetch, toggle, logSleep, lastNight, weeklyHours };
};
