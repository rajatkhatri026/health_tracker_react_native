import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MORNING_BRIEF_ID = 'nexara_morning_brief';
const EVENING_SUMMARY_ID = 'nexara_evening_summary';
const WATER_REMINDER_PREFIX = 'nexara_water_';
const STORAGE_KEY = 'nexara_smart_notifs_scheduled';

// ── Schedule daily morning brief at 8:00 AM ───────────────────────────────────
export async function scheduleMorningBrief(userName: string = 'there'): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelScheduledNotificationAsync(MORNING_BRIEF_ID).catch(() => {});

  const first = firstName(userName);
  const greetings = [
    `Good morning ${first} 🌅 Your health day starts now. Tap to see your plan.`,
    `Rise and shine ${first} ☀️ Check your goals for today.`,
    `Morning ${first} 💪 Let's make today count. Your dashboard is ready.`,
    `Hey ${first} 🌄 New day, new goals. Open Nexara to get started.`,
  ];
  const body = greetings[new Date().getDay() % greetings.length];

  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_BRIEF_ID,
    content: {
      title: '🌅 Good Morning — Daily Brief',
      body,
      data: { type: 'morning_brief', navigate: 'Home' },
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

// ── Schedule evening summary at 9:00 PM ──────────────────────────────────────
export async function scheduleEveningSummary(): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelScheduledNotificationAsync(EVENING_SUMMARY_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: EVENING_SUMMARY_ID,
    content: {
      title: '📊 Your Daily Summary',
      body: 'How did today go? Log your meals, water & sleep to complete your health record.',
      data: { type: 'evening_summary', navigate: 'Home' },
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

// ── Schedule water reminders every 2 hours between 8am–10pm ──────────────────
export async function scheduleWaterReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel existing water reminders
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(WATER_REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );

  const waterMessages = [
    'Time to hydrate 💧 Drink a glass of water now.',
    'Water check! 💦 Have you had enough water today?',
    'Hydration reminder 🥤 Your body needs water to stay energised.',
    "Don't forget to drink water! 💧 Small sips throughout the day add up.",
    'Stay hydrated 💦 Proper hydration improves focus and energy.',
    "Water o'clock 🕐💧 Take a moment to drink some water.",
    'Quick reminder 💧 Drinking water boosts metabolism and mood.',
  ];

  // Every 2 hours: 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm, 10pm
  const hours = [8, 10, 12, 14, 16, 18, 20, 22];

  for (let i = 0; i < hours.length; i++) {
    const hour = hours[i];
    await Notifications.scheduleNotificationAsync({
      identifier: `${WATER_REMINDER_PREFIX}${hour}`,
      content: {
        title: '💧 Hydration Reminder',
        body: waterMessages[i % waterMessages.length],
        data: { type: 'water_reminder', navigate: 'Water' },
        sound: false, // silent — informational only
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  }
}

// ── Cancel water reminders ────────────────────────────────────────────────────
export async function cancelWaterReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(WATER_REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
}

// ── Cancel morning brief ──────────────────────────────────────────────────────
export async function cancelMorningBrief(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MORNING_BRIEF_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(EVENING_SUMMARY_ID).catch(() => {});
}

// ── Setup Android reminder channel ───────────────────────────────────────────
export async function setupReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Health Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 200],
    enableVibrate: true,
  });
}

// ── Schedule all smart notifications (call once on login) ────────────────────
export async function scheduleAllSmartNotifications(userName: string): Promise<void> {
  const already = await AsyncStorage.getItem(STORAGE_KEY);
  if (already === 'true') return; // already scheduled this session

  await setupReminderChannel();
  await scheduleMorningBrief(userName);
  await scheduleEveningSummary();
  await scheduleWaterReminders();

  await AsyncStorage.setItem(STORAGE_KEY, 'true');
}

// ── Reschedule all (call when user updates preferences) ──────────────────────
export async function rescheduleAllSmartNotifications(
  userName: string,
  opts: { morningBrief: boolean; waterReminders: boolean; eveningSummary: boolean }
): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await setupReminderChannel();

  if (opts.morningBrief) await scheduleMorningBrief(userName);
  else await cancelMorningBrief();

  if (opts.waterReminders) await scheduleWaterReminders();
  else await cancelWaterReminders();

  if (opts.eveningSummary) await scheduleEveningSummary();
  else await Notifications.cancelScheduledNotificationAsync(EVENING_SUMMARY_ID).catch(() => {});

  await AsyncStorage.setItem(STORAGE_KEY, 'true');
}

const firstName = (name: string) => name.split(' ')[0] || 'there';
