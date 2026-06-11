import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { setPremiumStatus } from './usePremium';

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

  const refresh = useCallback(async (): Promise<SubscriptionStatus> => {
    if (!user) return DEFAULT;
    try {
      const { data } = await api.get<SubscriptionStatus>(`/users/${user.user_id}/subscription`);
      const updated = { ...data, isActive: data.status === 'active' };
      setSub(updated);
      // Keep usePremium in sync with server truth
      await setPremiumStatus(updated.isPaid);
      return updated;
    } catch {
      // Network error — don't wipe premium status, keep whatever is cached
      setLoading(false);
      return DEFAULT;
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
      await setPremiumStatus(true);
      return updated;
    },
    [user]
  );

  const cancel = useCallback(async (): Promise<void> => {
    await api.post(`/users/${user!.user_id}/subscription/cancel`);
    await setPremiumStatus(false);
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
