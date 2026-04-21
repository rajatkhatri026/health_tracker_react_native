import api from './axios';
import type { Device, Consent } from '../types';

export const connectDevice = async (
  userId: string,
  payload: { vendor: string; model: string }
): Promise<Device> => {
  const { data } = await api.post<Device>(`/users/${userId}/devices/connect`, payload);
  return data;
};

export const getConsents = async (userId: string): Promise<Consent[]> => {
  const { data } = await api.get<Consent[]>(`/users/${userId}/consents`);
  return data;
};

export const createConsent = async (
  userId: string,
  payload: { provider_id: string; scope: string }
): Promise<Consent> => {
  const { data } = await api.post<Consent>(`/users/${userId}/consents`, payload);
  return data;
};
