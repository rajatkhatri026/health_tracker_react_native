import { Platform } from 'react-native';

// ─── Web ─────────────────────────────────────────────────────────────────────
// Use Firebase web SDK on web (full browser support for reCAPTCHA).
// All values are read from .env (EXPO_PUBLIC_FIREBASE_*) so switching
// projects / environments requires no code changes.
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID as string,
};

if (Platform.OS === 'web') {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.warn('[firebase] Missing env vars for web Firebase config:', missing.join(', '));
  }
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use initializeAuth with AsyncStorage persistence on native,
// getAuth on web (AsyncStorage is not available there).
function getFirebaseAuth() {
  try {
    return Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
  } catch {
    // Already initialized (e.g. hot reload)
    return getAuth(app);
  }
}

export const auth = getFirebaseAuth();

// Disable app verification in dev so Firebase skips APNs / reCAPTCHA
// for test phone numbers on both web and native.
if (__DEV__) {
  auth.settings.appVerificationDisabledForTesting = true;
}
