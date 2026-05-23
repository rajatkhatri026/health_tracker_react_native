import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export interface SubscriptionStatus {
  status: 'none' | 'active' | 'expired' | 'cancelled';
  plan: 'monthly' | 'yearly' | null;
  expiresAt: string | null;
  startedAt: string | null;
  daysLeft: number;
  daysUsed: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckinAt: string | null;
  planWeekOffset: number;
  isPaid: boolean; // active paid subscription
  isActive: boolean; // any active subscription
}

const DEFAULT: SubscriptionStatus = {
  status: 'none',
  plan: null,
  expiresAt: null,
  startedAt: null,
  daysLeft: 0,
  daysUsed: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastCheckinAt: null,
  planWeekOffset: 0,
  isPaid: false,
  isActive: false,
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionStatus>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<SubscriptionStatus>(`/users/${user.user_id}/subscription`);
      setSub({ ...data, isActive: data.status === 'active' });
    } catch {
      setSub(DEFAULT);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(
    async (plan: 'monthly' | 'yearly'): Promise<SubscriptionStatus> => {
      const { data } = await api.post<SubscriptionStatus>(
        `/users/${user!.user_id}/subscription/start`,
        { plan }
      );
      const updated = { ...data, isActive: true };
      setSub(updated);
      return updated;
    },
    [user]
  );

  const cancel = useCallback(async (): Promise<void> => {
    await api.post(`/users/${user!.user_id}/subscription/cancel`);
    await refresh();
  }, [user, refresh]);

  const checkin = useCallback(
    async (payload: { weightKg?: number; mealAdherence: number; notes?: string }) => {
      const { data } = await api.post(`/users/${user!.user_id}/subscription/checkin`, payload);
      await refresh();
      return data as {
        message: string;
        rotationMsg: string;
        currentStreak: number;
        planWeekOffset: number;
      };
    },
    [user, refresh]
  );

  return { sub, loading, refresh, subscribe, cancel, checkin };
};
