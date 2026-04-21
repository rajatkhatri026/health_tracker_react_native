import api from './axios';
import type { Goal, CreateGoalPayload } from '../types';

export const getGoals = async (userId: string): Promise<Goal[]> => {
  const { data } = await api.get<Goal[]>(`/users/${userId}/goals`);
  return data;
};

export const createGoal = async (
  userId: string,
  payload: CreateGoalPayload
): Promise<{ goal_id: string; status: string }> => {
  const { data } = await api.post(`/users/${userId}/goals`, payload);
  return data;
};

export const updateGoal = async (
  userId: string,
  goalId: string,
  payload: Partial<CreateGoalPayload>
): Promise<Goal> => {
  const { data } = await api.put<Goal>(`/users/${userId}/goals/${goalId}`, payload);
  return data;
};

export const deleteGoal = async (userId: string, goalId: string): Promise<void> => {
  await api.delete(`/users/${userId}/goals/${goalId}`);
};
