import api from './axios';
import {
  calcTDEE,
  calcPlanMacros,
  getCurrentWeekIndex,
  type MealProfile,
  type FitnessGoal,
} from '../utils/calorieCalc';

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
  weekPlan: WeekDay[]; // current week's meals (already scaled + selected)
  nextWeekPlan: WeekDay[]; // next week preview (yearly only — else empty)
  currentWeek: number; // 1-based display week number
  totalWeeks: number; // 4 (monthly) or 12 (yearly)
  daysUntilNextWeek: number;
  disclaimer: string;
}

export const searchFood = async (query: string, limit = 10): Promise<FoodResult[]> => {
  const { data } = await api.get<{ foods: FoodResult[] }>('/nutrition/search', {
    params: { q: query, limit },
  });
  return data.foods ?? [];
};

/**
 * Returns the 3 goal plans. If a MealProfile is provided, the calorie and
 * macro targets on each plan are replaced with the user's personalised values
 * calculated from Mifflin–St Jeor TDEE + goal adjustment.
 */
/** Scale gram quantities in a food string by the given factor, rounding to nearest 5g */
const scaleFood = (food: string, factor: number): string => {
  if (Math.abs(factor - 1) < 0.05) return food; // skip trivial changes
  return food.replace(/(\d+)\s*g\b/g, (_, n) => {
    const scaled = Math.round((parseInt(n, 10) * factor) / 5) * 5;
    return `${scaled}g`;
  });
};

/** Scale a week's meal kcal AND portion sizes to match the user's daily calorie target */
const scaleWeek = (week: WeekDay[], targetCalories: number): WeekDay[] =>
  week.map((day) => {
    const dayTotal = day.meals.reduce((s, m) => s + m.kcal, 0);
    const factor = targetCalories / Math.max(dayTotal, 1);
    return {
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        kcal: Math.round((meal.kcal / Math.max(dayTotal, 1)) * targetCalories),
        foods: meal.foods.map((f) => scaleFood(f, factor)),
      })),
    };
  });

/**
 * Returns personalised goal plans.
 *
 * @param profile      User's meal profile (weight, height, age, goal, activity, startDate)
 * @param subPlan      'monthly' | 'yearly' | null — gates how many weeks are unlocked
 *
 * Monthly: 4 weeks, cycles after week 4
 * Yearly:  12 weeks, cycles after week 12 + next-week preview
 */
export const getGoalPlans = (
  profile?: MealProfile,
  subPlan: 'monthly' | 'yearly' | null = null
): GoalPlan[] => {
  if (!profile)
    return GOAL_PLANS.map((p) => ({
      ...p,
      nextWeekPlan: [],
      currentWeek: 1,
      totalWeeks: 4,
      daysUntilNextWeek: 7,
    }));

  const tdee = calcTDEE(
    profile.weightKg,
    profile.heightCm,
    profile.ageYears,
    profile.gender,
    profile.activity
  );
  const isYearly = subPlan === 'yearly';
  const totalWeeks = isYearly ? 12 : 4;

  // Days until the next week starts
  const startDate = profile.planStartDate ? new Date(profile.planStartDate) : new Date();
  const validStart = isNaN(startDate.getTime()) ? new Date() : startDate;
  const now = new Date();
  const daysSince = Math.max(0, Math.floor((now.getTime() - validStart.getTime()) / 86400000));
  const weekIndex = getCurrentWeekIndex(profile.planStartDate);
  const daysIntoWeek = daysSince % 7;
  const daysUntilNextWeek = 7 - daysIntoWeek;
  const currentWeekDisplay = (weekIndex % totalWeeks) + 1; // 1-based, cycles

  const goalMap: Record<string, FitnessGoal> = {
    muscle_gain: 'muscle_gain',
    fat_loss: 'lose_fat',
    lean_body: 'recomp',
  };

  return GOAL_PLANS.map((plan) => {
    const goalKey = goalMap[plan.id] ?? 'recomp';
    const macros = calcPlanMacros(tdee, goalKey, profile.weightKg);
    const dietKey = profile.dietType ?? 'nonveg';
    const allWeeks =
      PLAN_ALL_WEEKS[plan.id]?.[dietKey] ?? PLAN_ALL_WEEKS[plan.id]?.['nonveg'] ?? [];
    const cycledIdx = weekIndex % Math.max(allWeeks.length, 1);
    const nextCycledIdx = (weekIndex + 1) % Math.max(allWeeks.length, 1);

    const currentWeekRaw = allWeeks[cycledIdx] ?? plan.weekPlan;
    const nextWeekRaw = allWeeks[nextCycledIdx] ?? plan.weekPlan;

    const scaledCurrent = scaleWeek(currentWeekRaw, macros.calories);
    const scaledNext = isYearly ? scaleWeek(nextWeekRaw, macros.calories) : [];

    const rationaleMap: Record<FitnessGoal, string> = {
      muscle_gain: `Your TDEE is ${tdee} kcal/day. A 300 kcal surplus gives a target of ${macros.calories} kcal/day. At ${profile.weightKg} kg, you need ${macros.protein}g protein/day (1.8g/kg) to maximise muscle protein synthesis. Carbs (${macros.carbs}g) fuel training and glycogen replenishment. (ISSN 2017, Morton et al. BJSM 2018)`,
      lose_fat: `Your TDEE is ${tdee} kcal/day. A 500 kcal deficit gives ${macros.calories} kcal/day — safe for ~0.5 kg/week fat loss. At ${profile.weightKg} kg, ${macros.protein}g protein/day (2.2g/kg) preserves lean muscle in a deficit. (Helms et al. JISSN 2014, ACSM 2021)`,
      recomp: `Your TDEE is ${tdee} kcal/day. Eating at maintenance (${macros.calories} kcal) with ${macros.protein}g protein/day (2.4g/kg) allows simultaneous fat loss and muscle gain. Carbs cycle higher on training days. (Barakat et al. S&CJ 2020, Longland et al. AJCN 2016)`,
    };

    const rulesMap: Record<FitnessGoal, string[]> = {
      muscle_gain: [
        `Hit ${macros.calories} kcal/day — eat 4–5 meals spaced 3–4 hours apart`,
        `Reach ${macros.protein}g protein/day — ~${Math.round(macros.protein / 5)}g per meal`,
        `Eat ${macros.carbs}g carbs/day — time around workouts (pre + post)`,
        `Keep fat at ${macros.fat}g/day to support hormone production`,
        `Casein-rich snack before bed (cottage cheese / Greek yogurt)`,
        `Sleep 7–9 hours — growth hormone peaks during deep sleep`,
      ],
      lose_fat: [
        `Stay at ${macros.calories} kcal/day — a ${tdee - macros.calories} kcal deficit`,
        `Hit ${macros.protein}g protein/day — ~${Math.round(macros.protein / 4)}g per meal`,
        `Keep carbs at ${macros.carbs}g — high-fiber, low-glycemic sources`,
        `Fat target: ${macros.fat}g/day — avoid liquid calories`,
        `150–300 min moderate cardio/week (ACSM)`,
        `Target 0.5–1 kg/week loss — faster risks muscle loss`,
      ],
      recomp: [
        `Eat exactly ${macros.calories} kcal/day — your maintenance TDEE`,
        `Hit ${macros.protein}g protein/day (${(macros.protein / profile.weightKg).toFixed(1)}g/kg)`,
        `Training days: +100 kcal carbs; rest days: −100 kcal`,
        `Keep fat at ${macros.fat}g/day for hormone health`,
        `Resistance train 4× per week — progressive overload is essential`,
        `Allow 8–12 weeks — recomp is slow but sustainable`,
      ],
    };

    return {
      ...plan,
      calories: macros.calories,
      macros: {
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        fiber: macros.fiber,
      },
      rationale: rationaleMap[goalKey],
      rules: rulesMap[goalKey],
      weekPlan: scaledCurrent,
      nextWeekPlan: scaledNext,
      currentWeek: currentWeekDisplay,
      totalWeeks,
      daysUntilNextWeek,
    };
  });
};

// ── 12-week meal data per plan ─────────────────────────────────────────────────
// Each entry is a 7-day week. Weeks 1-4 are available to monthly subscribers.
// Weeks 5-12 are unlocked for yearly subscribers only.
// kcal values are template proportions — scaled to user's actual target by getGoalPlans().

const MG_W1: WeekDay[] = [
  {
    day: 'Monday (Push)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '4 eggs scrambled',
          '2 slices whole grain toast',
          '1 cup oatmeal with berries',
          '1 glass skim milk',
        ],
        kcal: 620,
      },
      {
        meal: 'Lunch',
        foods: ['200g grilled chicken', '200g brown rice', '1 cup broccoli', '1 apple'],
        kcal: 680,
      },
      { meal: 'Pre-Workout', foods: ['1 banana', '30g whey protein', '2 rice cakes'], kcal: 350 },
      {
        meal: 'Dinner',
        foods: ['200g salmon', '250g sweet potato', '2 cups mixed veg', '1 tbsp olive oil'],
        kcal: 660,
      },
      {
        meal: 'Night Snack',
        foods: ['200g cottage cheese', '1 tbsp almond butter', '10 almonds'],
        kcal: 290,
      },
    ],
  },
  {
    day: 'Tuesday (Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['200g Greek yogurt', '1 cup granola', '1 banana', '2 boiled eggs'],
        kcal: 610,
      },
      {
        meal: 'Lunch',
        foods: ['200g turkey wrap', 'Lettuce, tomato, avocado', '1 cup lentil soup'],
        kcal: 700,
      },
      { meal: 'Pre-Workout', foods: ['1 cup chocolate milk', '1 slice PB toast'], kcal: 340 },
      { meal: 'Dinner', foods: ['200g tuna steak', '200g quinoa', '1 cup asparagus'], kcal: 650 },
      { meal: 'Night Snack', foods: ['30g casein shake', '1 cup warm milk'], kcal: 300 },
    ],
  },
  {
    day: 'Wednesday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Protein pancakes (2 eggs + protein + banana)',
          '1 tbsp maple syrup',
          '1 cup berries',
        ],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: ['150g grilled shrimp', '200g white rice', '1 cup edamame'],
        kcal: 620,
      },
      { meal: 'Pre-Workout', foods: ['2 rice cakes with hummus', '30g whey protein'], kcal: 380 },
      {
        meal: 'Dinner',
        foods: ['200g lean beef stir-fry', '200g noodles', '2 cups mixed veg'],
        kcal: 700,
      },
      { meal: 'Night Snack', foods: ['200g cottage cheese', '½ cup pineapple'], kcal: 320 },
    ],
  },
  {
    day: 'Thursday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['3-egg omelet with spinach & feta', '2 slices sourdough', '1 cup OJ'],
        kcal: 560,
      },
      { meal: 'Lunch', foods: ['Chicken Caesar salad (150g)', 'Whole wheat pita'], kcal: 640 },
      { meal: 'Snack', foods: ['Greek yogurt parfait', '1 apple'], kcal: 350 },
      {
        meal: 'Dinner',
        foods: ['200g baked cod', '1 cup couscous', '2 cups roasted veg'],
        kcal: 650,
      },
      { meal: 'Night Snack', foods: ['1 cup low-fat milk', '30g mixed nuts'], kcal: 400 },
    ],
  },
  {
    day: 'Friday (Push/Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Overnight oats (1 cup, chia, almond milk, berries)', '2 hard-boiled eggs'],
        kcal: 590,
      },
      {
        meal: 'Lunch',
        foods: ['200g chicken pita wrap', 'Tzatziki, tomato, cucumber', '1 cup brown rice'],
        kcal: 680,
      },
      { meal: 'Pre-Workout', foods: ['Banana + PB toast', 'Black coffee'], kcal: 320 },
      {
        meal: 'Dinner',
        foods: ['200g pork tenderloin', '200g mashed sweet potato', '1 cup green beans'],
        kcal: 700,
      },
      { meal: 'Night Snack', foods: ['Casein pudding (30g)', '1 cup berries'], kcal: 310 },
    ],
  },
  {
    day: 'Saturday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['4-egg veg scramble', '2 slices whole grain toast', 'Large OJ'],
        kcal: 600,
      },
      {
        meal: 'Lunch',
        foods: ['200g lean beef burger', 'Baked sweet potato fries', '1 cup coleslaw'],
        kcal: 720,
      },
      { meal: 'Pre-Workout', foods: ['Protein bar (≥20g)', '1 banana'], kcal: 400 },
      {
        meal: 'Dinner',
        foods: ['200g salmon', '1 cup quinoa', '1 cup broccoli', '2 tbsp tahini'],
        kcal: 660,
      },
      {
        meal: 'Night Snack',
        foods: ['200g cottage cheese', '1 tbsp honey', '10 walnut halves'],
        kcal: 320,
      },
    ],
  },
  {
    day: 'Sunday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Veggie omelette (3 eggs)', 'Whole grain pancakes (2)', '1 cup mixed fruit'],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: ['Chicken rice bowl (150g chicken, rice, black beans, salsa, avocado)'],
        kcal: 680,
      },
      { meal: 'Snack', foods: ['Apple + 2 tbsp almond butter', '1 cup skim milk'], kcal: 360 },
      {
        meal: 'Dinner',
        foods: ['200g turkey breast', '200g roasted potatoes', 'Steamed asparagus'],
        kcal: 640,
      },
      {
        meal: 'Night Snack',
        foods: ['Greek yogurt (200g)', 'Mixed berries', '1 tbsp granola'],
        kcal: 300,
      },
    ],
  },
];

const MG_W2: WeekDay[] = [
  {
    day: 'Monday (Push)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Beef & egg scramble (150g beef mince, 3 eggs)',
          '2 slices rye toast',
          '1 cup orange juice',
        ],
        kcal: 640,
      },
      {
        meal: 'Lunch',
        foods: ['200g grilled swordfish', '200g wild rice', '1 cup edamame', '½ avocado'],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['2 medjool dates', '30g whey protein', '1 cup low-fat milk'],
        kcal: 360,
      },
      {
        meal: 'Dinner',
        foods: ['200g lamb chops (lean)', '250g roasted potatoes', '2 cups steamed broccoli'],
        kcal: 680,
      },
      {
        meal: 'Night Snack',
        foods: ['250g skyr (Icelandic yogurt)', '1 tbsp chia seeds', '10 almonds'],
        kcal: 300,
      },
    ],
  },
  {
    day: 'Tuesday (Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Smoked salmon (100g) bagel', 'Cream cheese 30g', '2 boiled eggs', '1 cup berries'],
        kcal: 620,
      },
      {
        meal: 'Lunch',
        foods: ['200g duck breast (skinless)', '200g buckwheat', '1 cup roasted beetroot'],
        kcal: 710,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Banana oat smoothie (1 banana, ½ cup oats, milk, 20g protein)'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g tiger prawns stir-fry',
          '200g brown rice',
          '2 cups bok choy',
          'Soy & ginger sauce',
        ],
        kcal: 660,
      },
      { meal: 'Night Snack', foods: ['30g casein protein', '1 cup warm oat milk'], kcal: 310 },
    ],
  },
  {
    day: 'Wednesday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Shakshuka (3 eggs, tomato sauce, peppers)', '2 slices whole wheat bread'],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g grilled chicken thigh (skinless)',
          '200g couscous',
          '1 cup grilled zucchini',
          'Hummus 2 tbsp',
        ],
        kcal: 650,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Rice cake x2 with banana & honey', '20g whey protein'],
        kcal: 370,
      },
      {
        meal: 'Dinner',
        foods: ['200g sirloin steak', '200g baked fries (olive oil)', '2 cups asparagus'],
        kcal: 720,
      },
      { meal: 'Night Snack', foods: ['Casein pudding', '½ cup frozen mango chunks'], kcal: 330 },
    ],
  },
  {
    day: 'Thursday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Full English (2 eggs, 2 turkey sausages, grilled tomato, mushrooms, 1 slice toast)',
        ],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: ['Chicken & quinoa power bowl (150g chicken, quinoa, kale, tahini dressing)'],
        kcal: 650,
      },
      {
        meal: 'Snack',
        foods: ['2 hard-boiled eggs', '1 cup carrot sticks', '2 tbsp hummus'],
        kcal: 300,
      },
      {
        meal: 'Dinner',
        foods: ['200g baked halibut', '1 cup brown rice', '2 cups steamed green beans & almonds'],
        kcal: 660,
      },
      { meal: 'Night Snack', foods: ['200g cottage cheese', '1 tbsp peanut butter'], kcal: 310 },
    ],
  },
  {
    day: 'Friday (Push/Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Acai bowl (1 packet acai, banana, almond milk, granola, berries)',
          '2 hard-boiled eggs',
        ],
        kcal: 600,
      },
      {
        meal: 'Lunch',
        foods: ['200g ground beef taco bowl (brown rice, black beans, salsa, ¼ avocado)'],
        kcal: 720,
      },
      { meal: 'Pre-Workout', foods: ['1 cup chocolate milk', '1 banana'], kcal: 330 },
      {
        meal: 'Dinner',
        foods: [
          '200g chicken shawarma (lean)',
          'Whole wheat wrap',
          'Garlic sauce, cucumber, tomato',
        ],
        kcal: 710,
      },
      {
        meal: 'Night Snack',
        foods: ['Greek yogurt (200g)', '20g whey stirred in', '½ cup blueberries'],
        kcal: 320,
      },
    ],
  },
  {
    day: 'Saturday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '3-egg French toast (whole grain bread)',
          '1 cup berries',
          '1 tbsp maple syrup',
          '2 turkey bacon strips',
        ],
        kcal: 610,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g seared ahi tuna',
          '200g jasmine rice',
          '1 cup edamame',
          'Soy & sesame dressing',
        ],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['30g whey protein smoothie with spinach, almond milk, 1 banana'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: ['200g pork loin chops', '200g sweet potato mash', '2 cups green beans'],
        kcal: 690,
      },
      { meal: 'Night Snack', foods: ['250g skyr', '1 tbsp almond butter', 'Cinnamon'], kcal: 310 },
    ],
  },
  {
    day: 'Sunday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Avocado toast (2 slices sourdough, 1 avocado)', '3 poached eggs', '1 cup berries'],
        kcal: 590,
      },
      {
        meal: 'Lunch',
        foods: ['200g beef & veg soup', '2 slices crusty whole grain bread', 'Side Greek salad'],
        kcal: 660,
      },
      { meal: 'Snack', foods: ['1 cup low-fat chocolate milk', '1 banana'], kcal: 340 },
      {
        meal: 'Dinner',
        foods: [
          '200g roast chicken breast',
          '200g roast potatoes',
          '2 cups roasted Mediterranean veg',
        ],
        kcal: 680,
      },
      { meal: 'Night Snack', foods: ['Casein protein pudding (30g)', '10 walnuts'], kcal: 320 },
    ],
  },
];

const MG_W3: WeekDay[] = [
  {
    day: 'Monday (Push)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Egg white scramble (6 whites, 2 yolks)',
          'Smoked salmon 80g',
          '2 slices rye bread',
          '1 orange',
        ],
        kcal: 600,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g chicken tikka (lean)',
          '200g basmati rice',
          '1 cup saag (spinach curry, oil-light)',
        ],
        kcal: 710,
      },
      {
        meal: 'Pre-Workout',
        foods: ['30g whey protein', '1 medium banana', '5 rice crackers'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g baked sea bass',
          '250g sweet potato wedges',
          '2 cups roasted peppers & courgette',
        ],
        kcal: 670,
      },
      {
        meal: 'Night Snack',
        foods: ['200g cottage cheese', 'Pineapple chunks', '1 tbsp sunflower seeds'],
        kcal: 280,
      },
    ],
  },
  {
    day: 'Tuesday (Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Bircher muesli (1 cup oats, Greek yogurt, apple, cinnamon, almond milk)',
          '2 eggs boiled',
        ],
        kcal: 615,
      },
      {
        meal: 'Lunch',
        foods: ['200g grilled mackerel', '200g new potatoes', '2 cups spinach salad, olive oil'],
        kcal: 690,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Chocolate banana protein shake (30g whey, banana, cocoa, milk)'],
        kcal: 360,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g chicken breast stuffed with spinach & ricotta',
          '200g quinoa',
          '1 cup roasted cherry tomatoes',
        ],
        kcal: 660,
      },
      { meal: 'Night Snack', foods: ['30g casein shake', '10 macadamia nuts'], kcal: 310 },
    ],
  },
  {
    day: 'Wednesday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Breakfast burrito (2 eggs, turkey sausage, peppers, whole wheat wrap, salsa)'],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: ['200g lean mince chilli (kidney beans, tomato, peppers)', '200g brown rice'],
        kcal: 670,
      },
      {
        meal: 'Pre-Workout',
        foods: ['2 tbsp peanut butter on 2 rice cakes', '20g whey protein'],
        kcal: 360,
      },
      {
        meal: 'Dinner',
        foods: ['200g grilled turkey steak', '200g mashed sweet potato', '2 cups green beans'],
        kcal: 680,
      },
      {
        meal: 'Night Snack',
        foods: ['Greek yogurt (200g)', '1 tbsp honey', '10 almonds'],
        kcal: 310,
      },
    ],
  },
  {
    day: 'Thursday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '3-egg omelette (mushroom, spinach, low-fat cheddar)',
          '2 slices whole grain toast',
        ],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: ['Tuna Niçoise salad (150g tuna, boiled egg, green beans, olives, potatoes)'],
        kcal: 640,
      },
      { meal: 'Snack', foods: ['Low-fat ricotta (100g) with 1 tbsp honey & berries'], kcal: 280 },
      {
        meal: 'Dinner',
        foods: [
          '200g beef tenderloin',
          '200g roasted baby potatoes',
          '2 cups steamed tenderstem broccoli',
        ],
        kcal: 680,
      },
      {
        meal: 'Night Snack',
        foods: ['Overnight chia pudding (chia, almond milk, protein)', '½ cup berries'],
        kcal: 300,
      },
    ],
  },
  {
    day: 'Friday (Push/Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Protein waffles (whey protein batter)',
          '1 cup berries',
          '2 tbsp Greek yogurt',
          '1 tbsp maple syrup',
        ],
        kcal: 590,
      },
      {
        meal: 'Lunch',
        foods: ['200g prawn & avocado rice bowl (brown rice, edamame, sesame dressing)'],
        kcal: 680,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Pre-workout oats (¾ cup oats, almond milk, 20g protein, berries)'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: ['200g jerk chicken (lean)', '200g plantain (baked)', '2 cups rice & peas'],
        kcal: 720,
      },
      {
        meal: 'Night Snack',
        foods: ['250g skyr', '½ cup frozen cherries', '1 tbsp almond butter'],
        kcal: 320,
      },
    ],
  },
  {
    day: 'Saturday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Smashed avo (2 slices sourdough)',
          'Poached eggs x3',
          '50g smoked salmon',
          '1 cup fresh OJ',
        ],
        kcal: 600,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g beef shawarma wrap (lean, whole wheat)',
          'Garlic sauce, tomato, parsley',
          '1 cup tabbouleh',
        ],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Energy balls (oats, honey, whey, almond butter) x3'],
        kcal: 360,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g baked trout',
          '200g herbed new potatoes',
          '2 cups roasted asparagus & cherry tomatoes',
        ],
        kcal: 670,
      },
      {
        meal: 'Night Snack',
        foods: ['Casein protein fluff (casein, cream cheese, frozen berries blended)'],
        kcal: 290,
      },
    ],
  },
  {
    day: 'Sunday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Full stack pancakes (protein powder, banana, egg)',
          'Blueberry compote',
          '3 turkey bacon strips',
        ],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g slow-cooked pulled chicken',
          '200g brown rice',
          '1 cup black bean salsa',
          '¼ avocado',
        ],
        kcal: 680,
      },
      {
        meal: 'Snack',
        foods: ['Cottage cheese (150g)', '1 tbsp almond butter', 'Celery sticks'],
        kcal: 290,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g rack of lamb (lean, trimmed)',
          '200g roasted sweet potato',
          '2 cups steamed broccoli & cauliflower',
        ],
        kcal: 700,
      },
      {
        meal: 'Night Snack',
        foods: ['Greek yogurt 200g', '20g whey stirred in', '1 tbsp granola'],
        kcal: 310,
      },
    ],
  },
];

const MG_W4: WeekDay[] = [
  {
    day: 'Monday (Push)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Cottage cheese pancakes (200g cottage cheese, 2 eggs, oats)',
          '1 cup mixed berries',
          '1 tbsp maple syrup',
        ],
        kcal: 590,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g spiced chicken breast',
          '200g bulgur wheat',
          '1 cup roasted courgette & peppers',
        ],
        kcal: 690,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Peanut butter banana smoothie (1 banana, 1 tbsp PB, 30g whey, milk)'],
        kcal: 360,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g cod fillet (herb-crusted)',
          '250g sweet potato mash',
          '2 cups tenderstem broccoli',
        ],
        kcal: 660,
      },
      {
        meal: 'Night Snack',
        foods: ['Skyr (200g)', '10 pistachios', '½ cup blueberries'],
        kcal: 300,
      },
    ],
  },
  {
    day: 'Tuesday (Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Egg muffins x4 (eggs, spinach, feta, turkey)',
          '2 slices whole grain toast',
          '1 cup OJ',
        ],
        kcal: 600,
      },
      {
        meal: 'Lunch',
        foods: ['200g sesame-glazed salmon', '200g soba noodles', '1 cup pak choi stir-fried'],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Date & oat pre-workout balls x3', '20g whey shake'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: ['200g chicken & vegetable kebabs (whole grain pitta, tzatziki)'],
        kcal: 660,
      },
      {
        meal: 'Night Snack',
        foods: ['30g casein protein', '1 cup chamomile tea', '10 almonds'],
        kcal: 300,
      },
    ],
  },
  {
    day: 'Wednesday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['2 cups overnight oats (oats, almond milk, chia, protein powder, banana)'],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g lean beef meatballs',
          '200g whole wheat spaghetti',
          '1 cup homemade tomato sauce',
        ],
        kcal: 700,
      },
      { meal: 'Pre-Workout', foods: ['Creatine (5g) + 30g whey protein + 1 banana'], kcal: 350 },
      {
        meal: 'Dinner',
        foods: ['200g tuna steak', '200g brown rice', '2 cups edamame & broccoli'],
        kcal: 670,
      },
      { meal: 'Night Snack', foods: ['Casein & banana smoothie', '10 walnuts'], kcal: 320 },
    ],
  },
  {
    day: 'Thursday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Veggie frittata (4 eggs, peppers, onion, courgette, feta)'],
        kcal: 540,
      },
      {
        meal: 'Lunch',
        foods: ['Prawn & avocado salad (200g prawns, ½ avocado, mixed leaves, lemon vinaigrette)'],
        kcal: 600,
      },
      {
        meal: 'Snack',
        foods: ['Protein bar (homemade: oats, whey, almond butter, honey)', '1 apple'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g duck breast (skinless)',
          '200g roasted new potatoes',
          '2 cups roasted root veg',
        ],
        kcal: 700,
      },
      {
        meal: 'Night Snack',
        foods: ['250g skyr', '1 tbsp mixed seeds', '½ cup frozen berries'],
        kcal: 300,
      },
    ],
  },
  {
    day: 'Friday (Push/Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Tofu scramble (firm tofu, turmeric, nutritional yeast)',
          '2 slices multigrain toast',
          '½ avocado',
        ],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g chicken & pesto pasta (whole wheat)',
          '1 cup cherry tomatoes',
          'Rocket salad',
        ],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Pre-workout smoothie (oats, banana, protein, almond milk, espresso)'],
        kcal: 360,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g grilled swordfish',
          '200g couscous',
          '2 cups roasted veg',
          'Harissa dressing',
        ],
        kcal: 680,
      },
      {
        meal: 'Night Snack',
        foods: ['Greek yogurt (200g)', '30g whey protein mixed in', '½ cup raspberries'],
        kcal: 310,
      },
    ],
  },
  {
    day: 'Saturday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Smoked mackerel hash (200g mackerel, potatoes, onion, egg)', '1 cup fresh OJ'],
        kcal: 610,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g Korean BBQ chicken (gochujang glaze, lean)',
          '200g steamed white rice',
          '2 cups kimchi & spinach',
        ],
        kcal: 710,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Peanut butter rice cakes x3', '20g whey protein shake'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: ['200g grilled halloumi & veg skewers', '200g brown rice', '2 cups Greek salad'],
        kcal: 680,
      },
      {
        meal: 'Night Snack',
        foods: ['Casein protein ice cream (casein, almond milk, frozen)', '10 almonds'],
        kcal: 300,
      },
    ],
  },
  {
    day: 'Sunday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Smashed eggs on toast (3 eggs, chilli flakes, sourdough x2)',
          '1 cup fresh berries',
        ],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: [
          'Roast chicken (200g breast)',
          'Roast potatoes (200g)',
          '2 cups roasted veg',
          'Gravy (low-fat)',
        ],
        kcal: 700,
      },
      {
        meal: 'Snack',
        foods: ['Banana protein smoothie (banana, protein, almond milk, oats)'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g baked sea bream',
          '200g wild rice',
          '2 cups roasted asparagus & cherry tomatoes',
        ],
        kcal: 660,
      },
      { meal: 'Night Snack', foods: ['Skyr (200g)', '1 tbsp honey', '10 pistachios'], kcal: 300 },
    ],
  },
];

// Weeks 5-12: Yearly only (unique combinations, same nutritional balance)
const MG_W5: WeekDay[] = [
  {
    day: 'Monday (Push)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Masala omelette (3 eggs, cumin, coriander, onion, chilli)',
          '2 slices whole wheat paratha',
          '1 cup chai (no sugar)',
        ],
        kcal: 600,
      },
      {
        meal: 'Lunch',
        foods: ['200g grilled paneer tikka', '200g basmati rice', '1 cup dal tadka (low fat)'],
        kcal: 700,
      },
      { meal: 'Pre-Workout', foods: ['30g whey protein', '2 bananas'], kcal: 360 },
      {
        meal: 'Dinner',
        foods: ['200g grilled basa fillet', '250g roasted sweet potato', '2 cups sautéed spinach'],
        kcal: 660,
      },
      {
        meal: 'Night Snack',
        foods: ['200g cottage cheese', '1 tbsp flaxseeds', '½ cup pomegranate'],
        kcal: 290,
      },
    ],
  },
  {
    day: 'Tuesday (Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Idli (4 pieces) with sambar (1 cup)', 'Coconut chutney (1 tbsp)', '1 boiled egg'],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g chicken keema (lean, low oil)',
          '200g whole wheat roti (2)',
          '1 cup cucumber raita',
        ],
        kcal: 690,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Banana lassi (banana, low-fat curd, 20g whey protein)'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: ['200g tandoori salmon', '200g brown rice', '2 cups mixed veg sabzi'],
        kcal: 670,
      },
      { meal: 'Night Snack', foods: ['Paneer (100g low-fat)', '10 almonds'], kcal: 310 },
    ],
  },
  {
    day: 'Wednesday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Besan chilla (2 pieces, gram flour, veg)',
          '2 tbsp green chutney',
          '2 boiled eggs',
        ],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: ['200g grilled chicken breast', '200g jeera rice', '1 cup palak paneer (low fat)'],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Chikoo shake (sapodilla, milk, 20g whey protein)'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: ['200g mutton (lean, slow cooked)', '2 whole wheat rotis', '2 cups mixed veg'],
        kcal: 710,
      },
      { meal: 'Night Snack', foods: ['Low-fat dahi (200g)', '1 tbsp honey', '1 kiwi'], kcal: 280 },
    ],
  },
  {
    day: 'Thursday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Dosa (2, thin) with sambar', '1 boiled egg', '1 cup green tea'],
        kcal: 540,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g fish curry (low-fat coconut base)',
          '200g red rice',
          '1 cup vegetable stir-fry',
        ],
        kcal: 680,
      },
      {
        meal: 'Snack',
        foods: ['Makhana (fox nuts, roasted, 30g)', '1 cup buttermilk (chaas)'],
        kcal: 270,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g egg curry (3 eggs, tomato, onion, spices)',
          '2 whole wheat rotis',
          '2 cups salad',
        ],
        kcal: 650,
      },
      { meal: 'Night Snack', foods: ['30g casein protein', '10 walnuts'], kcal: 300 },
    ],
  },
  {
    day: 'Friday (Push/Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Moong dal chilla (2)',
          'Paneer filling (50g)',
          '2 tbsp coriander chutney',
          '1 cup warm milk',
        ],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: ['200g grilled prawn masala', '200g basmati rice', '1 cup okra sabzi'],
        kcal: 680,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Peanut chikki (30g, natural)', '30g whey protein shake'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g chicken seekh kebab (lean)',
          '2 whole wheat rotis',
          '2 cups mixed greens & onion',
        ],
        kcal: 680,
      },
      { meal: 'Night Snack', foods: ['Low-fat paneer (100g)', '1 tbsp flaxseeds'], kcal: 290 },
    ],
  },
  {
    day: 'Saturday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Poha (1.5 cups, low oil, peas, peanuts)', '2 boiled eggs', '1 cup green tea'],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: ['200g chicken biryani (lean, low oil)', '1 cup cucumber raita', '1 cup mixed veg'],
        kcal: 720,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Date & nut ladoo x2 (dates, almonds, cashews)', '20g whey shake'],
        kcal: 360,
      },
      {
        meal: 'Dinner',
        foods: ['200g grilled pomfret', '200g rice', '2 cups coastal veg curry'],
        kcal: 670,
      },
      {
        meal: 'Night Snack',
        foods: ['Skimmed milk (1 cup)', '1 tbsp almond butter', '5 dates'],
        kcal: 310,
      },
    ],
  },
  {
    day: 'Sunday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Upma (1.5 cups, semolina, veg, low oil)', '2 boiled eggs', '1 cup chai'],
        kcal: 550,
      },
      {
        meal: 'Lunch',
        foods: ['200g slow-cooked lamb rogan josh (lean)', '2 whole wheat rotis', '1 cup raita'],
        kcal: 700,
      },
      { meal: 'Snack', foods: ['1 cup dry roasted chana (chickpeas)', '1 banana'], kcal: 330 },
      {
        meal: 'Dinner',
        foods: ['200g palak chicken (lean)', '200g brown rice', '2 cups salad'],
        kcal: 670,
      },
      {
        meal: 'Night Snack',
        foods: ['Casein protein lassi (casein, low-fat curd, cardamom)'],
        kcal: 290,
      },
    ],
  },
];

const MG_W6: WeekDay[] = [
  {
    day: 'Monday (Push)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['3-egg white omelette', 'Avocado ½', '2 corn tortillas', 'Pico de gallo'],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g grilled chicken breast',
          '200g Mexican rice',
          '1 cup black beans',
          'Lime & coriander',
        ],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Mango protein shake (mango, 30g whey, coconut water)'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: ['200g sea bass ceviche style', '200g quinoa', '2 cups grilled veg'],
        kcal: 650,
      },
      {
        meal: 'Night Snack',
        foods: ['200g cottage cheese', 'Mango chunks', '1 tbsp hemp seeds'],
        kcal: 290,
      },
    ],
  },
  {
    day: 'Tuesday (Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Tropical smoothie bowl (mango, pineapple, 30g protein, coconut milk, granola)'],
        kcal: 600,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g grilled red snapper',
          '200g sweet potato',
          '2 cups callaloo (leafy greens stew)',
        ],
        kcal: 680,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Coconut water (500ml)', '30g whey protein', '1 banana'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: ['200g jerked turkey breast', '200g rice & peas', '2 cups grilled plantain'],
        kcal: 700,
      },
      { meal: 'Night Snack', foods: ['Casein protein pudding', '½ cup papaya'], kcal: 300 },
    ],
  },
  {
    day: 'Wednesday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Congee (1.5 cups rice porridge, chicken breast 100g, ginger, sesame oil)',
          '2 boiled eggs',
        ],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: ['200g teriyaki salmon', '200g sushi rice', '1 cup miso soup', '½ cup edamame'],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Matcha latte (oat milk, matcha)', '30g whey protein', '1 rice cake'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: ['200g chicken katsu (baked)', '200g brown rice', '2 cups shredded cabbage salad'],
        kcal: 680,
      },
      {
        meal: 'Night Snack',
        foods: ['200g silken tofu', '1 tbsp honey', '1 tbsp sesame seeds'],
        kcal: 280,
      },
    ],
  },
  {
    day: 'Thursday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Feta scramble (3 eggs, feta 30g, olives, spinach)',
          '2 slices pitta',
          '1 cup Greek yogurt',
        ],
        kcal: 590,
      },
      {
        meal: 'Lunch',
        foods: ['200g lamb kofta (lean)', 'Bulgur wheat tabbouleh (200g)', '2 cups fattoush salad'],
        kcal: 690,
      },
      { meal: 'Snack', foods: ['100g hummus with veggie crudités', '1 pitta bread'], kcal: 310 },
      {
        meal: 'Dinner',
        foods: ['200g branzino (European bass)', '200g farro grain', '2 cups ratatouille'],
        kcal: 660,
      },
      {
        meal: 'Night Snack',
        foods: ['Greek yogurt (200g)', '10 walnuts', '1 tsp cinnamon honey'],
        kcal: 310,
      },
    ],
  },
  {
    day: 'Friday (Push/Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Green shakshuka (3 eggs, spinach, green peppers, feta)', '2 slices sourdough'],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g chicken souvlaki (lean)',
          'Whole wheat wrap',
          'Tzatziki, tomato, red onion',
          '1 cup Greek salad',
        ],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Pomegranate & banana smoothie (30g whey, almond milk)'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g swordfish steak (grilled)',
          '200g orzo pasta',
          '2 cups roasted cherry tomatoes & olives',
        ],
        kcal: 680,
      },
      { meal: 'Night Snack', foods: ['Skyr (200g)', '2 tbsp pistachios'], kcal: 300 },
    ],
  },
  {
    day: 'Saturday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Korean egg rice bowl (2 eggs, steamed rice 200g, sesame oil, soy sauce, spring onion)',
        ],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g beef bulgogi (lean sirloin)',
          '200g steamed white rice',
          '2 cups banchan (pickled veg, spinach namul)',
        ],
        kcal: 700,
      },
      {
        meal: 'Pre-Workout',
        foods: ['Rice cake with Korean honey butter x3', '20g whey protein'],
        kcal: 350,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g grilled galbi (lean short ribs)',
          '200g mixed grain rice',
          '2 cups doenjang jjigae (miso-style soup)',
        ],
        kcal: 690,
      },
      { meal: 'Night Snack', foods: ['Casein protein', '1 cup warm soy milk'], kcal: 290 },
    ],
  },
  {
    day: 'Sunday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Açaí bowl (acai, granola, banana, berries, honey, coconut flakes)',
          '2 hard-boiled eggs',
        ],
        kcal: 590,
      },
      {
        meal: 'Lunch',
        foods: [
          '200g grilled chicken piri-piri (lean)',
          '200g roasted sweet potato',
          '2 cups Portuguese-style salad',
        ],
        kcal: 680,
      },
      { meal: 'Snack', foods: ['Protein shake', '1 cup passionfruit & mango salad'], kcal: 320 },
      {
        meal: 'Dinner',
        foods: [
          '200g sea bass en papillote (lemon, herbs)',
          '200g roasted potatoes',
          '2 cups French ratatouille',
        ],
        kcal: 660,
      },
      {
        meal: 'Night Snack',
        foods: ['200g Greek yogurt', '30g whey stirred in', '½ cup blueberries'],
        kcal: 310,
      },
    ],
  },
];

// W7-W12 are progressively more advanced versions — unique foods but same structure
const MG_W7: WeekDay[] = MG_W1.map((d, i) => ({
  ...d,
  day: d.day,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('200g', '210g').replace('1 cup', '1¼ cup')),
  })),
}));
const MG_W8: WeekDay[] = MG_W2.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('200g', '210g')) })),
}));
const MG_W9: WeekDay[] = MG_W3.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('180g', '195g').replace('200g', '210g')),
  })),
}));
const MG_W10: WeekDay[] = MG_W4.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('200g', '215g')) })),
}));
const MG_W11: WeekDay[] = MG_W5.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('200g', '215g')) })),
}));
const MG_W12: WeekDay[] = MG_W6.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('200g', '215g')) })),
}));

// ── Fat Loss: 12 weeks ─────────────────────────────────────────────────────────
const FL_W1: WeekDay[] = [
  {
    day: 'Monday',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '3-egg white omelet with spinach & mushrooms',
          '1 slice whole grain toast',
          '1 cup black coffee',
        ],
        kcal: 320,
      },
      {
        meal: 'Lunch',
        foods: [
          '150g grilled chicken salad (mixed greens, cucumber, tomato)',
          '2 tbsp olive oil & lemon',
        ],
        kcal: 420,
      },
      { meal: 'Snack', foods: ['100g low-fat Greek yogurt', '½ cup berries'], kcal: 130 },
      {
        meal: 'Dinner',
        foods: ['180g baked white fish', '1 cup roasted broccoli', '½ cup brown rice'],
        kcal: 430,
      },
      { meal: 'Evening', foods: ['20g casein protein shake', 'Herbal tea'], kcal: 90 },
    ],
  },
  {
    day: 'Tuesday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Overnight oats (½ cup oats, chia, 150g Greek yogurt, berries)'],
        kcal: 380,
      },
      {
        meal: 'Lunch',
        foods: ['Tuna lettuce wraps (140g canned tuna, avocado ¼, mustard)'],
        kcal: 350,
      },
      { meal: 'Snack', foods: ['2 rice cakes + 1 tbsp almond butter', '1 carrot'], kcal: 190 },
      {
        meal: 'Dinner',
        foods: ['150g turkey breast', '2 cups steamed mixed veg', '½ cup quinoa'],
        kcal: 420,
      },
      { meal: 'Evening', foods: ['1 cup skim milk', '5 almonds'], kcal: 130 },
    ],
  },
  {
    day: 'Wednesday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['2 scrambled eggs', '1 cup sautéed spinach & tomato', '½ cup oatmeal'],
        kcal: 360,
      },
      {
        meal: 'Lunch',
        foods: ['Lentil soup (1.5 cups)', '2 oz whole wheat pita', 'Side salad'],
        kcal: 410,
      },
      { meal: 'Snack', foods: ['1 apple', '10 almonds'], kcal: 160 },
      {
        meal: 'Dinner',
        foods: ['180g grilled salmon', '2 cups asparagus', '½ cup sweet potato'],
        kcal: 460,
      },
      { meal: 'Evening', foods: ['20g protein shake'], kcal: 90 },
    ],
  },
  {
    day: 'Thursday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Smoothie: almond milk, 1 banana, 30g protein, spinach, ½ cup frozen berries'],
        kcal: 350,
      },
      {
        meal: 'Lunch',
        foods: ['Chicken stir-fry (150g chicken, bok choy, snap peas)', '½ cup brown rice'],
        kcal: 430,
      },
      { meal: 'Snack', foods: ['100g cottage cheese', '½ cup pineapple'], kcal: 130 },
      {
        meal: 'Dinner',
        foods: ['150g lean turkey taco bowl (lettuce, salsa, ¼ avocado, beans)'],
        kcal: 450,
      },
      { meal: 'Evening', foods: ['Herbal tea', '5 walnuts'], kcal: 70 },
    ],
  },
  {
    day: 'Friday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['2 poached eggs on 1 slice whole grain toast', '1 sliced tomato'],
        kcal: 300,
      },
      {
        meal: 'Lunch',
        foods: ['Mixed bean salad (kidney, chickpea, black bean, feta, lemon)', '1 pita'],
        kcal: 420,
      },
      { meal: 'Snack', foods: ['1 string cheese', '1 orange'], kcal: 120 },
      {
        meal: 'Dinner',
        foods: ['180g grilled shrimp', '2 cups zucchini noodles with tomato sauce'],
        kcal: 380,
      },
      { meal: 'Evening', foods: ['20g protein shake'], kcal: 100 },
    ],
  },
  {
    day: 'Saturday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Veggie frittata (3 eggs, peppers, onion, mushroom)', '1 cup berries'],
        kcal: 370,
      },
      {
        meal: 'Lunch',
        foods: ['Large tossed salad, 140g grilled chicken, balsamic', '10 whole grain crackers'],
        kcal: 450,
      },
      { meal: 'Snack', foods: ['150g plain low-fat Greek yogurt', '1 tsp honey'], kcal: 130 },
      {
        meal: 'Dinner',
        foods: [
          '180g baked chicken breast',
          '1 cup roasted Brussels sprouts',
          '½ cup cauliflower rice',
        ],
        kcal: 400,
      },
      { meal: 'Evening', foods: ['1 cup skim milk'], kcal: 90 },
    ],
  },
  {
    day: 'Sunday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Whole grain banana pancakes (3 small)', '½ cup berries'],
        kcal: 390,
      },
      {
        meal: 'Lunch',
        foods: [
          'Turkey & vegetable soup (150g turkey, carrots, celery, zucchini)',
          '1 slice sourdough',
        ],
        kcal: 400,
      },
      { meal: 'Snack', foods: ['Celery + 1 tbsp PB', '1 apple'], kcal: 170 },
      {
        meal: 'Dinner',
        foods: [
          '180g cod with lemon & herbs',
          '2 cups steamed broccoli & cauliflower',
          '½ cup lentils',
        ],
        kcal: 410,
      },
      { meal: 'Evening', foods: ['20g casein protein shake'], kcal: 80 },
    ],
  },
];
const FL_W2: WeekDay[] = [
  {
    day: 'Monday',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Egg white scramble (4 whites, 1 yolk)',
          'Grilled tomatoes',
          '1 slice rye toast',
          'Black coffee',
        ],
        kcal: 300,
      },
      {
        meal: 'Lunch',
        foods: ['150g grilled chicken breast', '1.5 cups vegetable minestrone soup', 'Side salad'],
        kcal: 410,
      },
      { meal: 'Snack', foods: ['Celery sticks with 2 tbsp hummus', '1 small orange'], kcal: 120 },
      {
        meal: 'Dinner',
        foods: ['180g baked cod', '1 cup steamed asparagus', '½ cup barley'],
        kcal: 420,
      },
      { meal: 'Evening', foods: ['20g casein protein', 'Chamomile tea'], kcal: 90 },
    ],
  },
  {
    day: 'Tuesday',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '½ cup oatmeal with cinnamon',
          '1 tbsp flaxseed',
          '1 scoop protein powder',
          '½ cup berries',
        ],
        kcal: 360,
      },
      {
        meal: 'Lunch',
        foods: [
          '150g sardines on 2 rye crackers',
          'Large tomato & cucumber salad',
          '1 lemon wedge',
        ],
        kcal: 380,
      },
      { meal: 'Snack', foods: ['100g skyr', '½ cup sliced strawberries'], kcal: 120 },
      {
        meal: 'Dinner',
        foods: ['150g turkey mince stuffed peppers (2)', '½ cup brown rice', 'Side salad'],
        kcal: 440,
      },
      { meal: 'Evening', foods: ['1 cup warm skim milk', '5 pistachios'], kcal: 130 },
    ],
  },
  {
    day: 'Wednesday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Green smoothie (spinach, cucumber, green apple, 30g protein, almond milk)'],
        kcal: 320,
      },
      {
        meal: 'Lunch',
        foods: [
          '150g prawn & avocado (¼) salad',
          'Mixed leaves, lemon vinaigrette',
          '1 slice whole wheat bread',
        ],
        kcal: 400,
      },
      {
        meal: 'Snack',
        foods: ['1 hard-boiled egg', '1 cup cherry tomatoes', '5 olives'],
        kcal: 120,
      },
      {
        meal: 'Dinner',
        foods: ['180g baked tilapia', '1 cup roasted cauliflower', '½ cup quinoa'],
        kcal: 430,
      },
      { meal: 'Evening', foods: ['20g whey protein', 'Herbal tea'], kcal: 90 },
    ],
  },
  {
    day: 'Thursday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Chia pudding (3 tbsp chia, almond milk, 20g protein, berries)'],
        kcal: 340,
      },
      {
        meal: 'Lunch',
        foods: ['150g chicken & spinach wrap (whole wheat, no sauce, mustard)', '1 apple'],
        kcal: 420,
      },
      { meal: 'Snack', foods: ['100g cottage cheese', '5 walnut halves'], kcal: 150 },
      {
        meal: 'Dinner',
        foods: [
          '180g grilled swordfish',
          '½ cup bulgur wheat',
          '2 cups grilled courgette & peppers',
        ],
        kcal: 440,
      },
      { meal: 'Evening', foods: ['Herbal tea'], kcal: 0 },
    ],
  },
  {
    day: 'Friday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['2 eggs poached', 'Wilted spinach (1 cup)', '1 slice sourdough', 'Black coffee'],
        kcal: 310,
      },
      {
        meal: 'Lunch',
        foods: [
          'Nicoise-inspired salad (150g tuna, boiled egg, green beans, olives, cherry tomato)',
        ],
        kcal: 410,
      },
      {
        meal: 'Snack',
        foods: ['1 rice cake', '1 tbsp almond butter', '½ cup blueberries'],
        kcal: 160,
      },
      {
        meal: 'Dinner',
        foods: [
          '150g grilled chicken thigh (skinless)',
          '1 cup roasted broccoli & cauliflower',
          '½ cup sweet potato',
        ],
        kcal: 430,
      },
      { meal: 'Evening', foods: ['20g casein protein shake'], kcal: 90 },
    ],
  },
  {
    day: 'Saturday',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '3 scrambled egg whites + 1 whole egg',
          'Smoked salmon 50g',
          '1 slice rye toast',
          '½ avocado',
        ],
        kcal: 370,
      },
      {
        meal: 'Lunch',
        foods: ['150g chicken & kale salad (lemon tahini dressing)', '½ cup chickpeas', '1 pitta'],
        kcal: 430,
      },
      { meal: 'Snack', foods: ['100g Greek yogurt', '5 almonds', '1 kiwi'], kcal: 140 },
      {
        meal: 'Dinner',
        foods: ['180g baked salmon', '1 cup roasted asparagus & mushrooms', '½ cup wild rice'],
        kcal: 450,
      },
      { meal: 'Evening', foods: ['1 cup herbal tea', '5 walnuts'], kcal: 50 },
    ],
  },
  {
    day: 'Sunday',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Veggie omelette (3 eggs, spinach, mushroom, tomato, no cheese)',
          '1 slice whole grain toast',
        ],
        kcal: 350,
      },
      {
        meal: 'Lunch',
        foods: ['150g chicken & vegetable broth soup (carrots, celery, zucchini, barley ¼ cup)'],
        kcal: 370,
      },
      { meal: 'Snack', foods: ['1 apple', '1 tbsp nut butter'], kcal: 160 },
      {
        meal: 'Dinner',
        foods: ['180g grilled halibut', '1 cup roasted Brussels sprouts', '½ cup lentils'],
        kcal: 420,
      },
      { meal: 'Evening', foods: ['20g casein protein'], kcal: 90 },
    ],
  },
];
const FL_W3: WeekDay[] = FL_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('150g', '155g').replace('180g', '185g')),
  })),
}));
const FL_W4: WeekDay[] = FL_W2.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('150g', '155g').replace('180g', '185g')),
  })),
}));
const FL_W5: WeekDay[] = FL_W1.map((d) => ({
  ...d,
  day: `Week 5 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.97) })),
}));
const FL_W6: WeekDay[] = FL_W2.map((d) => ({
  ...d,
  day: `Week 6 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.97) })),
}));
const FL_W7: WeekDay[] = FL_W3.map((d) => ({ ...d, day: `Week 7 · ${d.day}` }));
const FL_W8: WeekDay[] = FL_W4.map((d) => ({ ...d, day: `Week 8 · ${d.day}` }));
const FL_W9: WeekDay[] = FL_W1.map((d) => ({
  ...d,
  day: `Week 9 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.95) })),
}));
const FL_W10: WeekDay[] = FL_W2.map((d) => ({
  ...d,
  day: `Week 10 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.95) })),
}));
const FL_W11: WeekDay[] = FL_W3.map((d) => ({
  ...d,
  day: `Week 11 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.95) })),
}));
const FL_W12: WeekDay[] = FL_W4.map((d) => ({
  ...d,
  day: `Week 12 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.95) })),
}));

// ── Recomp: 12 weeks ──────────────────────────────────────────────────────────
const RC_W1: WeekDay[] = [
  {
    day: 'Monday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '1 cup oatmeal with protein powder',
          '1 banana',
          '2 boiled eggs',
          '1 tbsp almond butter',
        ],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: ['180g grilled chicken', '200g basmati rice', '1 cup steamed broccoli'],
        kcal: 640,
      },
      { meal: 'Pre-Workout', foods: ['1 banana', '30g whey protein'], kcal: 310 },
      {
        meal: 'Dinner',
        foods: [
          '180g lean beef sirloin',
          '1 cup mashed sweet potato',
          '1 cup green beans',
          '½ avocado',
        ],
        kcal: 650,
      },
    ],
  },
  {
    day: 'Tuesday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '3-egg omelet with peppers, onion, spinach',
          '2 slices whole grain toast',
          '1 orange',
        ],
        kcal: 540,
      },
      {
        meal: 'Lunch',
        foods: ['150g tuna with 200g quinoa', 'Cucumber, tomato, lemon', '1 cup edamame'],
        kcal: 620,
      },
      {
        meal: 'Pre-Workout',
        foods: ['200g protein yogurt + 15g protein', '1 rice cake'],
        kcal: 320,
      },
      {
        meal: 'Dinner',
        foods: ['180g salmon', '200g mixed roasted veg', '½ cup brown rice', '1 tbsp pesto'],
        kcal: 660,
      },
      { meal: 'Snack', foods: ['1 cup cottage cheese', '10 almonds'], kcal: 230 },
    ],
  },
  {
    day: 'Wednesday (Rest — Lower Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['4 scrambled eggs', '2 strips turkey bacon', 'Sautéed mushrooms & spinach'],
        kcal: 480,
      },
      {
        meal: 'Lunch',
        foods: ['Large chicken salad (180g chicken, romaine, avocado, feta 30g)'],
        kcal: 510,
      },
      { meal: 'Snack', foods: ['30g whey shake', '1 cup berries', '10 walnuts'], kcal: 290 },
      {
        meal: 'Dinner',
        foods: ['180g grilled shrimp', '2 cups roasted broccoli & cauliflower', '½ cup lentils'],
        kcal: 490,
      },
      { meal: 'Evening', foods: ['200g Greek yogurt', '1 tsp honey'], kcal: 160 },
    ],
  },
  {
    day: 'Thursday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Smoothie bowl (frozen banana, 30g protein, almond milk, berries, granola 30g)'],
        kcal: 550,
      },
      {
        meal: 'Lunch',
        foods: ['150g turkey taco bowl (black beans, rice, salsa, ¼ avocado, lime)'],
        kcal: 630,
      },
      { meal: 'Pre-Workout', foods: ['1 banana + 1 tbsp PB', 'Black coffee'], kcal: 300 },
      {
        meal: 'Dinner',
        foods: ['180g pork tenderloin', '200g sweet potato wedges', '1 cup asparagus'],
        kcal: 650,
      },
      { meal: 'Snack', foods: ['1 cup warm milk', '30g casein'], kcal: 240 },
    ],
  },
  {
    day: 'Friday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Egg white scramble (3 whites, 2 whole)', '1 cup oatmeal', '½ cup blueberries'],
        kcal: 520,
      },
      {
        meal: 'Lunch',
        foods: ['180g chicken wrap (whole wheat, lettuce, tomato, hummus)', '1 banana'],
        kcal: 610,
      },
      { meal: 'Pre-Workout', foods: ['30g whey protein shake', '2 dates'], kcal: 280 },
      {
        meal: 'Dinner',
        foods: ['180g baked cod', '1 cup quinoa', '2 cups roasted veg'],
        kcal: 630,
      },
      { meal: 'Snack', foods: ['200g cottage cheese', '½ cup pineapple'], kcal: 220 },
    ],
  },
  {
    day: 'Saturday (Active Recovery)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Protein pancakes (2 eggs, 1 banana, 30g protein)',
          '½ cup Greek yogurt',
          '1 cup berries',
        ],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: ['180g grilled salmon', '1 cup couscous', '1 cup roasted zucchini & peppers'],
        kcal: 640,
      },
      {
        meal: 'Snack',
        foods: ['Hummus (4 tbsp) + veggie sticks', '1 handful trail mix'],
        kcal: 280,
      },
      {
        meal: 'Dinner',
        foods: ['180g baked chicken thigh (skinless)', '1 cup brown rice', '2 cups green beans'],
        kcal: 620,
      },
      { meal: 'Evening', foods: ['30g casein shake', '1 cup warm almond milk'], kcal: 230 },
    ],
  },
  {
    day: 'Sunday (Rest — Lower Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['3 poached eggs', '½ avocado', '2 tomato slices', '1 whole grain toast'],
        kcal: 490,
      },
      {
        meal: 'Lunch',
        foods: ['Large Greek salad (cucumber, tomato, olives, feta, 150g grilled chicken)'],
        kcal: 500,
      },
      { meal: 'Snack', foods: ['30g whey protein', '10 macadamia nuts'], kcal: 280 },
      {
        meal: 'Dinner',
        foods: ['180g turkey mince bolognese (zucchini noodles)', '30g parmesan'],
        kcal: 530,
      },
      {
        meal: 'Evening',
        foods: ['200g cottage cheese', '5 walnut halves', '½ cup berries'],
        kcal: 240,
      },
    ],
  },
];
const RC_W2: WeekDay[] = RC_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('180g', '185g').replace('150g', '155g')),
  })),
}));
const RC_W3: WeekDay[] = RC_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('180g', '190g').replace('200g', '205g')),
  })),
}));
const RC_W4: WeekDay[] = RC_W2.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('185g', '195g')) })),
}));
const RC_W5: WeekDay[] = RC_W1.map((d) => ({ ...d, day: `Week 5 · ${d.day}` }));
const RC_W6: WeekDay[] = RC_W2.map((d) => ({ ...d, day: `Week 6 · ${d.day}` }));
const RC_W7: WeekDay[] = RC_W3.map((d) => ({ ...d, day: `Week 7 · ${d.day}` }));
const RC_W8: WeekDay[] = RC_W4.map((d) => ({ ...d, day: `Week 8 · ${d.day}` }));
const RC_W9: WeekDay[] = RC_W1.map((d) => ({
  ...d,
  day: `Week 9 · ${d.day}`,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('180g', '195g').replace('200g', '210g')),
  })),
}));
const RC_W10: WeekDay[] = RC_W2.map((d) => ({ ...d, day: `Week 10 · ${d.day}` }));
const RC_W11: WeekDay[] = RC_W3.map((d) => ({ ...d, day: `Week 11 · ${d.day}` }));
const RC_W12: WeekDay[] = RC_W4.map((d) => ({ ...d, day: `Week 12 · ${d.day}` }));

// ── Veg sanitiser — strips eggs, replaces with dairy/legume alternatives ──────
// Vegetarian (Indian definition) = no meat, no fish, NO eggs.
// Dairy (paneer, dahi, milk, cheese) and plant protein are fine.
const EGG_SUBS: Array<[RegExp, string]> = [
  [/4 eggs? scrambled/gi, '200g paneer bhurji (low-oil)'],
  [/3[\s-]egg white omelet[^\,]*/gi, 'Besan chilla (2, gram flour + spinach)'],
  [/3[\s-]egg omelet[^\,]*/gi, 'Moong dal chilla (2, with onion & coriander)'],
  [/3[\s-]egg omelette[^\,]*/gi, 'Paneer scramble (150g paneer, turmeric, peppers)'],
  [/veggie omelet[^\,]*/gi, 'Paneer & veg scramble (150g paneer, peppers, spinach)'],
  [/veggie omelette[^\,]*/gi, 'Tofu scramble (150g tofu, turmeric, veggies)'],
  [/veggie frittata[^\)]*\)/gi, 'Paneer frittata (150g paneer, peppers, onion, mushroom)'],
  [/protein pancakes[^\)]*\)/gi, 'Protein pancakes (pea protein, banana, oat milk)'],
  [/overnight oats[^\)]*\)/gi, 'Overnight oats (oats, soy yogurt, chia, berries)'],
  [/egg white scramble[^\)]*\)/gi, 'Tofu scramble (150g firm tofu, turmeric, spinach)'],
  [/shakshuka[^\)]*\)/gi, 'Masala paneer (150g paneer, tomato sauce, peppers)'],
  [/green shakshuka[^\)]*\)/gi, 'Green paneer (150g paneer, spinach, green peppers, feta)'],
  [/full english[^\)]*\)/gi, 'Idli (4) with sambar & coconut chutney'],
  [/breakfast burrito[^\)]*\)/gi, 'Veg burrito (paneer, peppers, beans, whole wheat wrap)'],
  [/full stack pancakes[^\)]*\)/gi, 'Pea protein pancakes (banana, oat milk, pea protein)'],
  [/smashed eggs on toast[^\)]*\)/gi, 'Smashed avo & paneer on toast (sourdough x2)'],
  [/cottage cheese pancakes[^\)]*\)/gi, 'Oat & banana pancakes (oats, banana, soy milk)'],
  [/egg muffins[^\)]*\)/gi, 'Paneer muffins (paneer, spinach, feta, oat base)'],
  [/korean egg rice bowl[^\)]*\)/gi, 'Korean tofu rice bowl (tofu, steamed rice, sesame, soy)'],
  [/congee[^\)]*\)/gi, 'Congee (rice porridge, tofu 100g, ginger, sesame oil)'],
  [/feta scramble[^\)]*\)/gi, 'Paneer scramble (paneer, feta 30g, olives, spinach)'],
  [/acai bowl[^\)]*\)/gi, 'Acai bowl (acai, granola, banana, berries, honey)'],
  [
    /tropical smoothie bowl[^\)]*\)/gi,
    'Tropical smoothie bowl (mango, pineapple, 30g pea protein, coconut milk, granola)',
  ],
  [
    /bircher muesli[^\)]*\)/gi,
    'Bircher muesli (1 cup oats, Greek yogurt, apple, cinnamon, almond milk)',
  ],
  [/smashed avo[^\,]*, poached eggs x[0-9]/gi, 'Smashed avo (2 slices sourdough, 1 avocado)'],
  [/[0-9]+ (poached|boiled|hard-boiled|scrambled) eggs?/gi, ''],
  [/[0-9]+ egg whites?(\s*\+\s*[0-9]+ (whole|yolk)s?)?/gi, ''],
  [
    /protein pancakes \([0-9]+ eggs[^\)]*\)/gi,
    'Pea protein pancakes (banana, oat milk, 30g pea protein)',
  ],
  [/\([0-9]+ eggs?[^\)]*\)/gi, '(paneer, tofu or legumes)'],
  [/[0-9]+ eggs?,?\s*/gi, ''],
  [/egg[s]?\s*(white[s]?|yolk[s]?)?\s*,?\s*/gi, ''],
  [/turkey bacon[^\,]*/gi, ''],
  [/,\s*,/g, ','],
  [/\(\s*,/g, '('],
  [/,\s*\)/g, ')'],
  [/\s{2,}/g, ' '],
];

const sanitizeVeg = (weeks: WeekDay[][]): WeekDay[][] =>
  weeks.map((week) =>
    week.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        foods: meal.foods
          .map((food) => {
            let f = food;
            for (const [pattern, replacement] of EGG_SUBS) {
              f = f.replace(pattern, replacement);
            }
            return f.trim().replace(/^,\s*/, '').replace(/,\s*$/, '');
          })
          .filter((f) => f.length > 0),
      })),
    }))
  );

// ── Vegetarian weeks (same structure, plant-based foods) ──────────────────────

const VEG_MG_W1: WeekDay[] = [
  {
    day: 'Monday (Push)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '4 whole eggs scrambled',
          '2 slices whole grain toast',
          '1 cup oatmeal with berries',
          '1 glass soy milk',
        ],
        kcal: 610,
      },
      {
        meal: 'Lunch',
        foods: ['200g paneer tikka', '200g brown rice', '1 cup broccoli stir-fry', '1 apple'],
        kcal: 680,
      },
      {
        meal: 'Pre-Workout',
        foods: ['1 banana', '30g pea protein shake', '2 rice cakes'],
        kcal: 340,
      },
      {
        meal: 'Dinner',
        foods: [
          '200g tofu steak (marinated)',
          '250g sweet potato',
          '2 cups mixed veg',
          '1 tbsp olive oil',
        ],
        kcal: 640,
      },
      {
        meal: 'Night Snack',
        foods: ['200g low-fat cottage cheese (paneer)', '1 tbsp almond butter', '10 almonds'],
        kcal: 290,
      },
    ],
  },
  {
    day: 'Tuesday (Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['200g Greek yogurt', '1 cup granola', '1 banana', '2 boiled eggs'],
        kcal: 610,
      },
      {
        meal: 'Lunch',
        foods: ['200g rajma (kidney bean curry)', '200g brown rice', '1 cup cucumber raita'],
        kcal: 680,
      },
      { meal: 'Pre-Workout', foods: ['1 cup chocolate soy milk', '1 slice PB toast'], kcal: 330 },
      {
        meal: 'Dinner',
        foods: ['200g dal makhani (low-fat)', '200g quinoa', '1 cup steamed green beans'],
        kcal: 640,
      },
      {
        meal: 'Night Snack',
        foods: ['30g casein/pea protein shake', '1 cup warm soy milk'],
        kcal: 300,
      },
    ],
  },
  {
    day: 'Wednesday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Protein pancakes (2 eggs + pea protein + banana)',
          '1 tbsp maple syrup',
          '1 cup berries',
        ],
        kcal: 570,
      },
      {
        meal: 'Lunch',
        foods: ['200g chana masala', '200g white rice', '1 cup edamame', '1 orange'],
        kcal: 640,
      },
      {
        meal: 'Pre-Workout',
        foods: ['2 rice cakes with hummus', '20g pea protein shake'],
        kcal: 370,
      },
      {
        meal: 'Dinner',
        foods: ['200g paneer bhurji (low-oil)', '200g whole wheat noodles', '2 cups mixed veg'],
        kcal: 680,
      },
      { meal: 'Night Snack', foods: ['200g cottage cheese', '½ cup pineapple chunks'], kcal: 300 },
    ],
  },
  {
    day: 'Thursday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['3-egg omelet with spinach, tomato & feta', '2 slices sourdough', '1 cup OJ'],
        kcal: 555,
      },
      {
        meal: 'Lunch',
        foods: ['Mixed veg & paneer wrap (whole wheat)', 'Green chutney, salad'],
        kcal: 630,
      },
      { meal: 'Snack', foods: ['Greek yogurt parfait with granola & honey', '1 apple'], kcal: 340 },
      {
        meal: 'Dinner',
        foods: ['200g palak paneer (low-fat)', '1 cup basmati rice', '2 cups salad'],
        kcal: 640,
      },
      { meal: 'Night Snack', foods: ['1 cup soy milk', '30g mixed nuts'], kcal: 390 },
    ],
  },
  {
    day: 'Friday (Push/Pull)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Overnight oats (1 cup oats, chia, almond milk, berries)', '2 hard-boiled eggs'],
        kcal: 580,
      },
      {
        meal: 'Lunch',
        foods: ['200g tofu & veg stir-fry', 'Soy sauce, ginger', '1 cup brown rice'],
        kcal: 660,
      },
      { meal: 'Pre-Workout', foods: ['Banana + PB toast', 'Black coffee'], kcal: 310 },
      {
        meal: 'Dinner',
        foods: ['200g paneer butter masala (low-fat)', '2 whole wheat rotis', '1 cup green beans'],
        kcal: 690,
      },
      { meal: 'Night Snack', foods: ['Pea protein pudding (30g)', '1 cup berries'], kcal: 300 },
    ],
  },
  {
    day: 'Saturday (Legs)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '4-egg veg scramble (peppers, mushroom, spinach)',
          '2 slices whole grain toast',
          'Large glass OJ',
        ],
        kcal: 590,
      },
      {
        meal: 'Lunch',
        foods: ['200g veg biryani (paneer, mixed veg, basmati)', '1 cup cucumber raita'],
        kcal: 700,
      },
      { meal: 'Pre-Workout', foods: ['30g pea protein bar (homemade)', '1 banana'], kcal: 390 },
      {
        meal: 'Dinner',
        foods: ['200g tofu scramble curry', '1 cup quinoa', '1 cup broccoli', '2 tbsp tahini'],
        kcal: 640,
      },
      {
        meal: 'Night Snack',
        foods: ['200g cottage cheese', '1 tbsp honey', '10 walnut halves'],
        kcal: 310,
      },
    ],
  },
  {
    day: 'Sunday (Rest)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Veggie omelette (3 eggs, peppers, mushroom)',
          'Whole grain pancakes (2)',
          '1 cup mixed fruit',
        ],
        kcal: 555,
      },
      {
        meal: 'Lunch',
        foods: ['Paneer & veg bowl (200g paneer, rice, black beans, salsa, avocado)'],
        kcal: 680,
      },
      { meal: 'Snack', foods: ['Apple + 2 tbsp almond butter', '1 cup soy milk'], kcal: 350 },
      {
        meal: 'Dinner',
        foods: ['200g baked paneer with herbs', '200g roasted potatoes', 'Steamed asparagus'],
        kcal: 630,
      },
      {
        meal: 'Night Snack',
        foods: ['Greek yogurt (200g)', 'Mixed berries', '1 tbsp granola'],
        kcal: 290,
      },
    ],
  },
];

const VEG_MG_W2: WeekDay[] = VEG_MG_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) =>
      f.replace('200g paneer', '210g paneer').replace('200g tofu', '210g tofu')
    ),
  })),
}));
const VEG_MG_W3: WeekDay[] = VEG_MG_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) =>
      f.replace('200g paneer', '215g paneer').replace('200g tofu', '215g tofu')
    ),
  })),
}));
const VEG_MG_W4: WeekDay[] = VEG_MG_W2.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('210g', '220g')) })),
}));
const VEG_MG_W5: WeekDay[] = VEG_MG_W1.map((d) => ({ ...d, day: `Week 5 · ${d.day}` }));
const VEG_MG_W6: WeekDay[] = VEG_MG_W2.map((d) => ({ ...d, day: `Week 6 · ${d.day}` }));
const VEG_MG_W7: WeekDay[] = VEG_MG_W3.map((d) => ({ ...d, day: `Week 7 · ${d.day}` }));
const VEG_MG_W8: WeekDay[] = VEG_MG_W4.map((d) => ({ ...d, day: `Week 8 · ${d.day}` }));
const VEG_MG_W9: WeekDay[] = VEG_MG_W1.map((d) => ({
  ...d,
  day: `Week 9 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('200g', '220g')) })),
}));
const VEG_MG_W10: WeekDay[] = VEG_MG_W2.map((d) => ({ ...d, day: `Week 10 · ${d.day}` }));
const VEG_MG_W11: WeekDay[] = VEG_MG_W3.map((d) => ({ ...d, day: `Week 11 · ${d.day}` }));
const VEG_MG_W12: WeekDay[] = VEG_MG_W4.map((d) => ({ ...d, day: `Week 12 · ${d.day}` }));

const VEG_FL_W1: WeekDay[] = [
  {
    day: 'Monday',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '3-egg white omelet with spinach & mushrooms',
          '1 slice whole grain toast',
          '1 cup green tea',
        ],
        kcal: 300,
      },
      {
        meal: 'Lunch',
        foods: [
          'Large salad (150g paneer, mixed greens, cucumber, tomato)',
          '2 tbsp lemon-olive oil dressing',
        ],
        kcal: 400,
      },
      { meal: 'Snack', foods: ['100g low-fat Greek yogurt', '½ cup berries'], kcal: 120 },
      {
        meal: 'Dinner',
        foods: ['200g baked tofu', '1 cup roasted broccoli', '½ cup brown rice'],
        kcal: 420,
      },
      { meal: 'Evening', foods: ['20g pea protein shake', 'Herbal tea'], kcal: 85 },
    ],
  },
  {
    day: 'Tuesday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Overnight oats (½ cup oats, chia, Greek yogurt, berries)'],
        kcal: 370,
      },
      {
        meal: 'Lunch',
        foods: ['Rajma salad (140g kidney beans, cucumber, onion, lemon, cumin)'],
        kcal: 340,
      },
      { meal: 'Snack', foods: ['2 rice cakes + 1 tbsp almond butter', '1 carrot'], kcal: 185 },
      {
        meal: 'Dinner',
        foods: ['150g paneer tikka (baked)', '2 cups steamed mixed veg', '½ cup quinoa'],
        kcal: 410,
      },
      { meal: 'Evening', foods: ['1 cup warm soy milk', '5 almonds'], kcal: 120 },
    ],
  },
  {
    day: 'Wednesday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['2 scrambled eggs', '1 cup sautéed spinach & tomato', '½ cup oatmeal'],
        kcal: 350,
      },
      {
        meal: 'Lunch',
        foods: ['Lentil soup (1.5 cups)', '1 slice whole wheat bread', 'Side salad'],
        kcal: 400,
      },
      { meal: 'Snack', foods: ['1 apple', '10 almonds'], kcal: 155 },
      {
        meal: 'Dinner',
        foods: ['200g grilled paneer', '2 cups asparagus', '½ cup sweet potato'],
        kcal: 440,
      },
      { meal: 'Evening', foods: ['20g pea protein shake'], kcal: 85 },
    ],
  },
  {
    day: 'Thursday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Green smoothie (spinach, banana, 30g pea protein, almond milk, flaxseed)'],
        kcal: 340,
      },
      {
        meal: 'Lunch',
        foods: ['Tofu stir-fry (150g tofu, bok choy, snap peas, soy sauce)', '½ cup brown rice'],
        kcal: 420,
      },
      { meal: 'Snack', foods: ['100g cottage cheese', '½ cup pineapple'], kcal: 125 },
      {
        meal: 'Dinner',
        foods: ['150g chana masala', '2 cups mixed greens', '1 slice whole wheat bread'],
        kcal: 430,
      },
      { meal: 'Evening', foods: ['Herbal tea', '5 walnuts'], kcal: 65 },
    ],
  },
  {
    day: 'Friday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['2 poached eggs on 1 slice whole grain toast', '½ avocado'],
        kcal: 310,
      },
      {
        meal: 'Lunch',
        foods: [
          'Mixed bean salad (kidney, chickpea, black bean, feta, lemon, herbs)',
          '1 whole wheat pitta',
        ],
        kcal: 410,
      },
      { meal: 'Snack', foods: ['1 low-fat string cheese', '1 orange'], kcal: 115 },
      {
        meal: 'Dinner',
        foods: ['180g marinated baked tofu', '2 cups zucchini noodles with tomato-basil sauce'],
        kcal: 370,
      },
      { meal: 'Evening', foods: ['20g pea protein shake'], kcal: 95 },
    ],
  },
  {
    day: 'Saturday',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Veggie frittata (3 eggs, peppers, onion, mushroom, low-fat cheese)',
          '1 cup berries',
        ],
        kcal: 360,
      },
      {
        meal: 'Lunch',
        foods: ['Large tossed salad, 140g paneer grilled, balsamic', '10 whole grain crackers'],
        kcal: 440,
      },
      { meal: 'Snack', foods: ['150g plain low-fat Greek yogurt', '1 tsp honey'], kcal: 125 },
      {
        meal: 'Dinner',
        foods: [
          '180g baked tofu steak',
          '1 cup roasted Brussels sprouts',
          '½ cup cauliflower rice',
        ],
        kcal: 390,
      },
      { meal: 'Evening', foods: ['1 cup warm soy milk'], kcal: 85 },
    ],
  },
  {
    day: 'Sunday',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Whole grain banana pancakes (3 small)', '½ cup berries', '1 tbsp Greek yogurt'],
        kcal: 380,
      },
      {
        meal: 'Lunch',
        foods: ['Veg & lentil soup (carrots, celery, zucchini, red lentils)', '1 slice sourdough'],
        kcal: 390,
      },
      { meal: 'Snack', foods: ['Celery + 1 tbsp PB', '1 apple'], kcal: 165 },
      {
        meal: 'Dinner',
        foods: [
          '180g paneer tikka (baked)',
          '2 cups steamed cauliflower & broccoli',
          '½ cup lentils',
        ],
        kcal: 400,
      },
      { meal: 'Evening', foods: ['20g pea protein shake'], kcal: 80 },
    ],
  },
];

const VEG_FL_W2: WeekDay[] = VEG_FL_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('150g', '155g').replace('180g', '185g')),
  })),
}));
const VEG_FL_W3: WeekDay[] = VEG_FL_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.98) })),
}));
const VEG_FL_W4: WeekDay[] = VEG_FL_W2.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.98) })),
}));
const VEG_FL_W5: WeekDay[] = VEG_FL_W1.map((d) => ({
  ...d,
  day: `Week 5 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.96) })),
}));
const VEG_FL_W6: WeekDay[] = VEG_FL_W2.map((d) => ({
  ...d,
  day: `Week 6 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.96) })),
}));
const VEG_FL_W7: WeekDay[] = VEG_FL_W3.map((d) => ({ ...d, day: `Week 7 · ${d.day}` }));
const VEG_FL_W8: WeekDay[] = VEG_FL_W4.map((d) => ({ ...d, day: `Week 8 · ${d.day}` }));
const VEG_FL_W9: WeekDay[] = VEG_FL_W1.map((d) => ({
  ...d,
  day: `Week 9 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.94) })),
}));
const VEG_FL_W10: WeekDay[] = VEG_FL_W2.map((d) => ({
  ...d,
  day: `Week 10 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.94) })),
}));
const VEG_FL_W11: WeekDay[] = VEG_FL_W3.map((d) => ({
  ...d,
  day: `Week 11 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.94) })),
}));
const VEG_FL_W12: WeekDay[] = VEG_FL_W4.map((d) => ({
  ...d,
  day: `Week 12 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * 0.94) })),
}));

const VEG_RC_W1: WeekDay[] = [
  {
    day: 'Monday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          '1 cup oatmeal with pea protein powder',
          '1 banana',
          '2 boiled eggs',
          '1 tbsp almond butter',
        ],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: ['180g paneer', '200g basmati rice', '1 cup steamed broccoli', 'Lemon & herbs'],
        kcal: 630,
      },
      { meal: 'Pre-Workout', foods: ['1 banana', '30g pea protein shake'], kcal: 300 },
      {
        meal: 'Dinner',
        foods: ['180g baked tofu', '1 cup mashed sweet potato', '1 cup green beans', '½ avocado'],
        kcal: 640,
      },
    ],
  },
  {
    day: 'Tuesday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['3-egg omelet (peppers, onion, spinach)', '2 slices whole grain toast', '1 orange'],
        kcal: 530,
      },
      {
        meal: 'Lunch',
        foods: ['150g tofu with 200g quinoa', 'Cucumber, tomato, lemon', '1 cup edamame'],
        kcal: 610,
      },
      {
        meal: 'Pre-Workout',
        foods: ['200g soy yogurt + 15g pea protein', '1 rice cake'],
        kcal: 310,
      },
      {
        meal: 'Dinner',
        foods: [
          '180g paneer tikka (baked)',
          '200g mixed roasted veg',
          '½ cup brown rice',
          '1 tbsp pesto',
        ],
        kcal: 650,
      },
      { meal: 'Snack', foods: ['1 cup cottage cheese', '10 almonds'], kcal: 220 },
    ],
  },
  {
    day: 'Wednesday (Rest — Lower Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['4 scrambled eggs', 'Sautéed mushrooms, spinach & tomato'],
        kcal: 460,
      },
      {
        meal: 'Lunch',
        foods: ['Large tofu salad (180g tofu, romaine, avocado, feta 30g)'],
        kcal: 500,
      },
      { meal: 'Snack', foods: ['30g pea protein shake', '1 cup berries', '10 walnuts'], kcal: 285 },
      {
        meal: 'Dinner',
        foods: [
          '180g paneer steak (grilled)',
          '2 cups roasted broccoli & cauliflower',
          '½ cup lentils',
        ],
        kcal: 480,
      },
      { meal: 'Evening', foods: ['200g Greek yogurt', '1 tsp honey'], kcal: 155 },
    ],
  },
  {
    day: 'Thursday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Smoothie bowl (frozen banana, 30g pea protein, oat milk, berries, granola)'],
        kcal: 540,
      },
      {
        meal: 'Lunch',
        foods: ['Tofu & veg taco bowl (black beans, rice, salsa, ¼ avocado, lime)'],
        kcal: 620,
      },
      { meal: 'Pre-Workout', foods: ['1 banana + 1 tbsp PB', 'Black coffee'], kcal: 290 },
      {
        meal: 'Dinner',
        foods: ['180g marinated tofu steak', '200g sweet potato wedges', '1 cup asparagus'],
        kcal: 640,
      },
      { meal: 'Snack', foods: ['1 cup warm soy milk', '30g pea protein'], kcal: 230 },
    ],
  },
  {
    day: 'Friday (Training — Higher Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['Egg white scramble (3 whites, 2 whole)', '1 cup oatmeal', '½ cup blueberries'],
        kcal: 510,
      },
      {
        meal: 'Lunch',
        foods: ['180g paneer wrap (whole wheat, lettuce, tomato, hummus)', '1 banana'],
        kcal: 600,
      },
      { meal: 'Pre-Workout', foods: ['30g pea protein shake', '2 dates'], kcal: 270 },
      {
        meal: 'Dinner',
        foods: ['180g baked tofu with herbs', '1 cup quinoa', '2 cups roasted veg'],
        kcal: 620,
      },
      { meal: 'Snack', foods: ['200g cottage cheese', '½ cup pineapple'], kcal: 215 },
    ],
  },
  {
    day: 'Saturday (Active Recovery)',
    meals: [
      {
        meal: 'Breakfast',
        foods: [
          'Protein pancakes (2 eggs, 1 banana, 30g pea protein)',
          '½ cup soy yogurt',
          '1 cup berries',
        ],
        kcal: 560,
      },
      {
        meal: 'Lunch',
        foods: ['180g grilled paneer', '1 cup couscous', '1 cup roasted zucchini & peppers'],
        kcal: 630,
      },
      {
        meal: 'Snack',
        foods: ['Hummus (4 tbsp) + veggie sticks', '1 handful trail mix (nuts & seeds)'],
        kcal: 275,
      },
      {
        meal: 'Dinner',
        foods: ['180g baked tofu tikka', '1 cup brown rice', '2 cups green beans'],
        kcal: 610,
      },
      { meal: 'Evening', foods: ['30g pea protein shake', '1 cup warm oat milk'], kcal: 225 },
    ],
  },
  {
    day: 'Sunday (Rest — Lower Carb)',
    meals: [
      {
        meal: 'Breakfast',
        foods: ['3 poached eggs', '½ avocado', '2 tomato slices', '1 whole grain toast'],
        kcal: 480,
      },
      {
        meal: 'Lunch',
        foods: ['Large Greek salad (cucumber, tomato, olives, feta, 150g grilled tofu)'],
        kcal: 490,
      },
      { meal: 'Snack', foods: ['30g pea protein shake', '10 macadamia nuts'], kcal: 270 },
      {
        meal: 'Dinner',
        foods: ['180g paneer in tomato sauce (marinara, zucchini noodles)', '30g parmesan'],
        kcal: 520,
      },
      {
        meal: 'Evening',
        foods: ['200g cottage cheese', '5 walnut halves', '½ cup berries'],
        kcal: 235,
      },
    ],
  },
];

const VEG_RC_W2: WeekDay[] = VEG_RC_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({
    ...m,
    foods: m.foods.map((f) => f.replace('180g', '185g').replace('150g', '155g')),
  })),
}));
const VEG_RC_W3: WeekDay[] = VEG_RC_W1.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('180g', '190g')) })),
}));
const VEG_RC_W4: WeekDay[] = VEG_RC_W2.map((d) => ({
  ...d,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('185g', '195g')) })),
}));
const VEG_RC_W5: WeekDay[] = VEG_RC_W1.map((d) => ({ ...d, day: `Week 5 · ${d.day}` }));
const VEG_RC_W6: WeekDay[] = VEG_RC_W2.map((d) => ({ ...d, day: `Week 6 · ${d.day}` }));
const VEG_RC_W7: WeekDay[] = VEG_RC_W3.map((d) => ({ ...d, day: `Week 7 · ${d.day}` }));
const VEG_RC_W8: WeekDay[] = VEG_RC_W4.map((d) => ({ ...d, day: `Week 8 · ${d.day}` }));
const VEG_RC_W9: WeekDay[] = VEG_RC_W1.map((d) => ({
  ...d,
  day: `Week 9 · ${d.day}`,
  meals: d.meals.map((m) => ({ ...m, foods: m.foods.map((f) => f.replace('180g', '195g')) })),
}));
const VEG_RC_W10: WeekDay[] = VEG_RC_W2.map((d) => ({ ...d, day: `Week 10 · ${d.day}` }));
const VEG_RC_W11: WeekDay[] = VEG_RC_W3.map((d) => ({ ...d, day: `Week 11 · ${d.day}` }));
const VEG_RC_W12: WeekDay[] = VEG_RC_W4.map((d) => ({ ...d, day: `Week 12 · ${d.day}` }));

// Mixed = even days use nonveg weeks, odd days use veg weeks (interleaved at day level)
function mixWeeks(nonveg: WeekDay[], veg: WeekDay[]): WeekDay[] {
  return nonveg.map((day, i) => (i % 2 === 0 ? day : (veg[i] ?? day)));
}

const VEG_MG_WEEKS = sanitizeVeg([
  VEG_MG_W1,
  VEG_MG_W2,
  VEG_MG_W3,
  VEG_MG_W4,
  VEG_MG_W5,
  VEG_MG_W6,
  VEG_MG_W7,
  VEG_MG_W8,
  VEG_MG_W9,
  VEG_MG_W10,
  VEG_MG_W11,
  VEG_MG_W12,
]);
const VEG_FL_WEEKS = sanitizeVeg([
  VEG_FL_W1,
  VEG_FL_W2,
  VEG_FL_W3,
  VEG_FL_W4,
  VEG_FL_W5,
  VEG_FL_W6,
  VEG_FL_W7,
  VEG_FL_W8,
  VEG_FL_W9,
  VEG_FL_W10,
  VEG_FL_W11,
  VEG_FL_W12,
]);
const VEG_RC_WEEKS = sanitizeVeg([
  VEG_RC_W1,
  VEG_RC_W2,
  VEG_RC_W3,
  VEG_RC_W4,
  VEG_RC_W5,
  VEG_RC_W6,
  VEG_RC_W7,
  VEG_RC_W8,
  VEG_RC_W9,
  VEG_RC_W10,
  VEG_RC_W11,
  VEG_RC_W12,
]);

/** Maps plan id → diet type → ordered array of 12 weeks */
const PLAN_ALL_WEEKS: Record<string, Record<string, WeekDay[][]>> = {
  muscle_gain: {
    nonveg: [MG_W1, MG_W2, MG_W3, MG_W4, MG_W5, MG_W6, MG_W7, MG_W8, MG_W9, MG_W10, MG_W11, MG_W12],
    veg: VEG_MG_WEEKS,
    mixed: [
      MG_W1,
      MG_W2,
      MG_W3,
      MG_W4,
      MG_W5,
      MG_W6,
      MG_W7,
      MG_W8,
      MG_W9,
      MG_W10,
      MG_W11,
      MG_W12,
    ].map((w, i) => mixWeeks(w, VEG_MG_WEEKS[i])),
  },
  fat_loss: {
    nonveg: [FL_W1, FL_W2, FL_W3, FL_W4, FL_W5, FL_W6, FL_W7, FL_W8, FL_W9, FL_W10, FL_W11, FL_W12],
    veg: VEG_FL_WEEKS,
    mixed: [
      FL_W1,
      FL_W2,
      FL_W3,
      FL_W4,
      FL_W5,
      FL_W6,
      FL_W7,
      FL_W8,
      FL_W9,
      FL_W10,
      FL_W11,
      FL_W12,
    ].map((w, i) => mixWeeks(w, VEG_FL_WEEKS[i])),
  },
  lean_body: {
    nonveg: [RC_W1, RC_W2, RC_W3, RC_W4, RC_W5, RC_W6, RC_W7, RC_W8, RC_W9, RC_W10, RC_W11, RC_W12],
    veg: VEG_RC_WEEKS,
    mixed: [
      RC_W1,
      RC_W2,
      RC_W3,
      RC_W4,
      RC_W5,
      RC_W6,
      RC_W7,
      RC_W8,
      RC_W9,
      RC_W10,
      RC_W11,
      RC_W12,
    ].map((w, i) => mixWeeks(w, VEG_RC_WEEKS[i])),
  },
};

const GOAL_PLANS: GoalPlan[] = [
  {
    id: 'muscle_gain',
    title: 'Muscle Gain',
    subtitle: 'Lean bulk — maximize hypertrophy',
    badge: '💪',
    color: '#3B82F6',
    rationale:
      'A 300–500 kcal surplus above TDEE with 1.6–2.2 g protein/kg/day maximizes muscle protein synthesis (MPS) while minimizing fat gain. This range is supported by the ISSN 2017 Position Stand and meta-analyses by Morton et al. (BJSM 2018).',
    sources: [
      'ISSN Position Stand: Protein and Exercise (2017)',
      'Morton et al. BJSM (2018)',
      'Stokes et al. Nutrients (2018)',
      'ACSM/AND/DC Joint Position Statement (2016)',
    ],
    calories: 2600,
    macros: { protein: 175, carbs: 310, fat: 72, fiber: 35 },
    rules: [
      'Eat 4–5 meals spaced 3–4 hours apart to maximize MPS',
      'Include 40–50 g protein per meal for optimal leucine threshold',
      'Time carbs around workouts (pre + post-training)',
      'Eat a casein-rich snack before bed (cottage cheese / Greek yogurt)',
      'Sleep 7–9 hours — growth hormone peaks during deep sleep',
    ],
    weekPlan: [
      {
        day: 'Monday (Push Day)',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              '4 eggs scrambled',
              '2 slices whole grain toast',
              '1 cup oatmeal with berries',
              '1 glass skim milk',
            ],
            kcal: 620,
          },
          {
            meal: 'Lunch',
            foods: [
              '200g grilled chicken breast',
              '200g brown rice',
              '1 cup broccoli with olive oil',
              '1 apple',
            ],
            kcal: 680,
          },
          {
            meal: 'Pre-Workout',
            foods: ['1 banana', '30g whey protein', '2 rice cakes'],
            kcal: 350,
          },
          {
            meal: 'Dinner',
            foods: [
              '200g salmon fillet',
              '250g sweet potato',
              '2 cups mixed vegetables',
              '1 tbsp olive oil',
            ],
            kcal: 660,
          },
          {
            meal: 'Night Snack',
            foods: ['200g low-fat cottage cheese', '1 tbsp almond butter', '10 almonds'],
            kcal: 290,
          },
        ],
      },
      {
        day: 'Tuesday (Pull Day)',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['200g Greek yogurt', '1 cup granola', '1 banana', '2 boiled eggs'],
            kcal: 610,
          },
          {
            meal: 'Lunch',
            foods: [
              '200g lean ground turkey wrap',
              'Lettuce, tomato, avocado',
              '1 cup lentil soup',
            ],
            kcal: 700,
          },
          {
            meal: 'Pre-Workout',
            foods: ['1 cup chocolate milk', '1 slice whole grain bread with peanut butter'],
            kcal: 340,
          },
          {
            meal: 'Dinner',
            foods: ['200g tuna steak', '200g quinoa', '1 cup asparagus', 'Side salad'],
            kcal: 650,
          },
          {
            meal: 'Night Snack',
            foods: ['30g casein protein shake', '1 cup warm milk'],
            kcal: 300,
          },
        ],
      },
      {
        day: 'Wednesday (Leg Day)',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              'Protein pancakes (2 eggs + 1 scoop protein + banana)',
              '1 tbsp maple syrup',
              '1 cup berries',
            ],
            kcal: 580,
          },
          {
            meal: 'Lunch',
            foods: ['150g grilled shrimp', '200g white rice', '1 cup edamame', '1 orange'],
            kcal: 620,
          },
          {
            meal: 'Pre-Workout',
            foods: ['2 rice cakes with hummus', '30g whey protein'],
            kcal: 380,
          },
          {
            meal: 'Dinner',
            foods: ['200g lean beef stir-fry', '200g noodles', '2 cups mixed veggies'],
            kcal: 700,
          },
          { meal: 'Night Snack', foods: ['200g cottage cheese', '½ cup pineapple'], kcal: 320 },
        ],
      },
      {
        day: 'Thursday (Rest)',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['3 egg omelet with spinach and feta', '2 slices sourdough toast', '1 cup OJ'],
            kcal: 560,
          },
          {
            meal: 'Lunch',
            foods: ['Chicken Caesar salad (150g chicken, romaine, parmesan)', 'Whole wheat pita'],
            kcal: 640,
          },
          {
            meal: 'Snack',
            foods: ['Greek yogurt parfait with granola and honey', '1 apple'],
            kcal: 350,
          },
          {
            meal: 'Dinner',
            foods: ['200g baked cod', '1 cup couscous', '2 cups roasted vegetables'],
            kcal: 650,
          },
          { meal: 'Night Snack', foods: ['1 cup low-fat milk', '30g mixed nuts'], kcal: 400 },
        ],
      },
      {
        day: 'Friday (Push/Pull)',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              'Overnight oats (1 cup oats, chia seeds, almond milk, berries)',
              '2 hard-boiled eggs',
            ],
            kcal: 590,
          },
          {
            meal: 'Lunch',
            foods: [
              '200g grilled chicken pita wrap',
              'Tzatziki, tomato, cucumber',
              '1 cup brown rice',
            ],
            kcal: 680,
          },
          {
            meal: 'Pre-Workout',
            foods: ['Banana + peanut butter toast', 'Black coffee'],
            kcal: 320,
          },
          {
            meal: 'Dinner',
            foods: [
              '200g pork tenderloin',
              '200g mashed sweet potato',
              '1 cup green beans',
              '½ avocado',
            ],
            kcal: 700,
          },
          {
            meal: 'Night Snack',
            foods: ['Chocolate casein pudding (30g casein)', '1 cup berries'],
            kcal: 310,
          },
        ],
      },
      {
        day: 'Saturday (Leg Day)',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['4-egg vegetable scramble', '2 slices whole grain toast', 'Large glass OJ'],
            kcal: 600,
          },
          {
            meal: 'Lunch',
            foods: [
              '200g beef burger (lean)',
              'Large sweet potato fries (baked)',
              '1 cup coleslaw',
            ],
            kcal: 720,
          },
          { meal: 'Pre-Workout', foods: ['Protein bar (≥20g protein)', '1 banana'], kcal: 400 },
          {
            meal: 'Dinner',
            foods: ['200g salmon', '1 cup quinoa', '1 cup broccoli', '2 tbsp tahini dressing'],
            kcal: 660,
          },
          {
            meal: 'Night Snack',
            foods: ['200g cottage cheese', '1 tbsp honey', '10 walnut halves'],
            kcal: 320,
          },
        ],
      },
      {
        day: 'Sunday (Rest)',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['Veggie omelette (3 eggs)', 'Whole grain pancakes (2)', '1 cup mixed fruit'],
            kcal: 560,
          },
          {
            meal: 'Lunch',
            foods: ['Grilled chicken rice bowl (150g chicken, rice, black beans, salsa, avocado)'],
            kcal: 680,
          },
          { meal: 'Snack', foods: ['Apple + 2 tbsp almond butter', '1 cup skim milk'], kcal: 360 },
          {
            meal: 'Dinner',
            foods: ['200g turkey breast', '200g roasted potatoes', 'Steamed asparagus'],
            kcal: 640,
          },
          {
            meal: 'Night Snack',
            foods: ['Greek yogurt (200g)', 'Mixed berries', '1 tbsp granola'],
            kcal: 300,
          },
        ],
      },
    ],
    disclaimer:
      'Based on ISSN 2017 evidence-based guidelines. Individual needs vary. Consult a registered dietitian before starting.',
    nextWeekPlan: [],
    currentWeek: 1,
    totalWeeks: 4,
    daysUntilNextWeek: 7,
  },
  {
    id: 'fat_loss',
    title: 'Fat Loss',
    subtitle: 'Caloric deficit — preserve lean mass',
    badge: '🔥',
    color: '#EF4444',
    rationale:
      'A 400–600 kcal deficit with high protein (1.8–2.4 g/kg/day) protects lean muscle while mobilizing fat stores. High-fiber, low-glycemic carbs improve satiety and prevent energy crashes.',
    sources: [
      'Helms et al. JISSN (2014)',
      'ACSM Position Stand: Weight Loss (2021)',
      'Sacks et al. NEJM (2009)',
      'Dietary Guidelines for Americans 2020–2025',
    ],
    calories: 1750,
    macros: { protein: 160, carbs: 160, fat: 58, fiber: 40 },
    rules: [
      'Maintain a 400–600 kcal daily deficit',
      'Prioritize protein at every meal to preserve muscle',
      'Choose high-volume, low-calorie vegetables',
      'Avoid liquid calories',
      'Perform 150–300 min moderate cardio per week',
      'Goal: 0.5–1 kg weight loss per week maximum',
    ],
    weekPlan: [
      {
        day: 'Monday',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              '3-egg white omelet with spinach & mushrooms',
              '1 slice whole grain toast',
              '1 cup black coffee',
            ],
            kcal: 320,
          },
          {
            meal: 'Lunch',
            foods: [
              'Large chicken salad (150g grilled chicken, mixed greens)',
              '2 tbsp olive oil & lemon',
              '1 small apple',
            ],
            kcal: 420,
          },
          { meal: 'Snack', foods: ['100g low-fat Greek yogurt', '½ cup berries'], kcal: 130 },
          {
            meal: 'Dinner',
            foods: ['180g baked white fish', '1 cup roasted broccoli', '½ cup brown rice'],
            kcal: 430,
          },
          { meal: 'Evening', foods: ['20g casein protein shake', 'Herbal tea'], kcal: 90 },
        ],
      },
      {
        day: 'Tuesday',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['Overnight oats (½ cup oats, chia seeds, 150g Greek yogurt, berries)'],
            kcal: 380,
          },
          {
            meal: 'Lunch',
            foods: ['Tuna lettuce wraps (140g canned tuna, romaine, avocado ¼, mustard)'],
            kcal: 350,
          },
          {
            meal: 'Snack',
            foods: ['2 rice cakes + 1 tbsp almond butter', '1 medium carrot'],
            kcal: 190,
          },
          {
            meal: 'Dinner',
            foods: ['150g turkey breast', '2 cups steamed mixed vegetables', '½ cup quinoa'],
            kcal: 420,
          },
          { meal: 'Evening', foods: ['1 cup warm skim milk', '5 almonds'], kcal: 130 },
        ],
      },
      {
        day: 'Wednesday',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['2 scrambled eggs', '1 cup sautéed spinach & tomato', '½ cup oatmeal'],
            kcal: 360,
          },
          {
            meal: 'Lunch',
            foods: ['Lentil soup (1.5 cups)', '2 oz whole wheat pita', 'Side salad'],
            kcal: 410,
          },
          { meal: 'Snack', foods: ['1 medium apple', '10 almonds'], kcal: 160 },
          {
            meal: 'Dinner',
            foods: ['180g grilled salmon', '2 cups asparagus', '½ cup sweet potato'],
            kcal: 460,
          },
          { meal: 'Evening', foods: ['Protein shake (20g)'], kcal: 90 },
        ],
      },
      {
        day: 'Thursday',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              'Smoothie: almond milk, 1 banana, 30g protein, 1 cup spinach, ½ cup frozen berries',
            ],
            kcal: 350,
          },
          {
            meal: 'Lunch',
            foods: ['Chicken stir-fry (150g chicken, bok choy, snap peas)', '½ cup brown rice'],
            kcal: 430,
          },
          { meal: 'Snack', foods: ['100g cottage cheese', '½ cup pineapple'], kcal: 130 },
          {
            meal: 'Dinner',
            foods: ['150g lean ground turkey taco bowl (lettuce, salsa, ¼ avocado, beans)'],
            kcal: 450,
          },
          { meal: 'Evening', foods: ['Herbal tea', '5 walnuts'], kcal: 70 },
        ],
      },
      {
        day: 'Friday',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['2 poached eggs on 1 slice whole grain toast', '1 sliced tomato'],
            kcal: 300,
          },
          {
            meal: 'Lunch',
            foods: [
              'Mixed bean salad (kidney, chickpea, black bean)',
              'Feta 30g, lemon, herbs',
              '1 whole grain pita',
            ],
            kcal: 420,
          },
          { meal: 'Snack', foods: ['1 low-fat string cheese', '1 small orange'], kcal: 120 },
          {
            meal: 'Dinner',
            foods: ['180g grilled shrimp', '2 cups zucchini noodles with tomato sauce'],
            kcal: 380,
          },
          { meal: 'Evening', foods: ['20g protein shake', '1 cup chamomile tea'], kcal: 100 },
        ],
      },
      {
        day: 'Saturday',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['Veggie frittata (3 eggs, peppers, onion, mushroom)', '1 cup berries'],
            kcal: 370,
          },
          {
            meal: 'Lunch',
            foods: [
              'Large tossed salad with 140g grilled chicken',
              'Balsamic vinegar & olive oil',
              '10 whole grain crackers',
            ],
            kcal: 450,
          },
          { meal: 'Snack', foods: ['Greek yogurt 150g plain', '1 tsp honey'], kcal: 130 },
          {
            meal: 'Dinner',
            foods: [
              '180g baked chicken breast',
              '1 cup roasted Brussels sprouts',
              '½ cup cauliflower rice',
            ],
            kcal: 400,
          },
          { meal: 'Evening', foods: ['1 cup warm skim milk'], kcal: 90 },
        ],
      },
      {
        day: 'Sunday',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['Whole grain banana pancakes (3 small)', '½ cup berries'],
            kcal: 390,
          },
          {
            meal: 'Lunch',
            foods: [
              'Turkey & vegetable soup (150g turkey, carrots, celery, zucchini)',
              '1 slice sourdough',
            ],
            kcal: 400,
          },
          {
            meal: 'Snack',
            foods: ['1 celery stalk + 1 tbsp peanut butter', '1 small apple'],
            kcal: 170,
          },
          {
            meal: 'Dinner',
            foods: [
              '180g cod with lemon & herbs',
              '2 cups steamed broccoli & cauliflower',
              '½ cup lentils',
            ],
            kcal: 410,
          },
          { meal: 'Evening', foods: ['20g casein protein shake'], kcal: 80 },
        ],
      },
    ],
    disclaimer:
      'Creates a caloric deficit for safe, sustainable fat loss (0.5–1 kg/week). Not recommended below 1,200 kcal/day without medical supervision.',
    nextWeekPlan: [],
    currentWeek: 1,
    totalWeeks: 4,
    daysUntilNextWeek: 7,
  },
  {
    id: 'lean_body',
    title: 'Lean Body (Recomp)',
    subtitle: 'Lose fat + gain muscle simultaneously',
    badge: '⚡',
    color: '#8B5CF6',
    rationale:
      'Body recomposition is achievable with maintenance calories and very high protein (2.0–2.4 g/kg/day), supporting simultaneous fat loss and muscle gain. Evidence from Barakat et al. (2020) and Longland et al. (AJCN 2016).',
    sources: [
      'Barakat et al. S&CJ (2020)',
      'Longland et al. AJCN (2016)',
      'Antonio & Ellerbroek (2016)',
      'ISSN Position Stand (2017)',
    ],
    calories: 2100,
    macros: { protein: 185, carbs: 220, fat: 62, fiber: 38 },
    rules: [
      'Eat at maintenance calories — small swings (+100 training, -100 rest)',
      'Distribute 35–50 g protein every 3–4 hours',
      'Cycle carbs: higher on training days, lower on rest days',
      'Resistance train 4x per week minimum',
      'Prioritize 8 hours sleep — optimizes GH release and cortisol',
      'Track for 4–6 weeks before judging results',
    ],
    weekPlan: [
      {
        day: 'Monday (Training — Higher Carb)',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              '1 cup oatmeal with protein powder',
              '1 banana',
              '2 boiled eggs',
              '1 tbsp almond butter',
            ],
            kcal: 570,
          },
          {
            meal: 'Lunch',
            foods: ['180g grilled chicken breast', '200g basmati rice', '1 cup steamed broccoli'],
            kcal: 640,
          },
          { meal: 'Pre-Workout', foods: ['1 banana', '30g whey protein shake'], kcal: 310 },
          {
            meal: 'Dinner',
            foods: [
              '180g lean beef sirloin',
              '1 cup mashed sweet potato',
              '1 cup green beans',
              '½ avocado',
            ],
            kcal: 650,
          },
        ],
      },
      {
        day: 'Tuesday (Training — Higher Carb)',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              '3-egg omelet with peppers, onion, spinach',
              '2 slices whole grain toast',
              '1 orange',
            ],
            kcal: 540,
          },
          {
            meal: 'Lunch',
            foods: [
              '150g tuna with 200g quinoa',
              'Cucumber, tomato, lemon dressing',
              '1 cup edamame',
            ],
            kcal: 620,
          },
          {
            meal: 'Pre-Workout',
            foods: ['Protein yogurt (200g Greek + 15g protein)', '1 rice cake'],
            kcal: 320,
          },
          {
            meal: 'Dinner',
            foods: [
              '180g salmon',
              '200g mixed roasted vegetables',
              '½ cup brown rice',
              '1 tbsp pesto',
            ],
            kcal: 660,
          },
          { meal: 'Snack', foods: ['1 cup low-fat cottage cheese', '10 almonds'], kcal: 230 },
        ],
      },
      {
        day: 'Wednesday (Rest — Lower Carb)',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['4 scrambled eggs', '2 strips turkey bacon', 'Sautéed mushrooms & spinach'],
            kcal: 480,
          },
          {
            meal: 'Lunch',
            foods: ['Large chicken salad (180g chicken, romaine, avocado, feta 30g)'],
            kcal: 510,
          },
          {
            meal: 'Snack',
            foods: ['30g whey protein shake', '1 cup berries', '10 walnuts'],
            kcal: 290,
          },
          {
            meal: 'Dinner',
            foods: [
              '180g grilled shrimp',
              '2 cups roasted broccoli & cauliflower',
              '½ cup lentils',
            ],
            kcal: 490,
          },
          { meal: 'Evening', foods: ['200g Greek yogurt', '1 tsp honey'], kcal: 160 },
        ],
      },
      {
        day: 'Thursday (Training — Higher Carb)',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['Smoothie bowl: frozen banana, 30g protein, almond milk, berries, granola 30g'],
            kcal: 550,
          },
          {
            meal: 'Lunch',
            foods: ['150g ground turkey taco bowl (black beans, rice, salsa, ¼ avocado, lime)'],
            kcal: 630,
          },
          {
            meal: 'Pre-Workout',
            foods: ['1 banana + 1 tbsp peanut butter', 'Black coffee'],
            kcal: 300,
          },
          {
            meal: 'Dinner',
            foods: ['180g pork tenderloin', '200g sweet potato wedges', '1 cup asparagus'],
            kcal: 650,
          },
          { meal: 'Snack', foods: ['1 cup warm milk', '30g casein protein'], kcal: 240 },
        ],
      },
      {
        day: 'Friday (Training — Higher Carb)',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              'Egg white + whole egg scramble (3 whites, 2 whole)',
              '1 cup oatmeal',
              '½ cup blueberries',
            ],
            kcal: 520,
          },
          {
            meal: 'Lunch',
            foods: [
              '180g grilled chicken wrap (whole wheat, lettuce, tomato, hummus)',
              '1 small banana',
            ],
            kcal: 610,
          },
          { meal: 'Pre-Workout', foods: ['Protein shake (30g)', '2 dates'], kcal: 280 },
          {
            meal: 'Dinner',
            foods: ['180g baked cod', '1 cup quinoa', '2 cups roasted vegetables'],
            kcal: 630,
          },
          { meal: 'Snack', foods: ['Cottage cheese 200g', 'Pineapple chunks ½ cup'], kcal: 220 },
        ],
      },
      {
        day: 'Saturday (Active Recovery)',
        meals: [
          {
            meal: 'Breakfast',
            foods: [
              'Protein pancakes (2 eggs, 1 banana, 30g protein)',
              '½ cup Greek yogurt',
              '1 cup berries',
            ],
            kcal: 570,
          },
          {
            meal: 'Lunch',
            foods: ['180g grilled salmon', '1 cup couscous', '1 cup roasted zucchini & peppers'],
            kcal: 640,
          },
          {
            meal: 'Snack',
            foods: ['Hummus (4 tbsp) + veggie sticks', '1 handful trail mix'],
            kcal: 280,
          },
          {
            meal: 'Dinner',
            foods: [
              '180g baked chicken thigh (skinless)',
              '1 cup brown rice',
              '2 cups green beans',
            ],
            kcal: 620,
          },
          { meal: 'Evening', foods: ['30g casein shake', '1 cup warm almond milk'], kcal: 230 },
        ],
      },
      {
        day: 'Sunday (Rest — Lower Carb)',
        meals: [
          {
            meal: 'Breakfast',
            foods: ['3 poached eggs', 'Avocado ½', '2 tomato slices', '1 whole grain toast'],
            kcal: 490,
          },
          {
            meal: 'Lunch',
            foods: ['Large Greek salad (cucumber, tomato, olives, feta, 150g grilled chicken)'],
            kcal: 500,
          },
          { meal: 'Snack', foods: ['Protein shake (30g)', '10 macadamia nuts'], kcal: 280 },
          {
            meal: 'Dinner',
            foods: ['180g lean turkey mince bolognese (zucchini noodles)', '30g parmesan'],
            kcal: 530,
          },
          {
            meal: 'Evening',
            foods: ['200g cottage cheese', '5 walnut halves', '½ cup berries'],
            kcal: 240,
          },
        ],
      },
    ],
    disclaimer:
      'Recomposition requires patience — allow 8–12 weeks. Individual responses vary. Always consult a registered dietitian before starting.',
    nextWeekPlan: [],
    currentWeek: 1,
    totalWeeks: 4,
    daysUntilNextWeek: 7,
  },
];
