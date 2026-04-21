/**
 * Step Tracker — platform abstraction
 *
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

// ─── iOS ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rnHealth = () => require('react-native-health');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rnHealthConnect = () => require('react-native-health-connect');

type HealthKitError = Error | null;
interface HealthKitStepResult {
  value?: number;
}
interface HealthConnectPermission {
  granted: boolean;
}
interface HealthConnectRecord {
  count?: number;
}
interface HealthConnectRecords {
  records: HealthConnectRecord[];
}

const initHealthKit = async (): Promise<boolean> => {
  try {
    const { default: AppleHealthKit, Permissions } = rnHealth();
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(
        { permissions: { read: [Permissions.Steps], write: [] } },
        (err: HealthKitError) => resolve(!err)
      );
    });
  } catch {
    return false;
  }
};

const getStepsIOS = async (start: Date, end: Date): Promise<number> => {
  try {
    const { default: AppleHealthKit } = rnHealth();
    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(
        { startDate: start.toISOString(), endDate: end.toISOString() },
        (err: HealthKitError, result: HealthKitStepResult) =>
          resolve(err ? 0 : (result?.value ?? 0))
      );
    });
  } catch {
    return 0;
  }
};

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

export const initStepTracker = async (): Promise<boolean> => {
  if (_initialized) return true;
  if (Platform.OS === 'ios') _initialized = await initHealthKit();
  else if (Platform.OS === 'android') _initialized = await initHealthConnect();
  else _initialized = false; // web — not supported
  return _initialized;
};

export const getTodaySteps = async (): Promise<number | null> => {
  if (Platform.OS === 'web') return null;
  const ok = await initStepTracker();
  if (!ok) return null;
  const now = new Date();
  if (Platform.OS === 'ios') return getStepsIOS(startOfDay(now), endOfDay(now));
  if (Platform.OS === 'android') return getStepsAndroid(startOfDay(now), endOfDay(now));
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
    if (Platform.OS === 'ios') steps = await getStepsIOS(start, end);
    else if (Platform.OS === 'android') steps = await getStepsAndroid(start, end);
    days.push({ date: localDateStr(d), steps });
  }
  return days;
};

export const isStepTrackingSupported = (): boolean => Platform.OS !== 'web';
