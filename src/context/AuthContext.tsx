import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '../utils/firebase';
import type { User } from '../types';
import { phoneAuth, getMe } from '../api/auth';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingDone: boolean;
  completeOnboarding: () => Promise<void>;
  sendOtp: (phone: string, recaptchaContainer: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const loadUser = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
      const done = await AsyncStorage.getItem(`onboarding_complete_${me.user_id}`);
      setOnboardingDone(!!done);
    } catch {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const recaptchaRef = React.useRef<InstanceType<typeof RecaptchaVerifier> | null>(null);

  const sendOtp = async (phone: string, recaptchaContainerId: string) => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {}, // auto-resolve — no user interaction needed
        'expired-callback': () => {
          // silently reset on expiry
          try {
            recaptchaRef.current?.clear();
          } catch {}
          recaptchaRef.current = null;
        },
      });
      await recaptchaRef.current.render(); // pre-render so it's ready instantly
    }
    try {
      const result = await signInWithPhoneNumber(auth, phone, recaptchaRef.current);
      setConfirmationResult(result);
    } catch (e) {
      try {
        recaptchaRef.current?.clear();
      } catch {}
      recaptchaRef.current = null;
      throw e;
    }
  };

  const verifyOtp = async (otp: string): Promise<{ isNewUser: boolean }> => {
    if (!confirmationResult) throw new Error('No OTP sent');
    const credential = await confirmationResult.confirm(otp);
    const idToken = await credential.user.getIdToken();
    const tokens = await phoneAuth(idToken);
    await AsyncStorage.setItem('access_token', tokens.access_token);
    await AsyncStorage.setItem('refresh_token', tokens.refresh_token);
    const me = await getMe();
    setUser(me);
    const done = await AsyncStorage.getItem(`onboarding_complete_${me.user_id}`);
    setOnboardingDone(!!done);
    return { isNewUser: tokens.is_new_user };
  };

  const refreshUser = async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {}
  };

  const completeOnboarding = async () => {
    if (user) {
      await AsyncStorage.setItem(`onboarding_complete_${user.user_id}`, 'true');
      setOnboardingDone(true);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setUser(null);
    setOnboardingDone(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        onboardingDone,
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
