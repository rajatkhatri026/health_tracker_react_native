import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMeals, addMeal, deleteMeal, seedDefaultMeals, type MealEntry } from '../api/local';

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UseMealsResult {
  meals: MealEntry[];
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await seedDefaultMeals(user.user_id);
    const data = await getMeals(user.user_id, today());
    setMeals(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = useCallback(
    async (payload: Omit<MealEntry, 'id' | 'loggedAt'>) => {
      if (!user) return;
      await addMeal(user.user_id, payload);
      await fetch();
    },
    [user, fetch]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      await deleteMeal(user.user_id, id);
      await fetch();
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

  // placeholder weekly — returns today's totals for the current day bucket, 0 for past
  const weeklyCalories: number[] = Array(7)
    .fill(0)
    .map((_, i) => (i === 6 ? totals.calories : 0));

  return { meals, loading, refresh: fetch, add, remove, totals, byCategory, weeklyCalories };
};
