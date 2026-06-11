/**
 * Shared calorie calculation utilities.
 *
 * All formulas are evidence-based:
 *   Steps:   calories = steps × 0.0005 × weightKg
 *            (stride ≈ 0.762 m, MET 3.5 walking → 0.0005 kcal/step/kg)
 *   Workout: calories = MET × weightKg × (durationMins / 60)
 *            (ACSM Compendium of Physical Activities, 2011)
 *   TDEE:    Mifflin–St Jeor BMR × activity multiplier
 */

// ── MET values (ACSM Compendium of Physical Activities, 2011) ────────────────
export const MET_BY_CATEGORY: Record<string, number> = {
  strength: 5.0, // resistance/weight training, moderate effort
  cardio: 7.0, // general aerobic
  hiit: 8.5, // high-intensity interval training
  yoga: 3.0, // hatha yoga
  pilates: 3.5, // pilates
  cycling: 7.5, // stationary cycling, moderate
  running: 9.8, // running ~8 km/h
  swimming: 7.0, // freestyle, moderate
  stretching: 2.5, // stretching / flexibility
  sports: 7.0, // general sports
  default: 5.0,
};

/**
 * Calories burned from steps.
 * Formula: steps × 0.0005 × weightKg
 */
export const calcStepsCalories = (steps: number, weightKg: number): number =>
  Math.max(0, Math.round(steps * 0.0005 * weightKg));

/**
 * Calories burned from a workout.
 * Formula: MET × weightKg × (durationMins / 60)
 */
export const calcWorkoutCalories = (
  durationMins: number,
  category: string,
  weightKg: number
): number => {
  const met = MET_BY_CATEGORY[category.toLowerCase()] ?? MET_BY_CATEGORY.default;
  return Math.max(0, Math.round(met * weightKg * (durationMins / 60)));
};

/**
 * Default weight used when user profile is not yet set.
 * 70 kg is a neutral population average.
 */
export const DEFAULT_WEIGHT_KG = 70;

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type FitnessGoal = 'lose_fat' | 'muscle_gain' | 'recomp';
export type DietType = 'veg' | 'nonveg' | 'mixed';

export interface MealProfile {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: 'male' | 'female' | 'other';
  activity: ActivityLevel;
  goal: FitnessGoal;
  dietType: DietType;
  planStartDate: string; // ISO date string — set once when profile is first created
}

/** Returns which week index (0-based) the user is on, given their plan start date. */
export const getCurrentWeekIndex = (planStartDate?: string): number => {
  if (!planStartDate) return 0;
  const start = new Date(planStartDate);
  if (isNaN(start.getTime())) return 0;
  const diffMs = new Date().getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(diffDays / 7));
};

export interface PlanMacros {
  calories: number; // goal-adjusted kcal/day
  protein: number; // grams/day
  carbs: number; // grams/day
  fat: number; // grams/day
  fiber: number; // grams/day
  tdee: number; // maintenance TDEE before goal adjustment
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

/**
 * Mifflin–St Jeor TDEE (kcal/day).
 */
export const calcTDEE = (
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'male' | 'female' | 'other',
  activity: ActivityLevel
): number => {
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  return Math.round(bmr * ACTIVITY_FACTORS[activity]);
};

/**
 * Goal-adjusted calories + ISSN/ACSM macro split.
 *
 * lose_fat:    TDEE − 500  | protein 2.2g/kg | fat 25% | carbs remainder
 * muscle_gain: TDEE + 300  | protein 1.8g/kg | fat 25% | carbs remainder
 * recomp:      TDEE        | protein 2.4g/kg | fat 28% | carbs remainder
 */
export const calcPlanMacros = (tdee: number, goal: FitnessGoal, weightKg: number): PlanMacros => {
  const calorieAdjust = { lose_fat: -500, muscle_gain: 300, recomp: 0 };
  const proteinPerKg = { lose_fat: 2.2, muscle_gain: 1.8, recomp: 2.4 };
  const fatPct = { lose_fat: 0.25, muscle_gain: 0.25, recomp: 0.28 };

  const calories = Math.max(1200, Math.round((tdee + calorieAdjust[goal]) / 50) * 50);
  const protein = Math.round(proteinPerKg[goal] * weightKg);
  const fat = Math.round((calories * fatPct[goal]) / 9);
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbs = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4));
  const fiber = goal === 'lose_fat' ? 40 : goal === 'recomp' ? 38 : 35;

  return { calories, protein, carbs, fat, fiber, tdee };
};

/**
 * Daily calorie burn goal (TDEE) using Mifflin–St Jeor BMR × activity factor.
 * Uses a default height of 170cm when height is not collected.
 */
export const calcDailyGoal = (
  weightKg: number,
  ageYears: number,
  gender: 'male' | 'female' | 'other',
  activity: ActivityLevel = 'light'
): number => {
  const tdee = calcTDEE(weightKg, 170, ageYears, gender, activity);
  return Math.round(tdee / 50) * 50;
};
