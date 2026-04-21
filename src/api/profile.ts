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
