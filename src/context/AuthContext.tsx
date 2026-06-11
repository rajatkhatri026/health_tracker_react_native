import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { User } from '../types';
import { otpSend, otpVerify, getMe, socialAuth } from '../api/auth';
import { registerPushToken } from '../utils/registerPushToken';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  scopes: ['profile', 'email'],
});

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
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
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
      // Cache user profile so we can restore it offline next launch
      await AsyncStorage.setItem('cached_user', JSON.stringify(me));
      setAuthState({ user: me, onboardingDone: !!done, isNewUser: false });
      registerPushToken(me.user_id);
    } catch {
      // Network/server error — restore from cache instead of logging out
      const cached = await AsyncStorage.getItem('cached_user');
      if (cached) {
        try {
          const me = JSON.parse(cached);
          const done = await AsyncStorage.getItem(`onboarding_complete_${me.user_id}`);
          setAuthState({ user: me, onboardingDone: !!done, isNewUser: false });
        } catch {
          await delTokens();
        }
      } else {
        // No cache and network failed — only now force re-login
        await delTokens();
      }
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

  const finishSocialLogin = async (
    idToken: string,
    provider: 'google' | 'apple',
    appleDisplayName?: string
  ) => {
    const tokens = await socialAuth(idToken, provider, appleDisplayName);
    await setToken('access_token', tokens.access_token);
    await setToken('refresh_token', tokens.refresh_token);
    const me = await getMe();
    await AsyncStorage.setItem('cached_user', JSON.stringify(me));
    const done = await AsyncStorage.getItem(`onboarding_complete_${me.user_id}`);
    setAuthState({ user: me, onboardingDone: !!done, isNewUser: tokens.is_new_user });
    registerPushToken(me.user_id);
  };

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        const err: any = new Error('SIGN_IN_CANCELLED');
        err.code = 'SIGN_IN_CANCELLED';
        throw err;
      }

      let idToken = response.data?.idToken ?? null;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken ?? null;
      }
      if (!idToken) throw new Error('Google sign-in failed — no id token');

      await finishSocialLogin(idToken, 'google');
    } catch (e: any) {
      if (__DEV__) {
        console.error(
          '[GoogleSignIn] backend error:',
          e?.response?.status,
          JSON.stringify(e?.response?.data),
          e?.message
        );
      }
      const code = e?.code;
      const isCancel =
        code === statusCodes.SIGN_IN_CANCELLED ||
        code === 'SIGN_IN_CANCELLED' ||
        code === '-5' ||
        e?.message === 'SIGN_IN_CANCELLED';
      if (isCancel) {
        const err: any = new Error('SIGN_IN_CANCELLED');
        err.code = 'SIGN_IN_CANCELLED';
        throw err;
      }
      throw e;
    }
  };

  const signInWithApple = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const { identityToken, fullName } = credential;
    if (!identityToken) throw new Error('Apple sign-in failed — no identity token');
    const displayName = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ');
    await finishSocialLogin(identityToken, 'apple', displayName);
  };

  const logout = async () => {
    try {
      await delTokens();
      await AsyncStorage.removeItem('cached_user');
    } catch {
      // Storage failure — still clear in-memory state so user is logged out
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
        signInWithGoogle,
        signInWithApple,
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
