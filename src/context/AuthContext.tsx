import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ConfirmationResult, ApplicationVerifier } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { signInWithPhoneNumber } from 'firebase/auth';
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

  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

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
    if (!auth) throw new Error('Firebase auth not initialized');

    if (Platform.OS === 'web') {
      // Web needs a RecaptchaVerifier
      let verifier = recaptchaRef.current as ApplicationVerifier | null;
      if (!verifier) {
        const { RecaptchaVerifier } = await import('firebase/auth');
        const rv = new RecaptchaVerifier(auth, recaptchaContainerId, {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            try {
              (recaptchaRef.current as { clear: () => void })?.clear();
            } catch {}
            recaptchaRef.current = null;
          },
        });
        await rv.render();
        recaptchaRef.current = rv;
        verifier = rv;
      }
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmation(result);
    } else {
      // Native: provide a dummy verifier — Firebase JS SDK requires the
      // argument to be present but with appVerificationDisabledForTesting=true
      // it won't actually invoke it for whitelisted test numbers.
      const dummyVerifier = {
        type: 'recaptcha',
        verify: () => Promise.resolve('test-token'),
        _reset: () => {},
      } as unknown as ApplicationVerifier;
      const result = await signInWithPhoneNumber(auth, phone, dummyVerifier);
      setConfirmation(result);
    }
  };

  const verifyOtp = async (otp: string): Promise<{ isNewUser: boolean }> => {
    let idToken: string;

    if (!confirmation) throw new Error('No OTP sent');
    const credential = await confirmation.confirm(otp);
    idToken = await credential.user.getIdToken();

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
