import api from './axios';

export interface PlatformStats {
  active_users: number;
  total_workouts: number;
  avg_rating: number | null;
}

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const { data } = await api.get<PlatformStats>('/stats');
  return data;
};
