import type { Workout } from '../api/workouts';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  WorkoutDetail: { workout: Workout };
};

export type MainTabParamList = {
  Home: undefined;
  Workout: { deleted?: boolean } | undefined;
  Steps: undefined;
  Meal: undefined;
  Sleep: undefined;
  Profile: undefined;
};
