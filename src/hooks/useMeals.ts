import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMeals, addMeal, deleteMeal, seedDefaultMeals, type MealEntry } from '../api/local';
import { localDateString } from '../utils/format';

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UseMealsResult {
  meals: MealEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (payload: Omit<MealEntry, 'id' | 'loggedAt'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  totals: MacroTotals;
  byCategory: (cat: MealEntry['category'] | 'all') => MealEntry[];
  weeklyCalories: number[]; // last 7 days
}

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const useMeals = (): UseMealsResult => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [allMeals, setAllMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await seedDefaultMeals(user.user_id);
      const todayData = await getMeals(user.user_id, today());
      const allData = await getMeals(user.user_id);
      setMeals(todayData);
      setAllMeals(allData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = useCallback(
    async (payload: Omit<MealEntry, 'id' | 'loggedAt'>): Promise<void> => {
      if (!user) return;
      try {
        const entry = await addMeal(user.user_id, payload);
        // Optimistic — prepend to state without full re-fetch
        setMeals((prev) => [entry, ...prev]);
        setAllMeals((prev) => [entry, ...prev]);
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to add meal');
      }
    },
    [user]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;
      // Optimistic — remove from state immediately, no scroll reset
      setMeals((prev) => prev.filter((m) => m.id !== id));
      setAllMeals((prev) => prev.filter((m) => m.id !== id));
      try {
        await deleteMeal(user.user_id, id);
      } catch (e) {
        // Rollback on failure
        await fetch();
        throw e instanceof Error ? e : new Error('Failed to delete meal');
      }
    },
    [user, fetch]
  );

  const totals: MacroTotals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const byCategory = useCallback(
    (cat: MealEntry['category'] | 'all') =>
      cat === 'all' ? meals : meals.filter((m) => m.category === cat),
    [meals]
  );

  // Real 7-day calorie history — Sun=0 … Sat=6 matching DAYS_SHORT in screen
  const weeklyCalories: number[] = (() => {
    const buckets = Array(7).fill(0);
    for (const m of allMeals) {
      const dateStr = m.loggedAt.slice(0, 10); // YYYY-MM-DD
      const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST edge
      const dayOfWeek = d.getDay(); // 0=Sun … 6=Sat
      buckets[dayOfWeek] += m.calories;
    }
    return buckets;
  })();

  return { meals, loading, error, refresh: fetch, add, remove, totals, byCategory, weeklyCalories };
};
