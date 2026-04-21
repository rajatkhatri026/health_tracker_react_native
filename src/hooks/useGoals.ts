import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGoals, createGoal, updateGoal } from '../api/goals';
import type { Goal, CreateGoalPayload, MetricType } from '../types';

interface UseGoalsResult {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  activeGoals: Goal[];
  goalFor: (type: MetricType) => Goal | undefined;
  progressFor: (type: MetricType, currentValue: number) => number; // 0–1
  addGoal: (payload: CreateGoalPayload) => Promise<void>;
  markProgress: (goalId: string, value: number) => Promise<void>;
}

export const useGoals = (): UseGoalsResult => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGoals(user.user_id);
      setGoals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const activeGoals = goals.filter((g) => g.status === 'active');

  const goalFor = useCallback(
    (type: MetricType) => activeGoals.find((g) => g.metric_type === type),
    [activeGoals]
  );

  const progressFor = useCallback(
    (type: MetricType, currentValue: number): number => {
      const goal = goalFor(type);
      if (!goal || goal.target_value === 0) return 0;
      return Math.min(currentValue / goal.target_value, 1);
    },
    [goalFor]
  );

  const addGoal = useCallback(
    async (payload: CreateGoalPayload) => {
      if (!user) return;
      await createGoal(user.user_id, payload);
      await fetch();
    },
    [user, fetch]
  );

  const markProgress = useCallback(
    async (goalId: string, value: number) => {
      if (!user) return;
      await updateGoal(user.user_id, goalId, { target_value: value });
      await fetch();
    },
    [user, fetch]
  );

  return {
    goals,
    loading,
    error,
    refresh: fetch,
    activeGoals,
    goalFor,
    progressFor,
    addGoal,
    markProgress,
  };
};
