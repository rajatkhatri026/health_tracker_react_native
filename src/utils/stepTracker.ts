/**
 * Step Tracker — platform abstraction
 *
 * Expo Go: uses expo-sensors Pedometer (today only; weekly history limited)
 * iOS  : reads HealthKit via react-native-health (requires dev build)
 * Android: reads Health Connect via react-native-health-connect (requires dev build)
 * Web  : no native pedometer — returns null (web only shows synced data)
 *
 * Usage:
 *   const steps = await getTodaySteps();   // number | null
 *   const weekly = await getWeeklySteps(); // number[] (7 items, index 0 = 6 days ago)
 */

import { Platform } from 'react-native';

export interface DailySteps {
  date: string; // YYYY-MM-DD local
  steps: number;
}

const localDateStr = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const startOfDay = (d: Date = new Date()): Date => {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
};

const endOfDay = (d: Date = new Date()): Date => {
  const s = new Date(d);
  s.setHours(23, 59, 59, 999);
  return s;
};

// ─── Expo Go (Pedometer) ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const expoPedometer = () => require('expo-sensors').Pedometer;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rnHealthConnect = () => require('react-native-health-connect');

// ─── Expo Go implementation (expo-sensors Pedometer) ─────────────────────────

const initPedometer = async (): Promise<boolean> => {
  try {
    const Pedometer = expoPedometer();
    const available = await Pedometer.isAvailableAsync();
    if (!available) return false;
    // On iOS, Pedometer requires Motion permission; on Android it uses
    // ACTIVITY_RECOGNITION. expo-sensors prompts when first queried.
    if (Platform.OS === 'ios' && Pedometer.requestPermissionsAsync) {
      const { status } = await Pedometer.requestPermissionsAsync();
      return status === 'granted';
    }
    return true;
  } catch {
    return false;
  }
};

const getStepsPedometer = async (start: Date, end: Date): Promise<number> => {
  try {
    const Pedometer = expoPedometer();
    const result = await Pedometer.getStepCountAsync(start, end);
    return result?.steps ?? 0;
  } catch {
    return 0;
  }
};

interface HealthConnectPermission {
  granted: boolean;
}
interface HealthConnectRecord {
  count?: number;
}
interface HealthConnectRecords {
  records: HealthConnectRecord[];
}

// ─── Android ─────────────────────────────────────────────────────────────────

const initHealthConnect = async (): Promise<boolean> => {
  try {
    const HC = rnHealthConnect();
    const result = await HC.initialize();
    if (!result) return false;
    const granted: HealthConnectPermission[] = await HC.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ]);
    return granted.every((g) => g.granted);
  } catch {
    return false;
  }
};

const getStepsAndroid = async (start: Date, end: Date): Promise<number> => {
  try {
    const HC = rnHealthConnect();
    const records: HealthConnectRecords = await HC.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    return records.records.reduce((sum, r) => sum + (r.count ?? 0), 0);
  } catch {
    return 0;
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

let _initialized = false;

export const resetStepTracker = (): void => {
  _initialized = false;
};

export const initStepTracker = async (): Promise<boolean> => {
  if (_initialized) return true;
  if (Platform.OS === 'web') {
    _initialized = false;
    return false;
  }
  if (Platform.OS === 'ios') {
    // Use Pedometer (expo-sensors / CoreMotion) on iOS — works without
    // a paid Apple Developer account. HealthKit requires a paid account.
    _initialized = await initPedometer();
  } else if (Platform.OS === 'android') {
    _initialized = await initHealthConnect();
  } else {
    _initialized = false;
  }
  return _initialized;
};

export const getTodaySteps = async (): Promise<number | null> => {
  if (Platform.OS === 'web') return null;
  const ok = await initStepTracker();
  if (!ok) return null;
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);
  if (Platform.OS === 'ios') return getStepsPedometer(start, end);
  if (Platform.OS === 'android') return getStepsAndroid(start, end);
  return null;
};

export const getWeeklySteps = async (): Promise<DailySteps[]> => {
  if (Platform.OS === 'web') return [];
  const ok = await initStepTracker();
  if (!ok) return [];

  const days: DailySteps[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = startOfDay(d);
    const end = endOfDay(d);
    let steps = 0;
    if (Platform.OS === 'ios') steps = await getStepsPedometer(start, end);
    else if (Platform.OS === 'android') steps = await getStepsAndroid(start, end);
    days.push({ date: localDateStr(d), steps });
  }
  return days;
};

export const isStepTrackingSupported = (): boolean => Platform.OS !== 'web';
