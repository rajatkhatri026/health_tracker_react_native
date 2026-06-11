import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const cacheKey = user ? `goals_cache_${user.user_id}` : null;

  const fetch = useCallback(async () => {
    if (!user) return;
    setError(null);
    // Show cached instantly
    if (cacheKey) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setGoals(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
    }
    // Refresh from API in background
    try {
      const data = await getGoals(user.user_id);
      setGoals(data);
      if (cacheKey) AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [user, cacheKey]);

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
    async (payload: CreateGoalPayload): Promise<void> => {
      if (!user) return;
      try {
        await createGoal(user.user_id, payload);
        await fetch();
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to create goal');
      }
    },
    [user, fetch]
  );

  const markProgress = useCallback(
    async (goalId: string, value: number): Promise<void> => {
      if (!user) return;
      try {
        await updateGoal(user.user_id, goalId, { target_value: value });
        await fetch();
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to update goal');
      }
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
