import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeals } from '../../hooks/useMeals';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';

import type { MealEntry } from '../../api/local';

const { width } = Dimensions.get('window');
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const today = new Date().getDay();

const MACRO_GOALS = { calories: 2000, protein: 120, carbs: 250, fat: 65 };
const FILTERS: { key: 'all' | MealEntry['category']; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];
const CATEGORIES = [
  {
    name: 'Breakfast',
    count: '120+ Foods',
    emoji: '🥞',
    grad: ['#F59E0B', '#FBBF24'] as [string, string],
  },
  {
    name: 'Lunch',
    count: '130+ Foods',
    emoji: '🥗',
    grad: ['#10B981', '#34D399'] as [string, string],
  },
  {
    name: 'Dinner',
    count: '80+ Foods',
    emoji: '🍽️',
    grad: ['#7C3AED', '#A78BFA'] as [string, string],
  },
  {
    name: 'Snacks',
    count: '60+ Foods',
    emoji: '🍎',
    grad: ['#EC4899', '#F43F5E'] as [string, string],
  },
];
const MEAL_GRADS: [string, string][] = [
  ['#3B82F6', '#06B6D4'],
  ['#7C3AED', '#A78BFA'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#34D399'],
  ['#EC4899', '#F43F5E'],
];
const MACRO_COLORS = { calories: '#F59E0B', protein: '#3B82F6', carbs: '#10B981', fat: '#EC4899' };

const MealPlannerScreen: React.FC = () => {
  const { totals, byCategory, weeklyCalories, remove, loading } = useMeals();
  const [activeFilter, setActiveFilter] = useState<'all' | MealEntry['category']>('all');
  const filtered = byCategory(activeFilter);
  const maxCal = Math.max(...weeklyCalories) || 1;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 56,
          paddingHorizontal: 24,
          paddingBottom: 16,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Meal Planner</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20 }}
      >
        {/* Macro progress */}
        <GlassCard style={{ marginTop: 4 }} padding={18}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
            Today&apos;s Nutrition
          </Text>
          {loading ? (
            <ActivityIndicator color="#7C3AED" />
          ) : (
            <>
              {(Object.keys(MACRO_GOALS) as (keyof typeof MACRO_GOALS)[]).map((key) => {
                const val = totals[key];
                const goal = MACRO_GOALS[key];
                const pct = Math.min((val / goal) * 100, 100);
                const unit = key === 'calories' ? 'kcal' : 'g';
                const color = MACRO_COLORS[key];
                return (
                  <View key={key} style={{ marginBottom: 12 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: COLORS.textSub,
                          fontWeight: '500',
                          textTransform: 'capitalize',
                        }}
                      >
                        {key}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>
                        {val}
                        <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '400' }}>
                          {' '}
                          / {goal} {unit}
                        </Text>
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 6,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 99,
                        overflow: 'hidden',
                      }}
                    >
                      <LinearGradient
                        colors={[color, `${color}88`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ height: '100%', width: `${pct}%` as any, borderRadius: 99 }}
                      />
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </GlassCard>

        {/* Weekly calories chart */}
        <GlassCard style={{ marginTop: 14 }} padding={16}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Calorie History</Text>
            <View
              style={{
                backgroundColor: 'rgba(16,185,129,0.2)',
                borderRadius: RADIUS.full,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '600' }}>Weekly</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70 }}>
            {weeklyCalories.map((v, i) => {
              const pct = Math.max((v / maxCal) * 58, v > 0 ? 6 : 3);
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <LinearGradient
                    colors={
                      i === today
                        ? ['#10B981', '#34D399']
                        : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.1)']
                    }
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={{ width: '100%', height: pct, borderRadius: 6 }}
                  />
                  <Text
                    style={{
                      fontSize: 9,
                      color: i === today ? '#34D399' : COLORS.textMuted,
                      marginTop: 4,
                    }}
                  >
                    {DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Meal filters */}
        <Text
          style={{
            fontSize: 17,
            fontWeight: '800',
            color: '#fff',
            marginTop: 28,
            marginBottom: 14,
            letterSpacing: -0.3,
          }}
        >
          Today&apos;s Meals
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14, marginHorizontal: -4 }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={{ marginHorizontal: 4 }}
            >
              {activeFilter === f.key ? (
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{f.label}</Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    backgroundColor: COLORS.bgCard,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.full,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: COLORS.textSub, fontSize: 13 }}>{f.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
        ) : filtered.length === 0 ? (
          <GlassCard padding={20}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' }}>
              No meals logged yet today.
            </Text>
          </GlassCard>
        ) : (
          filtered.map((meal, i) => {
            const grad = MEAL_GRADS[i % MEAL_GRADS.length];
            return (
              <GlassCard
                key={meal.id}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                padding={14}
              >
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{meal.emoji}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                    {meal.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                    {new Date(meal.loggedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {meal.calories} kcal
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    P: {meal.protein}g C: {meal.carbs}g F: {meal.fat}g
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => remove(meal.id)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#F87171', fontSize: 16, lineHeight: 20 }}>×</Text>
                </TouchableOpacity>
              </GlassCard>
            );
          })
        )}

        {/* Food categories */}
        <Text
          style={{
            fontSize: 17,
            fontWeight: '800',
            color: '#fff',
            marginTop: 28,
            marginBottom: 14,
            letterSpacing: -0.3,
          }}
        >
          Find Something to Eat
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {CATEGORIES.map((cat, i) => (
            <TouchableOpacity key={i} activeOpacity={0.85} style={{ width: (width - 52) / 2 }}>
              <GlassCard style={{ alignItems: 'center' }} padding={20}>
                <LinearGradient
                  colors={[`${cat.grad[0]}25`, `${cat.grad[1]}10`]}
                  style={{
                    position: 'absolute',
                    borderRadius: RADIUS.lg,
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                />
                <Text style={{ fontSize: 40, marginBottom: 10 }}>{cat.emoji}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: 4,
                  }}
                >
                  {cat.name}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 14 }}>
                  {cat.count}
                </Text>
                <LinearGradient
                  colors={cat.grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: RADIUS.full, width: '100%' }}
                >
                  <TouchableOpacity style={{ paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Select</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default MealPlannerScreen;
