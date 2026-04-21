import api from './axios';
import type { AuthTokens, User } from '../types';

export const phoneAuth = async (
  idToken: string
): Promise<AuthTokens & { is_new_user: boolean }> => {
  const { data } = await api.post('/auth/phone', { id_token: idToken });
  return data;
};

export const sendEmailVerification = async (): Promise<void> => {
  await api.post('/auth/send-verification');
};

export const refreshTokens = async (refresh_token: string): Promise<AuthTokens> => {
  const { data } = await api.post<AuthTokens>('/auth/refresh', { refresh_token });
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/auth/me');
  return data;
};
