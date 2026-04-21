import api from './axios';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg?: number;
  restSecs?: number;
  completed: boolean;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  category: string;
  emoji: string;
  exercises: Exercise[];
  durationMins: number;
  caloriesBurned: number;
  scheduledAt: string;
  completedAt?: string;
  status: 'scheduled' | 'completed' | 'skipped';
  createdAt: string;
}

export interface WorkoutStats {
  total_completed: number;
  total_calories_burned: number;
  total_mins: number;
  weekly_counts: number[]; // 7 items, index 0 = 6 days ago
  this_week: number;
}

export interface CreateWorkoutPayload {
  name: string;
  category: string;
  emoji?: string;
  exercises: Omit<Exercise, 'id' | 'completed'>[];
  durationMins: number;
  caloriesBurned?: number;
  scheduledAt: string;
}

export interface CompleteWorkoutPayload {
  exercises: Exercise[];
  durationMins: number;
  caloriesBurned: number;
}

export const getWorkouts = async (
  userId: string,
  params?: { status?: string; from?: string; to?: string; limit?: number; offset?: number }
): Promise<Workout[]> => {
  const { data } = await api.get<Workout[]>(`/users/${userId}/workouts`, { params });
  return data;
};

export const createWorkout = async (
  userId: string,
  payload: CreateWorkoutPayload
): Promise<Workout> => {
  const { data } = await api.post<Workout>(`/users/${userId}/workouts`, payload);
  return data;
};

export const createWorkoutsBulk = async (
  userId: string,
  payloads: CreateWorkoutPayload[]
): Promise<Workout[]> => {
  const { data } = await api.post<Workout[]>(`/users/${userId}/workouts/bulk`, payloads);
  return data;
};

export const updateWorkout = async (
  userId: string,
  workoutId: string,
  payload: CreateWorkoutPayload
): Promise<Workout> => {
  const { data } = await api.patch<Workout>(`/users/${userId}/workouts/${workoutId}`, payload);
  return data;
};

export const completeWorkout = async (
  userId: string,
  workoutId: string,
  payload: CompleteWorkoutPayload
): Promise<Workout> => {
  const { data } = await api.patch<Workout>(
    `/users/${userId}/workouts/${workoutId}/complete`,
    payload
  );
  return data;
};

export const deleteWorkout = async (userId: string, workoutId: string): Promise<void> => {
  await api.delete(`/users/${userId}/workouts/${workoutId}`);
};

export const deleteWorkoutsBulk = async (userId: string, ids: string[]): Promise<void> => {
  await api.delete(`/users/${userId}/workouts/bulk`, { data: { ids } });
};

export const getWorkoutStats = async (userId: string): Promise<WorkoutStats> => {
  const { data } = await api.get<WorkoutStats>(`/users/${userId}/workouts/stats`);
  return data;
};
