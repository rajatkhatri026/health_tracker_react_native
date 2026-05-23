import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { AppNotification } from '../api/notifications';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from '../api/notifications';
import { useAuth } from '../context/AuthContext';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const userId = user?.user_id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNotifications(userId);
      if (isMounted.current) {
        setNotifications(res.notifications);
        setUnreadCount(res.unread_count);
      }
    } catch {
      if (isMounted.current) setError('Failed to load notifications');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [userId]);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await fetchUnreadCount(userId);
      if (isMounted.current) setUnreadCount(count);
    } catch {
      // silent
    }
  }, [userId]);

  const markRead = useCallback(
    async (notifId: string) => {
      if (!userId) return;
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(userId, notifId);
      } catch {
        await load();
      }
    },
    [userId, load]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead(userId);
    } catch {
      await load();
    }
  }, [userId, load]);

  const remove = useCallback(
    async (notifId: string) => {
      if (!userId) return;
      const removed = notifications.find((n) => n.id === notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await deleteNotification(userId, notifId);
      } catch {
        await load();
      }
    },
    [userId, notifications, load]
  );

  const clearAll = useCallback(async () => {
    if (!userId) return;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearAllNotifications(userId);
    } catch {
      await load();
    }
  }, [userId, load]);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      refreshUnreadCount();
      return () => {
        isMounted.current = false;
      };
    }, [refreshUnreadCount])
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    load,
    markRead,
    markAllRead,
    remove,
    clearAll,
    refresh: load,
  };
};
