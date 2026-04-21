import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getWorkouts,
  createWorkout,
  createWorkoutsBulk,
  updateWorkout,
  completeWorkout,
  deleteWorkout,
  deleteWorkoutsBulk,
  getWorkoutStats,
  type Workout,
  type CreateWorkoutPayload,
  type CompleteWorkoutPayload,
  type WorkoutStats,
} from '../api/workouts';
import { syncWorkoutReminders, cancelWorkoutReminder } from '../utils/notifications';

interface UseWorkoutsResult {
  workouts: Workout[];
  history: Workout[];
  upcoming: Workout[];
  completedToday: Workout[];
  stats: WorkoutStats | null;
  loading: boolean;
  statsLoading: boolean;
  refresh: () => Promise<void>;
  add: (payloads: CreateWorkoutPayload[]) => Promise<Workout[]>;
  update: (workoutId: string, payload: CreateWorkoutPayload) => Promise<void>;
  complete: (workoutId: string, payload: CompleteWorkoutPayload) => Promise<void>;
  remove: (workoutId: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
}

export const useWorkouts = (): UseWorkoutsResult => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getWorkouts(user.user_id);
      setWorkouts(data);
      syncWorkoutReminders(data).catch(() => {}); // non-critical
    } catch {
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const s = await getWorkoutStats(user.user_id);
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
    fetchStats();
  }, [fetch, fetchStats]);

  const refresh = useCallback(async () => {
    await Promise.all([fetch(), fetchStats()]);
  }, [fetch, fetchStats]);

  const add = useCallback(
    async (payloads: CreateWorkoutPayload[]): Promise<Workout[]> => {
      if (!user) throw new Error('Not authenticated');
      const workouts =
        payloads.length === 1
          ? [await createWorkout(user.user_id, payloads[0])]
          : await createWorkoutsBulk(user.user_id, payloads);
      await refresh();
      return workouts;
    },
    [user, refresh]
  );

  const update = useCallback(
    async (workoutId: string, payload: CreateWorkoutPayload) => {
      if (!user) throw new Error('Not authenticated');
      await updateWorkout(user.user_id, workoutId, payload);
      await refresh();
    },
    [user, refresh]
  );

  const complete = useCallback(
    async (workoutId: string, payload: CompleteWorkoutPayload) => {
      if (!user) return;
      try {
        await cancelWorkoutReminder(workoutId);
      } catch {
        /* non-critical */
      }
      await completeWorkout(user.user_id, workoutId, payload);
      await refresh();
    },
    [user, refresh]
  );

  const remove = useCallback(
    async (workoutId: string) => {
      if (!user) return;
      try {
        await cancelWorkoutReminder(workoutId);
      } catch {
        /* non-critical */
      }
      await deleteWorkout(user.user_id, workoutId);
      await refresh();
    },
    [user, refresh]
  );

  const removeMany = useCallback(
    async (ids: string[]) => {
      if (!user || ids.length === 0) return;
      await Promise.allSettled(ids.map((id) => cancelWorkoutReminder(id)));
      await deleteWorkoutsBulk(user.user_id, ids);
      await refresh();
    },
    [user, refresh]
  );

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const upcoming = workouts
    .filter((w) => w.status === 'scheduled' && new Date(w.scheduledAt) >= todayStart)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const history = workouts
    .filter((w) => w.status === 'completed')
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  const completedToday = workouts.filter((w) => {
    if (w.status !== 'completed' || !w.completedAt) return false;
    const t = new Date(w.completedAt).getTime();
    return t >= todayStart.getTime() && t <= todayEnd.getTime();
  });

  return {
    workouts,
    history,
    upcoming,
    completedToday,
    stats,
    loading,
    statsLoading,
    refresh,
    add,
    update,
    complete,
    remove,
    removeMany,
  };
};
