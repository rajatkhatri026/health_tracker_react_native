import type { MetricType } from '../types';

/**
 * Converts a local Date to an ISO-8601 string that preserves local time.
 * Use this instead of date.toISOString() when sending to the backend,
 * so the time the user selected is exactly what gets stored.
 */
// Send to backend: convert local date to UTC ISO string
export const toUTCISOString = (date: Date): string => date.toISOString();

/**
 * Returns today's date as YYYY-MM-DD in local time.
 * Use this instead of new Date().toISOString().slice(0,10).
 */
export const localDateString = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Formats an ISO date string for display using local time.
 */
export const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${t}`;
  if (isTomorrow) return `Tomorrow, ${t}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${t}`;
};

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const metricLabel: Record<MetricType, string> = {
  weight: 'Weight',
  blood_pressure: 'Blood Pressure',
  glucose: 'Glucose',
  steps: 'Steps',
  sleep: 'Sleep',
  nutrition: 'Nutrition',
  activity: 'Activity',
};

export const metricUnit: Record<MetricType, string> = {
  weight: 'kg',
  blood_pressure: 'mmHg',
  glucose: 'mg/dL',
  steps: 'steps',
  sleep: 'hrs',
  nutrition: 'kcal',
  activity: 'min',
};

export const metricIcon: Record<MetricType, string> = {
  weight: '⚖️',
  blood_pressure: '🩺',
  glucose: '🩸',
  steps: '👟',
  sleep: '😴',
  nutrition: '🥗',
  activity: '🏃',
};

export const getGoalProgress = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};
