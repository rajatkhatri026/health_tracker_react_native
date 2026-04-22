import { Platform } from 'react-native';

// ─── Web ─────────────────────────────────────────────────────────────────────
// Use Firebase web SDK on web (full browser support for reCAPTCHA)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAyhdTv8bJ5shY8WsA5dyHhmcyt_eRMJwk',
  authDomain: 'health-tracker-20c17.firebaseapp.com',
  projectId: 'health-tracker-20c17',
  storageBucket: 'health-tracker-20c17.firebasestorage.app',
  messagingSenderId: '1010701607223',
  appId: '1:1010701607223:web:7512fe4f1f03d756d93ab2',
};

const webApp = Platform.OS === 'web'
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

export const auth = Platform.OS === 'web' ? getAuth(webApp!) : null;

if (Platform.OS === 'web' && __DEV__ && auth) {
  auth.settings.appVerificationDisabledForTesting = true;
}
