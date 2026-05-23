import api from './axios';

export type NotificationType = 'reminder' | 'summary' | 'goal' | 'streak' | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

export const fetchNotifications = async (userId: string): Promise<NotificationsResponse> => {
  const { data } = await api.get<NotificationsResponse>(`/users/${userId}/notifications?limit=50`);
  return data;
};

export const fetchUnreadCount = async (userId: string): Promise<number> => {
  const { data } = await api.get<{ unread_count: number }>(
    `/users/${userId}/notifications/unread-count`
  );
  return data.unread_count;
};

export const markNotificationRead = async (userId: string, notifId: string): Promise<void> => {
  await api.patch(`/users/${userId}/notifications/${notifId}/read`);
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  await api.patch(`/users/${userId}/notifications/read-all`);
};

export const deleteNotification = async (userId: string, notifId: string): Promise<void> => {
  await api.delete(`/users/${userId}/notifications/${notifId}`);
};

export const clearAllNotifications = async (userId: string): Promise<void> => {
  await api.delete(`/users/${userId}/notifications`);
};

export const createNotification = async (
  userId: string,
  payload: {
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }
): Promise<AppNotification> => {
  const { data } = await api.post<AppNotification>(`/users/${userId}/notifications`, payload);
  return data;
};
