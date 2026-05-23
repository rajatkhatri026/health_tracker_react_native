import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeals } from '../../hooks/useMeals';
import { COLORS, RADIUS } from '../../utils/theme';
import { MealPlannerSkeleton } from '../../components/Skeleton/Skeleton';
import RingProgress from '../../components/RingProgress/RingProgress';
import type { MealEntry } from '../../api/local';
import { searchFood, getGoalPlans, type FoodResult, type GoalPlan } from '../../api/nutrition';
import PaywallModal, {
  type PlanId,
  type SubscriptionType,
} from '../../components/PaywallModal/PaywallModal';
import PaymentModal, { type PaymentPlan } from '../../components/PaymentModal/PaymentModal';
import { exportPlanAsPdf } from '../../utils/exportPdf';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';

const { width } = Dimensions.get('window');

// ── Constants ──────────────────────────────────────────────────────────────────

const MACRO_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

const MACRO_CONFIG = [
  {
    key: 'protein' as const,
    label: 'Protein',
    unit: 'g',
    color: '#3B82F6',
    colorEnd: '#06B6D4',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    track: '#DBEAFE',
  },
  {
    key: 'carbs' as const,
    label: 'Carbs',
    unit: 'g',
    color: '#10B981',
    colorEnd: '#84CC16',
    bg: '#F0FDF4',
    border: '#A7F3D0',
    track: '#D1FAE5',
  },
  {
    key: 'fat' as const,
    label: 'Fat',
    unit: 'g',
    color: '#EC4899',
    colorEnd: '#F59E0B',
    bg: '#FDF2F8',
    border: '#FBCFE8',
    track: '#FCE7F3',
  },
];

const MEAL_TYPES: {
  key: MealEntry['category'];
  label: string;
  emoji: string;
  time: string;
  color: string;
  bg: string;
}[] = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    emoji: '🌅',
    time: '7:00 – 9:00 AM',
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    emoji: '☀️',
    time: '12:00 – 2:00 PM',
    color: '#10B981',
    bg: '#F0FDF4',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    emoji: '🌙',
    time: '6:00 – 8:00 PM',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  { key: 'snack', label: 'Snacks', emoji: '🍎', time: 'Any time', color: '#EC4899', bg: '#FDF2F8' },
];

const QUICK_FOODS = [
  {
    name: 'Oatmeal',
    emoji: '🥣',
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    category: 'breakfast' as MealEntry['category'],
  },
  {
    name: 'Boiled Eggs (2)',
    emoji: '🥚',
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
    category: 'breakfast' as MealEntry['category'],
  },
  {
    name: 'Banana',
    emoji: '🍌',
    calories: 90,
    protein: 1,
    carbs: 23,
    fat: 0,
    category: 'snack' as MealEntry['category'],
  },
  {
    name: 'Grilled Chicken',
    emoji: '🍗',
    calories: 240,
    protein: 40,
    carbs: 0,
    fat: 8,
    category: 'lunch' as MealEntry['category'],
  },
  {
    name: 'Brown Rice',
    emoji: '🍚',
    calories: 210,
    protein: 4,
    carbs: 44,
    fat: 2,
    category: 'lunch' as MealEntry['category'],
  },
  {
    name: 'Salmon',
    emoji: '🐟',
    calories: 280,
    protein: 36,
    carbs: 0,
    fat: 14,
    category: 'dinner' as MealEntry['category'],
  },
  {
    name: 'Greek Yogurt',
    emoji: '🥛',
    calories: 100,
    protein: 17,
    carbs: 6,
    fat: 0,
    category: 'snack' as MealEntry['category'],
  },
  {
    name: 'Almonds (30g)',
    emoji: '🥜',
    calories: 170,
    protein: 6,
    carbs: 6,
    fat: 15,
    category: 'snack' as MealEntry['category'],
  },
  {
    name: 'Avocado Toast',
    emoji: '🥑',
    calories: 290,
    protein: 7,
    carbs: 30,
    fat: 16,
    category: 'breakfast' as MealEntry['category'],
  },
  {
    name: 'Caesar Salad',
    emoji: '🥗',
    calories: 200,
    protein: 8,
    carbs: 12,
    fat: 14,
    category: 'lunch' as MealEntry['category'],
  },
  {
    name: 'Pasta',
    emoji: '🍝',
    calories: 350,
    protein: 12,
    carbs: 65,
    fat: 6,
    category: 'dinner' as MealEntry['category'],
  },
  {
    name: 'Apple',
    emoji: '🍎',
    calories: 80,
    protein: 0,
    carbs: 21,
    fat: 0,
    category: 'snack' as MealEntry['category'],
  },
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayIdx = new Date().getDay();

// ── Nutrient Detail Panel ──────────────────────────────────────────────────────

const NutrientPanel: React.FC<{
  food: FoodResult;
  category: MealEntry['category'];
  onAdd: (m: Omit<MealEntry, 'id' | 'loggedAt'>) => void;
  onBack: () => void;
}> = ({ food, category, onAdd, onBack }) => {
  const [serving, setServing] = useState('100');
  const g = parseFloat(serving) || 100;
  const scale = g / 100;

  const n = food.nutrients;
  const cal = Math.round((n.calories ?? 0) * scale);
  const prot = Math.round((n.protein ?? 0) * scale * 10) / 10;
  const carb = Math.round((n.carbs ?? 0) * scale * 10) / 10;
  const fat = Math.round((n.fat ?? 0) * scale * 10) / 10;
  const fiber = Math.round((n.fiber ?? 0) * scale * 10) / 10;
  const sugar = Math.round((n.sugar ?? 0) * scale * 10) / 10;

  const MICRO_ROWS: {
    label: string;
    val: number | undefined;
    unit: string;
    rda: number;
    color: string;
  }[] = [
    { label: 'Vitamin C', val: n.vitaminC, unit: 'mg', rda: 90, color: '#F59E0B' },
    { label: 'Vitamin A', val: n.vitaminA, unit: 'µg', rda: 900, color: '#EF4444' },
    { label: 'Vitamin D', val: n.vitaminD, unit: 'µg', rda: 15, color: '#F97316' },
    { label: 'Vitamin B12', val: n.vitaminB12, unit: 'µg', rda: 2.4, color: '#8B5CF6' },
    { label: 'Calcium', val: n.calcium, unit: 'mg', rda: 1000, color: '#06B6D4' },
    { label: 'Iron', val: n.iron, unit: 'mg', rda: 18, color: '#DC2626' },
    { label: 'Potassium', val: n.potassium, unit: 'mg', rda: 3500, color: '#059669' },
    { label: 'Magnesium', val: n.magnesium, unit: 'mg', rda: 420, color: '#7C3AED' },
    { label: 'Sodium', val: n.sodium, unit: 'mg', rda: 2300, color: '#6B7280' },
    { label: 'Zinc', val: n.zinc, unit: 'mg', rda: 11, color: '#D97706' },
  ].filter((r) => (r.val ?? 0) > 0);

  const mealType = MEAL_TYPES.find((m) => m.key === category)!;

  return (
    <View style={{ flex: 1 }}>
      {/* Back + title */}
      <View style={np.topBar}>
        <TouchableOpacity onPress={onBack} style={np.backBtn}>
          <Text style={np.backTxt}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={np.foodName} numberOfLines={2}>
            {food.name}
          </Text>
          {food.brandOwner ? <Text style={np.brand}>{food.brandOwner}</Text> : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      >
        {/* USDA badge */}
        <View style={np.usdaBadge}>
          <Text style={np.usdaTxt}>USDA FoodData Central • Per 100g</Text>
        </View>

        {/* Serving adjuster */}
        <View style={np.servingRow}>
          <Text style={np.servingLabel}>Serving size (g)</Text>
          <TextInput
            style={np.servingInput}
            value={serving}
            onChangeText={setServing}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>

        {/* Main macros */}
        <View style={np.macroGrid}>
          {[
            { label: 'Calories', val: cal, unit: 'kcal', color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Protein', val: prot, unit: 'g', color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Carbs', val: carb, unit: 'g', color: '#10B981', bg: '#F0FDF4' },
            { label: 'Fat', val: fat, unit: 'g', color: '#EC4899', bg: '#FDF2F8' },
            { label: 'Fiber', val: fiber, unit: 'g', color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Sugar', val: sugar, unit: 'g', color: '#EF4444', bg: '#FEF2F2' },
          ].map((item) => (
            <View key={item.label} style={[np.macroBox, { backgroundColor: item.bg }]}>
              <Text style={[np.macroVal, { color: item.color }]}>{item.val}</Text>
              <Text style={np.macroUnit}>{item.unit}</Text>
              <Text style={np.macroLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Micronutrients */}
        {MICRO_ROWS.length > 0 && (
          <View style={np.microCard}>
            <Text style={np.microTitle}>Micronutrients (per {g}g)</Text>
            {MICRO_ROWS.map((row, i) => {
              const scaledVal = Math.round((row.val ?? 0) * scale * 10) / 10;
              const pct = Math.min(scaledVal / row.rda, 1);
              return (
                <View key={row.label} style={[np.microRow, i > 0 && { marginTop: 10 }]}>
                  <View style={{ width: 120 }}>
                    <Text style={np.microLabel}>{row.label}</Text>
                    <Text style={np.microSub}>
                      {scaledVal}
                      {row.unit} / {row.rda}
                      {row.unit} RDA
                    </Text>
                  </View>
                  <View style={np.microBarBg}>
                    <View
                      style={[
                        np.microBarFill,
                        { width: `${Math.round(pct * 100)}%` as any, backgroundColor: row.color },
                      ]}
                    />
                  </View>
                  <Text style={[np.microPct, { color: row.color }]}>{Math.round(pct * 100)}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Add button */}
        <TouchableOpacity
          onPress={() =>
            onAdd({
              name: food.name,
              category,
              calories: cal,
              protein: prot,
              carbs: carb,
              fat: fat,
              emoji: '🥦',
            })
          }
          style={{ marginTop: 4 }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[mealType.color, mealType.color + 'BB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={np.addBtn}
          >
            <Text style={np.addBtnTxt}>
              Add to {mealType.label} ({cal} kcal)
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ── Add Meal Modal ─────────────────────────────────────────────────────────────

const AddMealModal: React.FC<{
  visible: boolean;
  defaultCategory?: MealEntry['category'];
  isPro: boolean;
  onSave: (m: Omit<MealEntry, 'id' | 'loggedAt'>) => void;
  onClose: () => void;
  onPaywall: (feature: string) => void;
}> = ({ visible, defaultCategory = 'breakfast', isPro, onSave, onClose, onPaywall }) => {
  const [tab, setTab] = useState<'search' | 'quick' | 'custom'>('search');
  const [category, setCategory] = useState<MealEntry['category']>(defaultCategory);

  // search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // custom
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [emoji, setEmoji] = useState('🍽️');

  useEffect(() => {
    if (visible) {
      setCategory(defaultCategory);
      setTab('search');
      setQuery('');
      setResults([]);
      setSelected(null);
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setEmoji('🍽️');
    }
  }, [visible, defaultCategory]);

  const handleSearch = (text: string) => {
    setQuery(text);
    setSelected(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const foods = await searchFood(text.trim(), 12);
        setResults(foods);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const saveCustom = () => {
    if (!name.trim() || !calories) {
      Alert.alert('Required', 'Name and calories are required.');
      return;
    }
    onSave({
      name: name.trim(),
      category,
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      emoji,
    });
    onClose();
  };

  const saveQuick = (food: (typeof QUICK_FOODS)[0]) => {
    onSave({
      name: food.name,
      category: food.category,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      emoji: food.emoji,
    });
    onClose();
  };

  const mealType = MEAL_TYPES.find((m) => m.key === category)!;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={ms.overlay}>
          <View style={ms.sheet}>
            <View style={ms.handle} />
            <View style={ms.header}>
              <View>
                <Text style={ms.title}>Add Food</Text>
                <Text style={ms.subtitle}>Log what you ate today</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
                <Text style={ms.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Meal type selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ paddingHorizontal: 20, marginBottom: 10, flexGrow: 0 }}
            >
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setCategory(t.key)}
                  style={{ marginRight: 8 }}
                >
                  <View
                    style={[
                      ms.mealTypeChip,
                      category === t.key && { backgroundColor: t.bg, borderColor: t.color },
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
                    <Text
                      style={[
                        ms.mealTypeLabel,
                        category === t.key && { color: t.color, fontWeight: '700' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab bar */}
            <View style={ms.tabRow}>
              {(
                [
                  ['search', '🔍 Search'],
                  ['quick', '⚡ Quick'],
                  ['custom', '✏️ Custom'],
                ] as const
              ).map(([t, label]) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={[ms.tabBtn, tab === t && ms.tabBtnActive]}
                >
                  <Text style={[ms.tabTxt, tab === t && ms.tabTxtActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Tab content — takes all remaining height ── */}
            <View style={{ flex: 1 }}>
              {/* ── SEARCH tab ── */}
              {tab === 'search' && !selected && (
                <View style={{ flex: 1 }}>
                  <View style={ms.searchBox}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                    <TextInput
                      style={ms.searchInput}
                      placeholder="Search any food, vegetable, product…"
                      placeholderTextColor={COLORS.textMuted}
                      value={query}
                      onChangeText={handleSearch}
                      autoCapitalize="none"
                    />
                    {searching && (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.primary}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                    {query.length > 0 && !searching && (
                      <TouchableOpacity
                        onPress={() => {
                          setQuery('');
                          setResults([]);
                        }}
                      >
                        <Text style={{ color: COLORS.textMuted, fontSize: 16, marginLeft: 6 }}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {query.length === 0 && (
                    <View style={ms.searchHint}>
                      <Text style={ms.hintTitle}>Try searching for:</Text>
                      {[
                        'broccoli',
                        'chicken breast',
                        'brown rice',
                        'salmon',
                        'avocado',
                        'banana',
                      ].map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => handleSearch(s)}
                          style={ms.hintChip}
                        >
                          <Text style={ms.hintChipTxt}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                  >
                    {results.length > 0 && (
                      <View>
                        <Text style={ms.sectionLabel}>
                          USDA RESULTS — TAP TO SEE FULL NUTRIENTS
                        </Text>
                        {results.map((food) => {
                          const kcal = food.nutrients.calories ?? 0;
                          const prot = food.nutrients.protein ?? 0;
                          const carb = food.nutrients.carbs ?? 0;
                          const fatG = food.nutrients.fat ?? 0;
                          return (
                            <TouchableOpacity
                              key={food.fdcId}
                              onPress={() => {
                                if (!isPro) {
                                  onPaywall('Full Nutrient Panel');
                                  return;
                                }
                                setSelected(food);
                              }}
                              activeOpacity={0.75}
                            >
                              <View style={ms.resultRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={ms.resultName} numberOfLines={2}>
                                    {food.name}
                                  </Text>
                                  <Text style={ms.resultMacros}>
                                    P {prot}g · C {carb}g · F {fatG}g · per 100g
                                  </Text>
                                </View>
                                <View style={ms.resultCalBadge}>
                                  <Text style={ms.resultCal}>{kcal}</Text>
                                  <Text style={ms.resultCalUnit}>kcal</Text>
                                </View>
                                {isPro ? (
                                  <Text
                                    style={{ color: COLORS.textMuted, marginLeft: 4, fontSize: 16 }}
                                  >
                                    ›
                                  </Text>
                                ) : (
                                  <View
                                    style={{
                                      backgroundColor: '#EDE9FE',
                                      borderRadius: 6,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      marginLeft: 6,
                                    }}
                                  >
                                    <Text
                                      style={{ fontSize: 10, color: '#7C3AED', fontWeight: '800' }}
                                    >
                                      PRO
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                    {query.length >= 2 && results.length === 0 && !searching && (
                      <View style={{ alignItems: 'center', paddingTop: 32 }}>
                        <Text style={{ fontSize: 36 }}>🔍</Text>
                        <Text
                          style={{ color: COLORS.textMuted, marginTop: 12, textAlign: 'center' }}
                        >
                          No results for &ldquo;{query}&rdquo;
                        </Text>
                        <Text
                          style={{
                            color: COLORS.textMuted,
                            fontSize: 12,
                            marginTop: 4,
                            textAlign: 'center',
                          }}
                        >
                          Try a different name or use Custom tab
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* ── NUTRIENT DETAIL (within search tab) ── */}
              {tab === 'search' && selected && (
                <NutrientPanel
                  food={selected}
                  category={category}
                  onAdd={(m) => {
                    onSave(m);
                    onClose();
                  }}
                  onBack={() => setSelected(null)}
                />
              )}

              {/* ── QUICK tab ── */}
              {tab === 'quick' && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                >
                  <Text style={ms.sectionLabel}>POPULAR FOODS</Text>
                  {QUICK_FOODS.map((food, i) => (
                    <TouchableOpacity key={i} onPress={() => saveQuick(food)} activeOpacity={0.75}>
                      <View style={ms.quickRow}>
                        <View style={ms.quickEmoji}>
                          <Text style={{ fontSize: 22 }}>{food.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={ms.quickName}>{food.name}</Text>
                          <Text style={ms.quickMacros}>
                            P {food.protein}g · C {food.carbs}g · F {food.fat}g
                          </Text>
                        </View>
                        <View style={ms.quickCalBadge}>
                          <Text style={ms.quickCal}>{food.calories}</Text>
                          <Text style={ms.quickCalUnit}>kcal</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* ── CUSTOM tab ── */}
              {tab === 'custom' && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                >
                  <Text style={ms.sectionLabel}>EMOJI</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16 }}
                  >
                    {[
                      '🍽️',
                      '🥗',
                      '🍳',
                      '🥩',
                      '🐟',
                      '🥑',
                      '🍚',
                      '🥞',
                      '🍎',
                      '🥛',
                      '🍜',
                      '🥙',
                      '🥦',
                      '🍇',
                      '🫐',
                      '🥤',
                    ].map((e) => (
                      <TouchableOpacity
                        key={e}
                        onPress={() => setEmoji(e)}
                        style={[ms.emojiBtn, emoji === e && ms.emojiBtnActive]}
                      >
                        <Text style={{ fontSize: 22 }}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={ms.sectionLabel}>FOOD NAME</Text>
                  <TextInput
                    style={ms.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Grilled Chicken"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <Text style={ms.sectionLabel}>CALORIES (KCAL) *</Text>
                  <TextInput
                    style={ms.input}
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="e.g. 300"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(
                      [
                        ['Protein', protein, setProtein],
                        ['Carbs', carbs, setCarbs],
                        ['Fat', fat, setFat],
                      ] as const
                    ).map(([lbl, val, setter]) => (
                      <View key={lbl} style={{ flex: 1 }}>
                        <Text style={ms.sectionLabel}>{lbl.toUpperCase()} (G)</Text>
                        <TextInput
                          style={ms.input}
                          value={val}
                          onChangeText={setter as (v: string) => void}
                          placeholder="0"
                          keyboardType="numeric"
                          placeholderTextColor={COLORS.textMuted}
                        />
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={saveCustom}
                    style={{ marginTop: 8 }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[mealType.color, mealType.color + 'CC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={ms.saveBtn}
                    >
                      <Text style={ms.saveTxt}>Add {mealType.label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
            {/* end tab content wrapper */}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Goal Plan Card (collapsed) ─────────────────────────────────────────────────

const PlanCard: React.FC<{ plan: GoalPlan; onView: () => void }> = ({ plan, onView }) => (
  <TouchableOpacity onPress={onView} activeOpacity={0.88}>
    <View style={[ps.card, { borderColor: plan.color + '30' }]}>
      <LinearGradient
        colors={[plan.color + '18', plan.color + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ps.cardGrad}
      >
        <View style={ps.cardTop}>
          <View style={[ps.badge, { backgroundColor: plan.color + '20' }]}>
            <Text style={{ fontSize: 28 }}>{plan.badge}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[ps.cardTitle, { color: plan.color }]}>{plan.title}</Text>
            <Text style={ps.cardSub}>{plan.subtitle}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {[
                { label: `${plan.calories} kcal`, color: '#F59E0B' },
                { label: `${plan.macros.protein}g protein`, color: '#3B82F6' },
              ].map((b) => (
                <View key={b.label} style={[ps.chip, { backgroundColor: b.color + '15' }]}>
                  <Text style={[ps.chipTxt, { color: b.color }]}>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[ps.arrowBtn, { borderColor: plan.color + '40' }]}>
            <Text style={[ps.arrow, { color: plan.color }]}>›</Text>
          </View>
        </View>
        {/* Source mini-badge */}
        <View style={ps.sourceBadge}>
          <Text style={ps.sourceTxt}>ISSN · ACSM · Evidence-Based · Doctor-Level</Text>
        </View>
      </LinearGradient>
    </View>
  </TouchableOpacity>
);

// ── Goal Plan Detail Screen ────────────────────────────────────────────────────

const PlanDetailModal: React.FC<{
  plan: GoalPlan | null;
  onClose: () => void;
  isPaid: boolean;
  userName: string;
  userEmail?: string;
}> = ({ plan, onClose, isPaid, userName, userEmail }) => {
  const [dayIdx, setDayIdx] = useState(0);
  const [exporting, setExporting] = useState(false);
  if (!plan) return null;

  const day = plan.weekPlan[dayIdx];
  const dayTotal = day.meals.reduce((s, m) => s + m.kcal, 0);

  const handleExport = async () => {
    if (!isPaid) return;
    setExporting(true);
    try {
      await exportPlanAsPdf(plan, { name: userName, email: userEmail });
    } catch {
      // silently fail — sharing dialog dismissed
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={!!plan} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={pd.header}>
          <TouchableOpacity onPress={onClose} style={pd.backBtn}>
            <Text style={pd.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={pd.title}>
              {plan.badge} {plan.title}
            </Text>
            <Text style={pd.sub}>{plan.subtitle}</Text>
          </View>
          {/* PDF Export — paid only */}
          {isPaid ? (
            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              style={pd.exportBtn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={pd.exportGrad}
              >
                <Text style={pd.exportTxt}>{exporting ? '⏳' : '⬇️'} PDF</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                pd.exportBtn,
                {
                  backgroundColor: COLORS.bgInput,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: RADIUS.full,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '700' }}>
                🔒 PDF
              </Text>
              <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Paid only</Text>
            </View>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Trusted badge */}
          <View style={pd.trustBanner}>
            <Text style={pd.trustIcon}>🏥</Text>
            <View>
              <Text style={pd.trustTitle}>Clinically Evidence-Based</Text>
              <Text style={pd.trustSub}>ISSN · ACSM · AND — Peer-Reviewed Literature</Text>
            </View>
          </View>

          {/* Macro targets */}
          <View style={[pd.card, { marginHorizontal: 20, marginTop: 0 }]}>
            <Text style={pd.cardTitle}>Daily Macro Targets</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
              {[
                { label: 'Calories', val: `${plan.calories}`, unit: 'kcal', color: '#F59E0B' },
                { label: 'Protein', val: `${plan.macros.protein}`, unit: 'g', color: '#3B82F6' },
                { label: 'Carbs', val: `${plan.macros.carbs}`, unit: 'g', color: '#10B981' },
                { label: 'Fat', val: `${plan.macros.fat}`, unit: 'g', color: '#EC4899' },
                { label: 'Fiber', val: `${plan.macros.fiber}`, unit: 'g', color: '#8B5CF6' },
              ].map((item) => (
                <View key={item.label} style={{ alignItems: 'center' }}>
                  <Text style={[pd.macroVal, { color: item.color }]}>{item.val}</Text>
                  <Text style={pd.macroUnit}>{item.unit}</Text>
                  <Text style={pd.macroLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rationale */}
          <View style={[pd.card, { marginHorizontal: 20 }]}>
            <Text style={pd.cardTitle}>Why This Works</Text>
            <Text style={pd.rationaleText}>{plan.rationale}</Text>
            <View style={{ marginTop: 12, gap: 4 }}>
              {plan.sources.map((src, i) => (
                <View key={i} style={pd.sourceRow}>
                  <View style={pd.sourceDot} />
                  <Text style={pd.sourceTxtRow}>{src}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rules */}
          <View style={[pd.card, { marginHorizontal: 20 }]}>
            <Text style={pd.cardTitle}>Key Rules to Follow</Text>
            {plan.rules.map((rule, i) => (
              <View key={i} style={[pd.ruleRow, i > 0 && { marginTop: 10 }]}>
                <View style={[pd.ruleNum, { backgroundColor: plan.color + '20' }]}>
                  <Text style={[pd.ruleNumTxt, { color: plan.color }]}>{i + 1}</Text>
                </View>
                <Text style={pd.ruleTxt}>{rule}</Text>
              </View>
            ))}
          </View>

          {/* 7-day plan */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={pd.sectionTitle}>7-Day Meal Schedule</Text>

            {/* Day selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              {plan.weekPlan.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setDayIdx(i)}
                  style={{ marginRight: 8 }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      pd.dayChip,
                      dayIdx === i && { backgroundColor: plan.color, borderColor: plan.color },
                    ]}
                  >
                    <Text style={[pd.dayChipTxt, dayIdx === i && { color: '#fff' }]}>
                      Day {i + 1}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={pd.dayCard}>
              <View style={pd.dayHeader}>
                <Text style={[pd.dayTitle, { color: plan.color }]}>{day.day}</Text>
                <View style={[pd.totalBadge, { backgroundColor: plan.color + '15' }]}>
                  <Text style={[pd.totalBadgeTxt, { color: plan.color }]}>~{dayTotal} kcal</Text>
                </View>
              </View>
              {day.meals.map((meal, mi) => (
                <View
                  key={mi}
                  style={[
                    pd.mealBlock,
                    mi > 0 && {
                      marginTop: 16,
                      paddingTop: 16,
                      borderTopWidth: 1,
                      borderTopColor: COLORS.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={pd.mealName}>{meal.meal}</Text>
                    <Text style={[pd.mealKcal, { color: plan.color }]}>{meal.kcal} kcal</Text>
                  </View>
                  {meal.foods.map((food, fi) => (
                    <View key={fi} style={pd.foodRow}>
                      <View style={pd.foodDot} />
                      <Text style={pd.foodTxt}>{food}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Disclaimer */}
          <View style={pd.disclaimer}>
            <Text style={pd.disclaimerIcon}>⚕️</Text>
            <Text style={pd.disclaimerTxt}>{plan.disclaimer}</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ── My Plans Tab ──────────────────────────────────────────────────────────────

// ── Weekly Check-in Modal ─────────────────────────────────────────────────────

const CheckinModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (weight: number | undefined, adherence: number) => void;
}> = ({ visible, onClose, onSubmit }) => {
  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState(5);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,15,26,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#E4E7F0',
              alignSelf: 'center',
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: '900',
              color: COLORS.text,
              letterSpacing: -0.4,
              marginBottom: 4,
            }}
          >
            Weekly Check-in 📋
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>
            Update your progress — unlocks a fresh meal rotation for next week
          </Text>

          <Text
            style={{ fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 }}
          >
            CURRENT WEIGHT (kg) — optional
          </Text>
          <TextInput
            style={{
              backgroundColor: COLORS.bgInput,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: COLORS.border,
              paddingHorizontal: 14,
              height: 48,
              fontSize: 15,
              color: COLORS.text,
              marginBottom: 20,
            }}
            placeholder="e.g. 72.5"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />

          <Text
            style={{ fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10 }}
          >
            HOW MANY DAYS DID YOU FOLLOW YOUR PLAN? ({adherence}/7)
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <TouchableOpacity key={n} onPress={() => setAdherence(n)} style={{ flex: 1 }}>
                <View
                  style={{
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: adherence >= n ? '#7C3AED' : COLORS.bgInput,
                    borderWidth: 1,
                    borderColor: adherence >= n ? '#7C3AED' : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: adherence >= n ? '#fff' : COLORS.textMuted,
                    }}
                  >
                    {n}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => {
              onSubmit(weight ? parseFloat(weight) : undefined, adherence);
              onClose();
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: RADIUS.full,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                Submit Check-in 🚀
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── My Plans Tab ──────────────────────────────────────────────────────────────

const MyPlansTab: React.FC<{
  isPaid: boolean;
  userName: string;
  userEmail?: string;
  sub: import('../../hooks/useSubscription').SubscriptionStatus;
  onCheckin: (w?: number, a?: number) => void;
}> = ({ isPaid, userName, userEmail, sub, onCheckin }) => {
  const [plans, setPlans] = useState<GoalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GoalPlan | null>(null);
  const [checkinModal, setCheckinModal] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState('');

  useEffect(() => {
    getGoalPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  // Which plan variant to show based on week offset (3 variants per plan)
  // The planWeekOffset cycles 0→1→2→0 each check-in
  const rotatedPlans = plans.map((plan) => {
    const variant = sub.planWeekOffset % 3;
    // Rotate week order: variant 0 = normal, 1 = start from day 3, 2 = start from day 5
    const weekPlan = [...plan.weekPlan];
    if (variant === 1) weekPlan.unshift(...weekPlan.splice(2));
    if (variant === 2) weekPlan.unshift(...weekPlan.splice(4));
    return { ...plan, weekPlan };
  });

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Loading plans…</Text>
      </View>
    );
  }

  // Check if Sunday (day to show check-in prompt)
  const isSunday = new Date().getDay() === 0;
  const checkinDue =
    isSunday &&
    (!sub.lastCheckinAt ||
      new Date(sub.lastCheckinAt).toDateString() !== new Date().toDateString());

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
    >
      {/* Streak card */}
      {sub.isActive && (
        <View style={ps.streakCard}>
          <LinearGradient
            colors={['#7C3AED', '#4F46E5', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ps.streakGrad}
          >
            <View style={{ flex: 1 }}>
              <Text style={ps.streakLabel}>YOUR STREAK</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={ps.streakNum}>{sub.currentStreak}</Text>
                <Text style={ps.streakUnit}>weeks</Text>
              </View>
              <Text style={ps.streakBest}>Best: {sub.longestStreak} weeks</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <View style={ps.streakFire}>
                <Text style={{ fontSize: 28 }}>
                  {sub.currentStreak >= 4 ? '🏆' : sub.currentStreak >= 2 ? '🔥' : '✅'}
                </Text>
              </View>
              <View style={ps.daysLeftBadge}>
                <Text style={ps.daysLeftTxt}>{sub.daysLeft}d left</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Sunday check-in prompt */}
      {checkinDue && (
        <TouchableOpacity onPress={() => setCheckinModal(true)} activeOpacity={0.88}>
          <View style={ps.checkinPrompt}>
            <Text style={{ fontSize: 22 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={ps.checkinTitle}>Weekly Check-in Due!</Text>
              <Text style={ps.checkinSub}>
                Update your weight → unlock next week&apos;s fresh meal plan
              </Text>
            </View>
            <Text style={{ color: '#7C3AED', fontSize: 18, fontWeight: '700' }}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Check-in success message */}
      {!!checkinMsg && (
        <View style={[ps.checkinPrompt, { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' }]}>
          <Text style={{ fontSize: 16 }}>🎉</Text>
          <Text style={{ flex: 1, fontSize: 13, color: '#065F46', fontWeight: '600' }}>
            {checkinMsg}
          </Text>
        </View>
      )}

      {/* Info card */}
      <View style={ps.infoCard}>
        <Text style={ps.infoTitle}>Evidence-Based Goal Plans</Text>
        <Text style={ps.infoBody}>
          {sub.isActive
            ? `Week ${sub.planWeekOffset + 1} rotation active. Check in every Sunday to unlock next week's fresh plan.`
            : 'Built on peer-reviewed sports nutrition research from ISSN, ACSM, and leading clinical journals.'}
        </Text>
        <View style={ps.sourcesRow}>
          {['ISSN 2017', 'ACSM 2021', 'AJCN', 'BJSM'].map((s) => (
            <View key={s} style={ps.sourceChip}>
              <Text style={ps.sourceChipTxt}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Plan cards */}
      {rotatedPlans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onView={() => setSelected(plan)} />
      ))}

      {/* Disclaimer */}
      <View style={ps.disclaimer}>
        <Text style={ps.disclaimerTxt}>
          ⚕️ These plans represent population-level averages based on scientific guidelines.
          Individual calorie and macro needs vary by weight, height, age, sex, genetics, and medical
          history.{'\n\n'}
          Always consult a registered dietitian or your physician before starting any nutrition
          program, especially if you have existing health conditions.
        </Text>
      </View>

      <PlanDetailModal
        plan={selected}
        onClose={() => setSelected(null)}
        isPaid={isPaid}
        userName={userName}
        userEmail={userEmail}
      />

      <CheckinModal
        visible={checkinModal}
        onClose={() => setCheckinModal(false)}
        onSubmit={(w, a) => {
          onCheckin(w, a);
          setCheckinMsg('Check-in saved! Your fresh plan rotation is now active 🎉');
          setTimeout(() => setCheckinMsg(''), 5000);
        }}
      />
    </ScrollView>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────

const MealPlannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [s0, s1, s2, s3, s4] = useEntranceAnimation(5, { initialDelay: 60, stagger: 90 });
  const { meals, totals, byCategory, weeklyCalories, loading, add, remove, refresh } = useMeals();
  const [activeTab, setActiveTab] = useState<'log' | 'plans'>('log');
  const [addModal, setAddModal] = useState(false);
  const [defaultCat, setDefaultCat] = useState<MealEntry['category']>('breakfast');
  const [expandedCat, setExpandedCat] = useState<MealEntry['category'] | null>(null);
  const { user } = useAuth();
  const { sub, loading: subLoading, subscribe, checkin } = useSubscription();

  // Derived subscription state — server-enforced
  const isPro = sub.isActive;
  const isPaid = sub.isActive;

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState('');
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('yearly');
  const [currency, setCurrency] = useState<'inr' | 'usd'>('inr');
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    emoji: string;
    calories: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const maxCal = Math.max(...weeklyCalories, MACRO_GOALS.calories, 1);
  const remainingCal = Math.max(MACRO_GOALS.calories - totals.calories, 0);
  const calPct = Math.min(totals.calories / MACRO_GOALS.calories, 1);

  const openAdd = (cat: MealEntry['category']) => {
    setDefaultCat(cat);
    setAddModal(true);
  };

  const handleDelete = (id: string, name: string, emoji: string, calories: number) => {
    setDeleteTarget({ id, name, emoji, calories });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    remove(deleteTarget.id).catch(() => {});
    setDeleteTarget(null);
  };

  const quickRemove = (id: string) => {
    remove(id).catch(() => {});
  };

  if (loading) return <MealPlannerSkeleton />;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <Animated.View style={entranceStyle(s0)}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Meal Planner</Text>
            <Text style={s.headerSub}>
              {new Date().toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setAddModal(true)} style={s.addHeaderBtn}>
            <Text style={s.addHeaderTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Top Tab ── */}
      <Animated.View
        style={[
          entranceStyle(s0),
          {
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          },
        ]}
      >
        <View style={s.tabSwitcher}>
          {(
            [
              ['log', '🍽️ Food Log'],
              ['plans', '📋 My Plans'],
            ] as const
          ).map(([t, label]) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                if (t === 'plans' && !isPro) {
                  setPaywallTrigger('Goal Plans');
                  setPaywallVisible(true);
                } else {
                  setActiveTab(t);
                }
              }}
              style={[s.tabSwitchBtn, activeTab === t && s.tabSwitchBtnActive]}
            >
              <Text style={[s.tabSwitchTxt, activeTab === t && s.tabSwitchTxtActive]}>
                {label}
                {t === 'plans' && !isPro ? ' 🔒' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ── Plans Tab ── */}
      {activeTab === 'plans' && (
        <MyPlansTab
          isPaid={isPaid}
          userName={user?.name ?? 'User'}
          userEmail={user?.email}
          sub={sub}
          onCheckin={async (w, a) => {
            try {
              await checkin({ weightKg: w, mealAdherence: a ?? 0 });
            } catch {}
          }}
        />
      )}

      {/* ── Food Log Tab ── */}
      {activeTab === 'log' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Calorie hero */}
          <Animated.View style={entranceStyle(s1)}>
            <View style={s.heroCard}>
              <RingProgress
                size={110}
                strokeWidth={10}
                progress={calPct}
                gradientColors={['#10B981', '#059669']}
                trackColor="#D1FAE5"
                centerContent={
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: '900',
                        color: COLORS.text,
                        letterSpacing: -1,
                      }}
                    >
                      {totals.calories}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '600' }}>
                      kcal
                    </Text>
                  </View>
                }
              />
              <View style={{ flex: 1, gap: 12 }}>
                {[
                  { label: 'Goal', value: `${MACRO_GOALS.calories} kcal`, color: COLORS.text },
                  { label: 'Eaten', value: `${totals.calories} kcal`, color: '#F59E0B' },
                  { label: 'Remaining', value: `${remainingCal} kcal`, color: '#10B981' },
                ].map((item) => (
                  <View key={item.label} style={s.heroStatRow}>
                    <Text style={s.heroStatLabel}>{item.label}</Text>
                    <Text style={[s.heroStatVal, { color: item.color }]}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Macro breakdown — progress rings */}
          <Animated.View style={entranceStyle(s1)}>
            <View style={s.macroRow}>
              {MACRO_CONFIG.map((m) => {
                const val = totals[m.key];
                const goal = MACRO_GOALS[m.key];
                const pct = Math.min(val / Math.max(goal, 1), 1);
                return (
                  <View
                    key={m.key}
                    style={[s.macroCard, { backgroundColor: m.bg, borderColor: m.border }]}
                  >
                    <RingProgress
                      size={72}
                      strokeWidth={6}
                      progress={pct}
                      gradientColors={[m.color, m.colorEnd]}
                      trackColor={m.track}
                      centerContent={
                        <View style={{ alignItems: 'center' }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '900',
                              color: m.color,
                              letterSpacing: -0.4,
                            }}
                          >
                            {val}
                          </Text>
                          <Text style={{ fontSize: 8, color: COLORS.textMuted, fontWeight: '600' }}>
                            g
                          </Text>
                        </View>
                      }
                    />
                    <Text style={[s.macroLabel, { marginTop: 4 }]}>{m.label}</Text>
                    <Text style={s.macroGoal}>/ {goal}g</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* Weekly chart */}
          <Animated.View style={entranceStyle(s2)}>
            <View style={[s.card, { marginHorizontal: 20, marginBottom: 20 }]}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Weekly Calories</Text>
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>7 days</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {weeklyCalories.map((v, i) => {
                  const h = Math.max((v / maxCal) * 64, v > 0 ? 8 : 3);
                  const isToday = i === todayIdx;
                  return (
                    <View
                      key={i}
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
                    >
                      {v > 0 && (
                        <Text style={[s.barLabel, isToday && { color: '#F59E0B' }]}>
                          {v > 999 ? `${(v / 1000).toFixed(1)}k` : v}
                        </Text>
                      )}
                      <LinearGradient
                        colors={isToday ? ['#F59E0B', '#EF4444'] : ['#F0EEFF', '#E4E7F0']}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 0, y: 0 }}
                        style={{ width: '100%', height: h, borderRadius: 6 }}
                      />
                      <Text style={[s.barDay, isToday && { color: '#F59E0B', fontWeight: '700' }]}>
                        {DAYS_SHORT[i].slice(0, 1)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Meals by category */}
          <Animated.View style={entranceStyle(s3)}>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={s.sectionTitle}>Today&apos;s Meals</Text>
              {MEAL_TYPES.map((type) => {
                const items = byCategory(type.key);
                const catCal = items.reduce((a, m) => a + m.calories, 0);
                const isExpanded = expandedCat === type.key;
                return (
                  <View key={type.key} style={[s.mealSection, { borderColor: type.color + '30' }]}>
                    <TouchableOpacity
                      onPress={() => setExpandedCat(isExpanded ? null : type.key)}
                      activeOpacity={0.8}
                      style={s.mealCatHeader}
                    >
                      <View style={[s.mealCatIcon, { backgroundColor: type.bg }]}>
                        <Text style={{ fontSize: 20 }}>{type.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.mealCatTitle}>{type.label}</Text>
                        <Text style={s.mealCatTime}>{type.time}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[s.mealCatCal, { color: type.color }]}>
                          {catCal > 0 ? `${catCal} kcal` : '—'}
                        </Text>
                        <Text style={s.mealCatCount}>
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={[s.expandIcon, { backgroundColor: type.bg }]}>
                        <Text style={{ color: type.color, fontSize: 12, fontWeight: '700' }}>
                          {isExpanded ? '▴' : '▾'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={s.mealItems}>
                        {items.length === 0 ? (
                          <Text style={s.emptyMeal}>No {type.label.toLowerCase()} logged yet</Text>
                        ) : (
                          items.map((meal) => (
                            <View key={meal.id} style={s.mealItem}>
                              <View style={s.mealItemEmoji}>
                                <Text style={{ fontSize: 18 }}>{meal.emoji}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.mealItemName}>{meal.name}</Text>
                                <Text style={s.mealItemMacros}>
                                  P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                                </Text>
                              </View>
                              <Text style={[s.mealItemCal, { color: type.color }]}>
                                {meal.calories} kcal
                              </Text>
                              <TouchableOpacity
                                onPress={() => quickRemove(meal.id)}
                                style={s.deleteBtn}
                              >
                                <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700' }}>
                                  ×
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                        <TouchableOpacity
                          onPress={() => openAdd(type.key)}
                          style={[
                            s.addMealBtn,
                            { borderColor: type.color + '50', backgroundColor: type.bg },
                          ]}
                        >
                          <Text style={[s.addMealTxt, { color: type.color }]}>
                            + Add {type.label}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* Nutrition tips */}
          <Animated.View style={entranceStyle(s4)}>
            <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
              <Text style={s.sectionTitle}>Nutrition Tips</Text>
              <View style={s.card}>
                {[
                  {
                    emoji: '💧',
                    tip: 'Drink water before meals to reduce overeating by up to 13%.',
                  },
                  { emoji: '🥦', tip: 'Fill half your plate with vegetables for balanced macros.' },
                  { emoji: '⏰', tip: 'Eat within 1 hour of waking to kickstart metabolism.' },
                  {
                    emoji: '🍗',
                    tip: `Aim for ${MACRO_GOALS.protein}g protein daily to maintain muscle mass.`,
                  },
                ].map((t, i) => (
                  <View
                    key={i}
                    style={[
                      s.tipRow,
                      i > 0 && {
                        borderTopWidth: 1,
                        borderTopColor: COLORS.border,
                        marginTop: 12,
                        paddingTop: 12,
                      },
                    ]}
                  >
                    <View style={s.tipIcon}>
                      <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                    </View>
                    <Text style={s.tipTxt}>{t.tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity onPress={() => setAddModal(true)} activeOpacity={0.85} style={s.fab}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.fabGrad}
        >
          <Text style={s.fabTxt}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <AddMealModal
        visible={addModal}
        defaultCategory={defaultCat}
        isPro={isPro}
        onSave={(m) => add(m).catch(() => Alert.alert('Error', 'Failed to add meal.'))}
        onClose={() => setAddModal(false)}
        onPaywall={(feature) => {
          setAddModal(false);
          setPaywallTrigger(feature);
          setPaywallVisible(true);
        }}
      />

      <PaywallModal
        visible={paywallVisible}
        triggerFeature={paywallTrigger}
        onClose={() => setPaywallVisible(false)}
        onSubscribe={(_plan: PlanId, _type: SubscriptionType, cur: 'inr' | 'usd') => {
          setPaywallVisible(false);
          setPaymentPlan(_plan as PaymentPlan);
          setCurrency(cur);
          setPaymentVisible(true);
        }}
      />

      {/* ── Payment Modal ── */}
      <PaymentModal
        visible={paymentVisible}
        plan={paymentPlan}
        currency={currency}
        userId={user?.user_id ?? ''}
        userName={user?.name}
        userEmail={user?.email}
        onSuccess={async (plan) => {
          setPaymentVisible(false);
          // subscription already activated on backend via payment confirm endpoint
          await refresh();
        }}
        onClose={() => setPaymentVisible(false)}
      />

      {/* ── Delete Confirmation Bottom Sheet ── */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <TouchableOpacity
          style={ds.overlay}
          activeOpacity={1}
          onPress={() => setDeleteTarget(null)}
        >
          <TouchableOpacity activeOpacity={1} style={ds.sheet}>
            {/* Handle */}
            <View style={ds.handle} />

            {/* Food preview row */}
            <View style={ds.previewRow}>
              <LinearGradient
                colors={['#FEE2E2', '#FEF2F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ds.previewEmoji}
              >
                <Text style={{ fontSize: 30 }}>{deleteTarget?.emoji ?? '🍽️'}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={ds.previewName} numberOfLines={1}>
                  {deleteTarget?.name}
                </Text>
                <Text style={ds.previewCal}>{deleteTarget?.calories} kcal</Text>
              </View>
              <View style={ds.calBadge}>
                <Text style={ds.calBadgeTxt}>−{deleteTarget?.calories}</Text>
                <Text style={ds.calBadgeUnit}>kcal</Text>
              </View>
            </View>

            {/* Message */}
            <View style={ds.msgBox}>
              <Text style={ds.msgIcon}>🗑️</Text>
              <Text style={ds.msgTxt}>
                This item will be removed from today&apos;s food log and your calorie total will
                update.
              </Text>
            </View>

            {/* Buttons */}
            <View style={ds.btnRow}>
              <TouchableOpacity
                onPress={() => setDeleteTarget(null)}
                style={ds.cancelBtn}
                activeOpacity={0.8}
              >
                <Text style={ds.cancelTxt}>Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={ds.removeBtnGrad}
                >
                  <Text style={ds.removeTxt}>🗑 Remove</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: COLORS.text, lineHeight: 24 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  headerSub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 1 },
  addHeaderBtn: {
    backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addHeaderTxt: { color: '#059669', fontSize: 13, fontWeight: '700' },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  tabSwitchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  tabSwitchBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabSwitchTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabSwitchTxtActive: { color: COLORS.text, fontWeight: '800' },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginBottom: 0,
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  heroStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroStatLabel: { fontSize: 12, color: COLORS.textMuted },
  heroStatVal: { fontSize: 13, fontWeight: '700' },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  macroCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  macroGoal: { fontSize: 10, color: COLORS.textMuted },
  macroLabel: { fontSize: 11, color: COLORS.textSub, fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  badge: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeTxt: { fontSize: 11, color: '#059669', fontWeight: '600' },
  barLabel: { fontSize: 8, color: COLORS.textMuted, marginBottom: 2 },
  barDay: { fontSize: 9, color: COLORS.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  mealSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  mealCatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  mealCatIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCatTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  mealCatTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  mealCatCal: { fontSize: 14, fontWeight: '800' },
  mealCatCount: { fontSize: 10, color: COLORS.textMuted },
  expandIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealItems: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 14,
    paddingTop: 12,
    gap: 10,
  },
  emptyMeal: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  mealItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealItemEmoji: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealItemName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  mealItemMacros: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  mealItemCal: { fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMealBtn: {
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  addMealTxt: { fontSize: 13, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipTxt: { fontSize: 13, color: COLORS.textSub, lineHeight: 20, flex: 1, paddingTop: 2 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    zIndex: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 14,
  },
  fabGrad: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  fabTxt: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },
});

// ── Add Meal Modal Styles ──────────────────────────────────────────────────────

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,15,26,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '75%',
    paddingTop: 8,
    flexDirection: 'column',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: COLORS.textSub, fontSize: 13, fontWeight: '700' },
  mealTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  mealTypeLabel: { fontSize: 13, color: COLORS.textSub, fontWeight: '500' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 10,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabTxt: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabTxtActive: { color: COLORS.text, fontWeight: '700' },
  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  searchHint: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  hintTitle: {
    width: '100%',
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  hintChip: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hintChipTxt: { fontSize: 12, color: COLORS.textSub },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultName: { fontSize: 14, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  resultMacros: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  resultCalBadge: { alignItems: 'flex-end', marginLeft: 8 },
  resultCal: { fontSize: 15, fontWeight: '800', color: '#F59E0B' },
  resultCalUnit: { fontSize: 9, color: COLORS.textMuted },
  // Quick
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickEmoji: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  quickMacros: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  quickCalBadge: { alignItems: 'flex-end' },
  quickCal: { fontSize: 15, fontWeight: '800', color: '#F59E0B' },
  quickCalUnit: { fontSize: 9, color: COLORS.textMuted },
  // Custom
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiBtnActive: { borderColor: '#7C3AED', backgroundColor: '#EDE9FE' },
  input: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
  },
  saveBtn: {
    borderRadius: RADIUS.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ── Nutrient Panel Styles ──────────────────────────────────────────────────────

const np = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { paddingRight: 4, paddingTop: 2 },
  backTxt: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  foodName: { fontSize: 15, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
  brand: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  usdaBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  usdaTxt: { fontSize: 11, color: '#1D4ED8', fontWeight: '600' },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  servingLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  servingInput: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'right',
    minWidth: 70,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  macroBox: {
    width: (width - 70) / 3,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  macroVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  macroUnit: { fontSize: 11, color: COLORS.textMuted },
  macroLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  microCard: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  microTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  microRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  microLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  microSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  microBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E4E7F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  microBarFill: { height: '100%', borderRadius: 3 },
  microPct: { fontSize: 11, fontWeight: '700', width: 34, textAlign: 'right' },
  addBtn: { borderRadius: RADIUS.full, height: 52, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ── Plans Tab Styles ───────────────────────────────────────────────────────────

const ps = StyleSheet.create({
  streakCard: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 14 },
  streakGrad: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: RADIUS.xl },
  streakLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  streakNum: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  streakUnit: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  streakBest: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  streakFire: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysLeftBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  daysLeftTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },
  checkinPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EDE9FE',
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    marginBottom: 14,
  },
  checkinTitle: { fontSize: 14, fontWeight: '800', color: '#5B21B6' },
  checkinSub: { fontSize: 12, color: '#6D28D9', marginTop: 2 },

  infoCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 18,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5B21B6',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  infoBody: { fontSize: 13, color: '#6D28D9', lineHeight: 20 },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  sourceChip: {
    backgroundColor: '#EDE9FE',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  sourceChipTxt: { fontSize: 11, color: '#5B21B6', fontWeight: '700' },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  cardGrad: { padding: 18 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  chip: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipTxt: { fontSize: 11, fontWeight: '700' },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrow: { fontSize: 18, fontWeight: '700' },
  sourceBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  sourceTxt: { fontSize: 10, fontWeight: '700', color: '#374151', letterSpacing: 0.4 },
  disclaimer: {
    backgroundColor: '#FFF7ED',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginTop: 6,
  },
  disclaimerTxt: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});

// ── Plan Detail Styles ─────────────────────────────────────────────────────────

const pd = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: { fontSize: 20, color: COLORS.text, lineHeight: 24 },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  exportBtn: { marginLeft: 10 },
  exportGrad: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  exportTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    margin: 20,
    marginBottom: 14,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trustIcon: { fontSize: 28 },
  trustTitle: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  trustSub: { fontSize: 11, color: '#047857', marginTop: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  macroVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  macroUnit: { fontSize: 11, color: COLORS.textMuted },
  macroLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  rationaleText: { fontSize: 13, color: COLORS.textSub, lineHeight: 20, marginTop: 8 },
  sourceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  sourceDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7C3AED', marginTop: 6 },
  sourceTxtRow: { fontSize: 11, color: '#5B21B6', lineHeight: 17, flex: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ruleNumTxt: { fontSize: 12, fontWeight: '800' },
  ruleTxt: { fontSize: 13, color: COLORS.textSub, lineHeight: 19, flex: 1, paddingTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  dayChipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.textSub },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayTitle: { fontSize: 14, fontWeight: '800', flex: 1, letterSpacing: -0.2 },
  totalBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  totalBadgeTxt: { fontSize: 12, fontWeight: '700' },
  mealBlock: {},
  mealName: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  mealKcal: { fontSize: 13, fontWeight: '700' },
  foodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  foodDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    marginTop: 7,
    flexShrink: 0,
  },
  foodTxt: { fontSize: 12, color: COLORS.textSub, lineHeight: 18, flex: 1 },
  disclaimer: {
    backgroundColor: '#FFF7ED',
    borderRadius: RADIUS.xl,
    margin: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    gap: 10,
  },
  disclaimerIcon: { fontSize: 20 },
  disclaimerTxt: { fontSize: 12, color: '#92400E', lineHeight: 18, flex: 1 },
});

// ── Delete Modal Styles ────────────────────────────────────────────────────────

const ds = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,15,26,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  previewEmoji: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  previewCal: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  calBadge: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  calBadgeTxt: { fontSize: 16, fontWeight: '900', color: '#EF4444', letterSpacing: -0.5 },
  calBadgeUnit: { fontSize: 9, color: '#EF4444', fontWeight: '600' },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  msgIcon: { fontSize: 18 },
  msgTxt: { fontSize: 13, color: '#B91C1C', lineHeight: 19, flex: 1 },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: COLORS.textSub },
  removeBtnGrad: {
    height: 52,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

export default MealPlannerScreen;
