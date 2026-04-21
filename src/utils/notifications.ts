import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Workout } from '../api/workouts';

const isWeb = Platform.OS === 'web';

// How notifications behave when app is in foreground (mobile only)
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Web: request browser notification permission
const requestWebPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

const fireWebNotification = (workout: Workout) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(`${workout.emoji} Workout in 10 minutes!`, {
    body: `${workout.name} starts at ${new Date(workout.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Get ready!`,
    icon: '/assets/icon.png',
    tag: `workout_${workout.id}`,
  });
};

const NOTIFICATION_ID_PREFIX = 'workout_reminder_';

// setTimeout handles — fires when app is in foreground
const foregroundTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isWeb) return requestWebPermission();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

const fireNotification = async (workout: Workout) => {
  if (isWeb) {
    fireWebNotification(workout);
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIFICATION_ID_PREFIX}${workout.id}_fired`,
      content: {
        title: `${workout.emoji} Workout in 10 minutes!`,
        body: `${workout.name} starts at ${new Date(workout.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Get ready!`,
        data: { workoutId: workout.id },
        sound: true,
      },
      trigger: null,
    });
  } catch {
    /* Expo Go fallback already handled by setTimeout */
  }
};

// Schedule a local notification 10 mins before workout
export const scheduleWorkoutReminder = async (workout: Workout): Promise<void> => {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const scheduledAt = new Date(workout.scheduledAt);
  const reminderAt = new Date(scheduledAt.getTime() - 10 * 60 * 1000);
  const now = new Date();

  if (reminderAt <= now) return;

  await cancelWorkoutReminder(workout.id);

  const msUntilReminder = reminderAt.getTime() - now.getTime();

  // Native scheduled notification (mobile dev builds + production only)
  if (!isWeb) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIFICATION_ID_PREFIX}${workout.id}`,
        content: {
          title: `${workout.emoji} Workout in 10 minutes!`,
          body: `${workout.name} starts at ${scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Get ready!`,
          data: { workoutId: workout.id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderAt,
        },
      });
    } catch {
      /* Expo Go — setTimeout fallback below handles it */
    }
  }

  // setTimeout fallback — fires if app is open at reminder time (works in Expo Go too)
  if (foregroundTimers.has(workout.id)) clearTimeout(foregroundTimers.get(workout.id)!);
  const timer = setTimeout(() => {
    fireNotification(workout);
    foregroundTimers.delete(workout.id);
  }, msUntilReminder);
  foregroundTimers.set(workout.id, timer);

  console.log(
    `[Notifications] Reminder set for "${workout.name}" at ${reminderAt.toLocaleTimeString()} (in ${Math.round(msUntilReminder / 60000)} mins)`
  );
};

export const cancelWorkoutReminder = async (workoutId: string): Promise<void> => {
  if (!isWeb) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`${NOTIFICATION_ID_PREFIX}${workoutId}`);
    } catch {}
  }
  if (foregroundTimers.has(workoutId)) {
    clearTimeout(foregroundTimers.get(workoutId)!);
    foregroundTimers.delete(workoutId);
  }
};

export const syncWorkoutReminders = async (workouts: Workout[]): Promise<void> => {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Cancel all existing workout reminders
  if (!isWeb) {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((n) => n.identifier.startsWith(NOTIFICATION_ID_PREFIX))
          .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    } catch {}
  }
  foregroundTimers.forEach((t) => clearTimeout(t));
  foregroundTimers.clear();

  const now = new Date();
  const upcomingWithReminder = workouts.filter((w) => {
    if (w.status !== 'scheduled') return false;
    const reminderAt = new Date(new Date(w.scheduledAt).getTime() - 10 * 60 * 1000);
    return reminderAt > now;
  });

  await Promise.all(upcomingWithReminder.map((w) => scheduleWorkoutReminder(w)));
  console.log(`[Notifications] Synced ${upcomingWithReminder.length} reminder(s)`);
};
