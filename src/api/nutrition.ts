import api from './axios';

export interface FoodNutrients {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  potassium?: number;
  sodium?: number;
  zinc?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminA?: number;
  vitaminB1?: number;
  vitaminB2?: number;
  vitaminB3?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  folate?: number;
  cholesterol?: number;
  saturatedFat?: number;
}

export interface FoodResult {
  fdcId: number;
  name: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients: FoodNutrients;
  score: number;
}

export interface MealDay {
  meal: string;
  foods: string[];
  kcal: number;
}

export interface WeekDay {
  day: string;
  meals: MealDay[];
}

export interface GoalPlan {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  rationale: string;
  sources: string[];
  calories: number;
  macros: { protein: number; carbs: number; fat: number; fiber: number };
  rules: string[];
  weekPlan: WeekDay[];
  disclaimer: string;
}

export const searchFood = async (query: string, limit = 10): Promise<FoodResult[]> => {
  const { data } = await api.get<{ foods: FoodResult[] }>('/nutrition/search', {
    params: { q: query, limit },
  });
  return data.foods ?? [];
};

export const getGoalPlans = async (): Promise<GoalPlan[]> => {
  const { data } = await api.get<{ plans: GoalPlan[] }>('/nutrition/plans');
  return data.plans ?? [];
};
