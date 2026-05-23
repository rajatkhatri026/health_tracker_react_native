import api from './axios';
import * as SecureStore from 'expo-secure-store';

export type WaterRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  intakeMl: number;
  goalMl: number;
};

// Decode userId from the stored JWT without a library — just base64 the payload
async function userId(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export async function fetchWaterRecords(from: string, to: string): Promise<WaterRecord[]> {
  const uid = await userId();
  if (!uid) return [];
  const { data } = await api.get(`/users/${uid}/water`, { params: { from, to } });
  return data;
}

export async function fetchTodayWater(): Promise<WaterRecord | null> {
  const today = todayKey();
  const records = await fetchWaterRecords(today, today);
  return records[0] ?? null;
}

export async function upsertWaterRecord(
  date: string,
  intakeMl: number,
  goalMl: number
): Promise<WaterRecord> {
  const uid = await userId();
  if (!uid) throw new Error('Not logged in');
  const { data } = await api.put(`/users/${uid}/water/${date}`, { intakeMl, goalMl });
  return data;
}

export function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
