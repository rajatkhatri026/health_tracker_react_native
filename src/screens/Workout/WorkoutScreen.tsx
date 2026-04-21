import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorkouts } from '../../hooks/useWorkouts';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import { IconPlus, IconChevronRight, IconArrowLeft, IconCheck } from '../../components/icons/Icons';
import AddWorkoutModal from '../../components/AddWorkoutModal/AddWorkoutModal';
import type { RootStackParamList } from '../../navigation/types';
import type { CreateWorkoutPayload } from '../../api/workouts';
import { formatTime } from '../../utils/format';

const { width } = Dimensions.get('window');

const WORKOUT_GRADS: [string, string][] = [
  ['#7C3AED', '#A78BFA'],
  ['#3B82F6', '#06B6D4'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#EF4444'],
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

// Module-level flag so WorkoutDetailScreen can signal a toast to show on return
export const pendingToast = { message: '' };

const WorkoutScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    workouts,
    upcoming,
    history,
    completedToday,
    stats,
    loading,
    statsLoading,
    add,
    remove,
    removeMany,
    refresh,
  } = useWorkouts();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [modalVisible, setModalVisible] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const exitSelect = () => {
    setSelecting(false);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await removeMany(selectedIds);
      setConfirmBulkDelete(false);
      exitSelect();
      showToast(`${selectedIds.length} workout${selectedIds.length > 1 ? 's' : ''} deleted`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBulkDeleting(false);
    }
  };
  const [toast, setToast] = useState('');
  // useState keeps Animated.Value stable across renders without triggering the
  // react-hooks/refs lint rule that fires on useRef().current in JSX.
  const [toastAnim] = useState(() => new Animated.Value(0));

  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(''));
    },
    [toastAnim]
  );

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refreshRef.current();
      if (pendingToast.message) {
        showToast(pendingToast.message);
        pendingToast.message = '';
      }
    }, [showToast])
  );

  const handleAdd = async (payloads: CreateWorkoutPayload[]) => {
    await add(payloads);
    setModalVisible(false);
  };

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Build 7 dates for displayed week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + weekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  const weekLabel = (() => {
    const fmt = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (weekOffset === 0) return fmt(weekDates[0]) + ' – ' + fmt(weekDates[6]);
    if (weekOffset === -1) return fmt(weekDates[0]) + ' – ' + fmt(weekDates[6]);
    return fmt(weekDates[0]) + ' – ' + fmt(weekDates[6]);
  })();

  // Count workouts (all statuses) per day for chart
  const weeklyCounts = weekDates.map((day) => {
    const dayStr = day.toDateString();
    return workouts.filter((w) => new Date(w.scheduledAt).toDateString() === dayStr).length;
  });
  const maxCount = Math.max(...weeklyCounts, 1);

  // Filter workouts by selected date if any
  const filteredUpcoming = selectedDate
    ? upcoming.filter((w) => new Date(w.scheduledAt).toDateString() === selectedDate.toDateString())
    : upcoming;
  const filteredHistory = selectedDate
    ? history.filter((w) => new Date(w.scheduledAt).toDateString() === selectedDate.toDateString())
    : history;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />

      {/* Toast */}
      {toast !== '' && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 100,
            alignSelf: 'center',
            zIndex: 999,
            backgroundColor: '#10B981',
            borderRadius: 24,
            paddingHorizontal: 20,
            paddingVertical: 12,
            opacity: toastAnim,
            transform: [
              { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            ],
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ {toast}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <LinearGradient
        colors={['#1A0A3C', '#0D1F3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 56,
          paddingHorizontal: 24,
          paddingBottom: 28,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          borderBottomWidth: 1,
          borderColor: 'rgba(124,58,237,0.2)',
        }}
      >
        <Svg width={width} height={200} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Circle cx={width * 0.8} cy={30} r={100} fill="#7C3AED" fillOpacity="0.08" />
          <Circle cx={20} cy={160} r={70} fill="#06B6D4" fillOpacity="0.06" />
        </Svg>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          {selecting ? (
            <>
              <TouchableOpacity onPress={exitSelect}>
                <Text style={{ color: COLORS.textSub, fontSize: 14, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {selectedIds.length} selected
              </Text>
              <TouchableOpacity
                onPress={() => selectedIds.length > 0 && setConfirmBulkDelete(true)}
                disabled={selectedIds.length === 0}
                style={{
                  backgroundColor:
                    selectedIds.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: selectedIds.length > 0 ? 'rgba(239,68,68,0.4)' : COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: selectedIds.length > 0 ? '#EF4444' : COLORS.textMuted,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>
                Workout Tracker
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: 'rgba(124,58,237,0.25)',
                  borderWidth: 1,
                  borderColor: 'rgba(124,58,237,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPlus size={18} color="#A78BFA" strokeWidth={2.5} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Week nav row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setWeekOffset((w) => w - 1);
              setSelectedDate(null);
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(124,58,237,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconArrowLeft size={15} color="#A78BFA" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>
            {weekLabel}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setWeekOffset((w) => w + 1);
              setSelectedDate(null);
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(124,58,237,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconChevronRight size={15} color="#A78BFA" />
          </TouchableOpacity>
        </View>

        {/* Date pill row + bar chart */}
        {loading ? (
          <ActivityIndicator color="#7C3AED" style={{ height: 100 }} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {weekDates.map((day, i) => {
              const v = weeklyCounts[i];
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = selectedDate?.toDateString() === day.toDateString();
              const barH = Math.max((v / maxCount) * 44, v > 0 ? 6 : 2);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelectedDate(isSelected ? null : day)}
                  style={{ flex: 1, alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  {/* Day label */}
                  <Text
                    style={{
                      fontSize: 10,
                      color: isSelected ? '#fff' : isToday ? '#A78BFA' : COLORS.textMuted,
                      fontWeight: isSelected || isToday ? '700' : '400',
                      marginBottom: 3,
                    }}
                  >
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][day.getDay()]}
                  </Text>
                  {/* Date pill */}
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 6,
                      backgroundColor: isSelected
                        ? '#7C3AED'
                        : isToday
                          ? 'rgba(124,58,237,0.25)'
                          : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: '#7C3AED',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: isSelected ? '#fff' : isToday ? '#A78BFA' : COLORS.textSub,
                        fontWeight: isSelected || isToday ? '700' : '400',
                      }}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  {/* Bar */}
                  <View style={{ width: '80%', height: 44, justifyContent: 'flex-end' }}>
                    <LinearGradient
                      colors={
                        isSelected
                          ? ['#7C3AED', '#06B6D4']
                          : v > 0
                            ? ['#4C1D95', '#6D28D9']
                            : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.07)']
                      }
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={{ height: barH, borderRadius: 4 }}
                    />
                  </View>
                  {/* Count dot */}
                  {v > 0 && (
                    <Text
                      style={{
                        fontSize: 8,
                        color: isSelected ? '#fff' : '#A78BFA',
                        fontWeight: '700',
                        marginTop: 2,
                      }}
                    >
                      {v}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {selectedDate && (
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            style={{ marginTop: 8, alignSelf: 'center' }}
          >
            <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '600' }}>
              Showing {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ·
              Tap to clear
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20 }}
      >
        {/* Weekly summary stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          {[
            {
              label: 'This Week',
              value: statsLoading ? '…' : String(stats?.this_week ?? 0),
              unit: 'workouts',
              c: '#A78BFA',
            },
            {
              label: 'Total Mins',
              value: statsLoading ? '…' : String(stats?.total_mins ?? 0),
              unit: 'active',
              c: '#06B6D4',
            },
            {
              label: 'Kcal Burned',
              value: statsLoading ? '…' : String(stats?.total_calories_burned ?? 0),
              unit: 'total',
              c: '#F59E0B',
            },
          ].map((s) => (
            <GlassCard key={s.label} style={{ flex: 1, alignItems: 'center' }} padding={14}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: s.c }}>{s.value}</Text>
              <Text
                style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' }}
              >
                {s.label}
              </Text>
              <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{s.unit}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 16 }}>
          {(['upcoming', 'history'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1 }}>
              {tab === t ? (
                <LinearGradient
                  colors={['#7C3AED', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: RADIUS.full, paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: '700',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    backgroundColor: COLORS.bgCard,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.full,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{ color: COLORS.textSub, fontSize: 13, textTransform: 'capitalize' }}
                  >
                    {t}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Select all row */}
        {selecting && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                const all =
                  tab === 'upcoming'
                    ? filteredUpcoming.map((w) => w.id)
                    : filteredHistory.map((w) => w.id);
                setSelectedIds(selectedIds.length === all.length ? [] : all);
              }}
            >
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '600' }}>
                {selectedIds.length ===
                (tab === 'upcoming' ? filteredUpcoming : filteredHistory).length
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Long press to select</Text>
          </View>
        )}

        {/* Upcoming tab */}
        {tab === 'upcoming' && (
          <>
            {loading ? (
              <ActivityIndicator color="#7C3AED" style={{ marginVertical: 30 }} />
            ) : filteredUpcoming.length === 0 ? (
              <GlassCard padding={30} style={{ alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 36 }}>🏋️</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                  {selectedDate ? 'No workouts on this day' : 'No upcoming workouts'}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center' }}>
                  {selectedDate
                    ? 'Select another date or schedule a new workout'
                    : 'Tap the + button to schedule your next session'}
                </Text>
                {!selectedDate && (
                  <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <LinearGradient
                      colors={['#7C3AED', '#06B6D4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: RADIUS.full,
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                        Schedule Workout
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </GlassCard>
            ) : (
              filteredUpcoming.map((w, i) => {
                const grad = WORKOUT_GRADS[i % WORKOUT_GRADS.length];
                const isFuture = new Date(w.scheduledAt) > new Date();
                const isSelected = selectedIds.includes(w.id);
                return (
                  <TouchableOpacity
                    key={w.id}
                    activeOpacity={0.85}
                    onLongPress={() => {
                      setSelecting(true);
                      toggleSelect(w.id);
                    }}
                    onPress={() =>
                      selecting
                        ? toggleSelect(w.id)
                        : navigation.navigate('WorkoutDetail', { workout: w })
                    }
                  >
                    <GlassCard
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: '#7C3AED',
                      }}
                      padding={14}
                    >
                      {selecting ? (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            marginRight: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? '#7C3AED' : 'transparent',
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#7C3AED' : COLORS.border,
                          }}
                        >
                          {isSelected && <IconCheck size={14} color="#fff" strokeWidth={2.5} />}
                        </View>
                      ) : (
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
                          <Text style={{ fontSize: 24 }}>{w.emoji}</Text>
                        </LinearGradient>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                          {w.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                          {w.exercises.length} exercises · {w.durationMins} mins
                        </Text>
                        <Text
                          style={{ fontSize: 11, color: grad[0], marginTop: 3, fontWeight: '600' }}
                        >
                          {formatTime(w.scheduledAt)}
                        </Text>
                      </View>
                      {!selecting &&
                        (isFuture ? (
                          <View
                            style={{
                              backgroundColor: 'rgba(124,58,237,0.15)',
                              borderRadius: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderWidth: 1,
                              borderColor: 'rgba(124,58,237,0.3)',
                            }}
                          >
                            <Text style={{ fontSize: 10, color: '#A78BFA', fontWeight: '600' }}>
                              Scheduled
                            </Text>
                          </View>
                        ) : (
                          <IconChevronRight size={16} color={COLORS.textMuted} />
                        ))}
                    </GlassCard>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Completed today */}
            {completedToday.length > 0 && (
              <>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#10B981',
                    marginTop: 24,
                    marginBottom: 12,
                  }}
                >
                  ✓ Completed Today
                </Text>
                {completedToday.map((w, i) => {
                  const grad = WORKOUT_GRADS[i % WORKOUT_GRADS.length];
                  return (
                    <GlassCard
                      key={w.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 10,
                        opacity: 0.75,
                      }}
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
                        <Text style={{ fontSize: 24 }}>{w.emoji}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                          {w.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>
                          {w.durationMins} mins · {w.caloriesBurned} kcal
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: 'rgba(16,185,129,0.15)',
                          borderRadius: 8,
                          padding: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>
                          Done
                        </Text>
                      </View>
                    </GlassCard>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <>
            {loading ? (
              <ActivityIndicator color="#7C3AED" style={{ marginVertical: 30 }} />
            ) : filteredHistory.length === 0 ? (
              <GlassCard padding={30} style={{ alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 36 }}>📋</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                  {selectedDate ? 'No completed workouts on this day' : 'No history yet'}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center' }}>
                  {selectedDate
                    ? 'Try selecting another date'
                    : 'Complete your first workout to see it here'}
                </Text>
              </GlassCard>
            ) : (
              filteredHistory.map((w, i) => {
                const grad = WORKOUT_GRADS[i % WORKOUT_GRADS.length];
                const done = w.exercises.filter((e) => e.completed).length;
                const isSelected = selectedIds.includes(w.id);
                return (
                  <TouchableOpacity
                    key={w.id}
                    activeOpacity={0.85}
                    onLongPress={() => {
                      setSelecting(true);
                      toggleSelect(w.id);
                    }}
                    onPress={() => (selecting ? toggleSelect(w.id) : undefined)}
                  >
                    <GlassCard
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: '#7C3AED',
                      }}
                      padding={14}
                    >
                      {selecting ? (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            marginRight: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? '#7C3AED' : 'transparent',
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#7C3AED' : COLORS.border,
                          }}
                        >
                          {isSelected && <IconCheck size={14} color="#fff" strokeWidth={2.5} />}
                        </View>
                      ) : (
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
                          <Text style={{ fontSize: 24 }}>{w.emoji}</Text>
                        </LinearGradient>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                          {w.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                          {done}/{w.exercises.length} exercises · {w.durationMins} mins ·{' '}
                          {w.caloriesBurned} kcal
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                          {formatDate(w.completedAt!)}
                        </Text>
                      </View>
                      {!selecting && (
                        <TouchableOpacity onPress={() => remove(w.id)} style={{ padding: 6 }}>
                          <Text style={{ color: '#F43F5E', fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
                      )}
                    </GlassCard>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Bulk delete confirm modal */}
      <Modal
        visible={confirmBulkDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmBulkDelete(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
          }}
        >
          <View
            style={{
              backgroundColor: '#16103A',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.4)',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
              Delete Workouts
            </Text>
            <Text style={{ color: COLORS.textSub, fontSize: 14, marginBottom: 24 }}>
              Delete {selectedIds.length} selected workout{selectedIds.length > 1 ? 's' : ''}? This
              cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setConfirmBulkDelete(false)}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: COLORS.bgCard,
                  borderRadius: RADIUS.full,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBulkDelete}
                disabled={bulkDeleting}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#EF4444',
                  borderRadius: RADIUS.full,
                }}
              >
                {bulkDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add workout modal */}
      <AddWorkoutModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAdd}
      />
    </View>
  );
};

export default WorkoutScreen;
