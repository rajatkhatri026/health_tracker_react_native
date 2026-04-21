import api from './axios';

export interface DailyStepsRecord {
  date: string; // YYYY-MM-DD
  steps: number;
}

export const getSteps = async (userId: string, days = 7): Promise<DailyStepsRecord[]> => {
  const { data } = await api.get<DailyStepsRecord[]>(`/users/${userId}/steps`, {
    params: { days },
  });
  return data;
};

export const syncSteps = async (userId: string, date: string, steps: number): Promise<void> => {
  await api.post(`/users/${userId}/steps/sync`, { date, steps });
};

export const syncStepsBulk = async (userId: string, records: DailyStepsRecord[]): Promise<void> => {
  await api.post(`/users/${userId}/steps/sync/bulk`, records);
};
