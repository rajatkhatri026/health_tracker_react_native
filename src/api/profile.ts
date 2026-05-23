import api from './axios';
import type { User, UserProfile } from '../types';

export const getProfile = async (userId: string): Promise<User & UserProfile> => {
  const { data } = await api.get<User & UserProfile>(`/users/${userId}/profile`);
  return data;
};

export const updateProfile = async (
  userId: string,
  payload: Partial<User & UserProfile>
): Promise<User & UserProfile> => {
  const { data } = await api.put<User & UserProfile>(`/users/${userId}/profile`, payload);
  return data;
};

export const savePushToken = async (userId: string, pushToken: string): Promise<void> => {
  await api.put(`/users/${userId}/profile/push-token`, { push_token: pushToken });
};

export const getAvatar = async (userId: string): Promise<{ avatar_url: string | null }> => {
  const { data } = await api.get<{ avatar_url: string | null }>(`/users/${userId}/profile/avatar`);
  return data;
};

export const uploadAvatar = async (
  userId: string,
  base64DataUri: string
): Promise<{ avatar_url: string }> => {
  const { data } = await api.put<{ avatar_url: string }>(`/users/${userId}/profile/avatar`, {
    avatar: base64DataUri,
  });
  return data;
};

export const deleteAvatar = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/users/${userId}/profile/avatar`);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: unknown }; message?: string };
    console.error(
      '[deleteAvatar] failed — status:',
      axiosErr?.response?.status,
      'data:',
      JSON.stringify(axiosErr?.response?.data),
      'message:',
      axiosErr?.message
    );
    throw err;
  }
};
