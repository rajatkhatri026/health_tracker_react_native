import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../navigation/navigationRef';
import { auth } from '../utils/firebase';

// Backend base URL — REQUIRED to be set in .env as EXPO_PUBLIC_API_BASE_URL.
// On physical iOS/Android devices, 'localhost' points to the device itself,
// so you must use your Mac's LAN IP (e.g. http://192.168.x.x:8080).
// Web can use localhost because the browser runs on the same machine as the
// backend, but using the LAN IP works for both.
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!BASE_URL) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is not set in .env. ' +
      'Set it to your backend URL, e.g. http://192.168.1.10:8080'
  );
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // Step 1: try refresh token
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        await AsyncStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) await AsyncStorage.setItem('refresh_token', data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch {
        // refresh token expired — fall through to Firebase silent re-auth
      }
    }

    // Step 2: try Firebase silent re-auth (Firebase session persists on device indefinitely)
    try {
      const firebaseUser = auth?.currentUser ?? null;
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken(true); // force refresh
        const { data } = await axios.post(`${BASE_URL}/auth/phone`, { id_token: idToken });
        await AsyncStorage.setItem('access_token', data.access_token);
        await AsyncStorage.setItem('refresh_token', data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      }
    } catch {
      // Firebase session also gone — user must log in again
    }

    // Step 3: fully logged out — clear storage and redirect
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    navigationRef.current?.reset({ index: 0, routes: [{ name: 'Auth' }] });
    return Promise.reject(error);
  }
);

export default api;
