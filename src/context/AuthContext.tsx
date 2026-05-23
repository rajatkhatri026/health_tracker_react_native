import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';
import { otpSend, otpVerify, getMe } from '../api/auth';
import { registerPushToken } from '../utils/registerPushToken';

const setToken = (k: string, v: string) => SecureStore.setItemAsync(k, v);
const getToken = (k: string) => SecureStore.getItemAsync(k);
const delTokens = () =>
  Promise.all([
    SecureStore.deleteItemAsync('access_token'),
    SecureStore.deleteItemAsync('refresh_token'),
  ]);

interface AuthState {
  user: User | null;
  onboardingDone: boolean;
  isNewUser: boolean;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingDone: boolean;
  isNewUser: boolean;
  completeOnboarding: () => Promise<void>;
  sendOtp: (phone: string) => Promise<{ devOtp?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    onboardingDone: false,
    isNewUser: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = await getToken('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await getMe();
      const done = await AsyncStorage.getItem(`onboarding_complete_${me.user_id}`);
      setAuthState({ user: me, onboardingDone: !!done, isNewUser: false });
      registerPushToken(me.user_id); // refresh token on every app launch
    } catch {
      await delTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const sendOtp = async (phone: string): Promise<{ devOtp?: string }> => {
    const res = await otpSend(phone);
    return { devOtp: res.dev_otp };
  };

  const verifyOtp = async (phone: string, otp: string): Promise<{ isNewUser: boolean }> => {
    const tokens = await otpVerify(phone, otp);
    await setToken('access_token', tokens.access_token);
    await setToken('refresh_token', tokens.refresh_token);
    const me = await getMe();
    const done = await AsyncStorage.getItem(`onboarding_complete_${me.user_id}`);
    // Single setState so navigator never sees an intermediate state where
    // isAuthenticated=true but onboardingDone=false for an existing user.
    setAuthState({ user: me, onboardingDone: !!done, isNewUser: tokens.is_new_user });
    registerPushToken(me.user_id); // fire-and-forget — never blocks login
    return { isNewUser: tokens.is_new_user };
  };

  const refreshUser = async () => {
    try {
      const me = await getMe();
      setAuthState((prev) => ({ ...prev, user: me }));
    } catch {
      // Network error — keep existing user in state, don't disrupt UI
    }
  };

  const completeOnboarding = async () => {
    if (!authState.user) return;
    try {
      await AsyncStorage.setItem(`onboarding_complete_${authState.user.user_id}`, 'true');
    } catch {
      // Storage failure — still update in-memory state so user can proceed
    }
    setAuthState((prev) => ({ ...prev, onboardingDone: true }));
  };

  const logout = async () => {
    try {
      await delTokens();
    } catch {
      // SecureStore failure — still clear in-memory state so user is logged out
    }
    setAuthState({ user: null, onboardingDone: false, isNewUser: false });
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        isAuthenticated: !!authState.user,
        isLoading,
        onboardingDone: authState.onboardingDone,
        isNewUser: authState.isNewUser,
        completeOnboarding,
        sendOtp,
        verifyOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
