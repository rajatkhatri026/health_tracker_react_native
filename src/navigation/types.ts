import type { Workout } from '../api/workouts';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  WelcomeBack: undefined;
  Main: undefined;
  WorkoutDetail: { workout: Workout };
  AICoach: undefined;
  MealPlanner: undefined;
  WeightProgress: undefined;
  FastingTimer: undefined;
  ExerciseLibrary: undefined;
  BarcodeScanner: undefined;
  Paywall: undefined;
  WorkoutPrograms: undefined;
  WeeklyReport: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Workout: { deleted?: boolean } | undefined;
  Steps: undefined;
  Calories: undefined;
  Water: undefined;
  Sleep: undefined;
  Profile: undefined;
};
