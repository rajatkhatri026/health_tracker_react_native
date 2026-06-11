import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export const PREMIUM_KEY = '@nexara_is_premium';

export async function getPremiumStatus(): Promise<boolean> {
  const v = await AsyncStorage.getItem(PREMIUM_KEY);
  return v === 'true';
}

export async function setPremiumStatus(value: boolean): Promise<void> {
  await AsyncStorage.setItem(PREMIUM_KEY, value ? 'true' : 'false');
}

export async function resetPremiumStatus(): Promise<void> {
  await AsyncStorage.removeItem(PREMIUM_KEY);
}

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const v = await getPremiumStatus();
    setIsPremium(v);
    setLoading(false);
  }, []);

  // Read on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-read every time the screen comes into focus (e.g. returning from Paywall)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { isPremium, loading, refresh };
}
