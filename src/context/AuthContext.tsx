import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { signInWithPhoneNumber, type ConfirmationResult, type ApplicationVerifier } from 'firebase/auth';
import { auth } from '../utils/firebase';

// Minimal verifier for native — when appVerificationDisabledForTesting=true
// Firebase bypasses real reCAPTCHA but still calls verify(). Return empty
// string so Firebase uses the test token from its internal test mode.
const nativeVerifier = {
  type: 'recaptcha',
  verify: () => Promise.resolve(''),
  _reset: () => {},
} as unknown as ApplicationVerifier;
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

  const recaptchaRef = React.useRef<unknown>(null);

  const sendOtp = async (phone: string, recaptchaContainerId: string) => {
    let verifier: unknown = recaptchaRef.current;

    if (Platform.OS === 'web') {
      // Web — use reCAPTCHA verifier (loaded lazily to avoid crashing on native)
      if (!verifier) {
        const { RecaptchaVerifier } = await import('firebase/auth');
        const rv = new RecaptchaVerifier(auth, recaptchaContainerId, {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            try { (recaptchaRef.current as { clear: () => void })?.clear(); } catch {}
            recaptchaRef.current = null;
          },
        });
        await rv.render();
        recaptchaRef.current = rv;
        verifier = rv;
      }
    }
    // On native: use dummy verifier — appVerificationDisabledForTesting bypasses real reCAPTCHA
    if (Platform.OS !== 'web') {
      verifier = nativeVerifier;
    }

    try {
      const result = await signInWithPhoneNumber(auth, phone, verifier as ApplicationVerifier);
      setConfirmationResult(result);
    } catch (e) {
      if (Platform.OS === 'web') {
        try { (recaptchaRef.current as { clear: () => void })?.clear(); } catch {}
        recaptchaRef.current = null;
      }
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
