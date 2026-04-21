import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  AppState,
  type AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorkouts } from '../../hooks/useWorkouts';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import { IconArrowLeft, IconCheck, IconTrash, IconEdit } from '../../components/icons/Icons';
import AddWorkoutModal from '../../components/AddWorkoutModal/AddWorkoutModal';
import type { CreateWorkoutPayload } from '../../api/workouts';
import type { Exercise } from '../../api/workouts';
import type { RootStackParamList } from '../../navigation/types';
import { pendingToast } from './WorkoutScreen';

const { width: _screenWidth } = Dimensions.get('window');

const TIMER_KEY = (id: string) => `workout_timer_start_${id}`;

// Persistent stopwatch — survives app background/close by storing start timestamp
const Stopwatch: React.FC<{
  workoutId: string;
  running: boolean;
  onTick: (secs: number) => void;
}> = ({ workoutId, running, onTick }) => {
  const [secs, setSecs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const computeSecs = useCallback(async (): Promise<number> => {
    const stored = await AsyncStorage.getItem(TIMER_KEY(workoutId));
    if (!stored) return 0;
    return Math.floor((Date.now() - parseInt(stored, 10)) / 1000);
  }, [workoutId]);

  const startTicking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      const s = await computeSecs();
      setSecs(s);
      onTick(s);
    }, 1000);
  }, [computeSecs, onTick]);

  // On mount — restore elapsed time if timer was already running
  useEffect(() => {
    computeSecs().then((s) => {
      setSecs(s);
      onTick(s);
    });
  }, []);

  // Start/stop interval when `running` changes
  useEffect(() => {
    if (running) {
      startTicking();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, startTicking]);

  // When app comes back to foreground, recompute elapsed time immediately
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (running && (prev === 'background' || prev === 'inactive') && next === 'active') {
        computeSecs().then((s) => {
          setSecs(s);
          onTick(s);
        });
        startTicking();
      }
    });
    return () => sub.remove();
  }, [running, computeSecs, startTicking]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const fmt = (n: number) => String(n).padStart(2, '0');

  return (
    <Text
      style={{
        fontSize: 48,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -1,
        fontVariant: ['tabular-nums'],
      }}
    >
      {h > 0 ? `${fmt(h)}:` : ''}
      {fmt(m)}:{fmt(s)}
    </Text>
  );
};

type RouteParams = RouteProp<RootStackParamList, 'WorkoutDetail'>;

const WorkoutDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteParams>();
  const { workout } = route.params;
  const { complete, remove, update } = useWorkouts();
  const [editVisible, setEditVisible] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState(workout);

  const [exercises, setExercises] = useState<Exercise[]>(
    currentWorkout.exercises.map((e, i) => ({ ...e, id: e.id || String(i), completed: false }))
  );
  const [started, setStarted] = useState(false);

  // Persist timer start timestamp so it survives background/close
  const startTimer = useCallback(async () => {
    const existing = await AsyncStorage.getItem(TIMER_KEY(currentWorkout.id));
    if (!existing) {
      await AsyncStorage.setItem(TIMER_KEY(currentWorkout.id), String(Date.now()));
    }
    setStarted(true);
  }, [currentWorkout.id]);

  const pauseTimer = useCallback(() => setStarted(false), []);

  const clearTimer = useCallback(async () => {
    await AsyncStorage.removeItem(TIMER_KEY(currentWorkout.id));
  }, [currentWorkout.id]);

  // On mount, check if a timer was already running for this workout
  useEffect(() => {
    AsyncStorage.getItem(TIMER_KEY(currentWorkout.id)).then((v) => {
      if (v) setStarted(true);
    });
  }, [currentWorkout.id]);
  const [finished, setFinished] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const handleEditSave = async (payloads: CreateWorkoutPayload[]) => {
    const payload = payloads[0]; // edit always has one
    await update(currentWorkout.id, payload);
    setCurrentWorkout((prev) => ({
      ...prev,
      name: payload.name,
      category: payload.category,
      emoji: payload.emoji ?? prev.emoji,
      durationMins: payload.durationMins,
      scheduledAt: payload.scheduledAt,
      exercises: payload.exercises.map((e, i) => ({ ...e, id: String(i), completed: false })),
    }));
    setEditVisible(false);
  };

  const confirmAndDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await clearTimer();
      await remove(currentWorkout.id);
      pendingToast.message = 'Workout deleted successfully';
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete workout');
    } finally {
      setDeleting(false);
    }
  };

  // Only lock if scheduled for a future date (not just a past time today)
  const scheduledDate = new Date(currentWorkout.scheduledAt);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isFutureWorkout =
    scheduledDate > new Date() && scheduledDate.toDateString() !== new Date().toDateString();
  const completedCount = exercises.filter((e) => e.completed).length;
  const progress = exercises.length > 0 ? completedCount / exercises.length : 0;

  const toggleExercise = useCallback(
    (id: string) => {
      setExercises((prev) => {
        const updated = prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e));
        // Auto-start timer when first exercise is checked
        if (!started && updated.some((e) => e.completed)) startTimer();
        return updated;
      });
    },
    [started]
  );

  const estimatedCalories = Math.round((elapsedSecs / 60) * 7); // ~7 kcal/min average

  const handleFinish = () => setConfirmFinish(true);

  const submitWorkout = async () => {
    setSaving(true);
    try {
      await complete(currentWorkout.id, {
        exercises,
        durationMins: Math.max(1, Math.round(elapsedSecs / 60)),
        caloriesBurned: estimatedCalories,
      });
      await clearTimer();
      setFinished(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  if (finished) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 30,
        }}
      >
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#7C3AED', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.6,
            shadowRadius: 24,
            elevation: 16,
          }}
        >
          <IconCheck size={44} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: '#fff',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Workout Complete!
        </Text>
        <Text
          style={{ fontSize: 15, color: COLORS.textSub, textAlign: 'center', marginBottom: 40 }}
        >
          {completedCount} exercises · {Math.round(elapsedSecs / 60)} mins · {estimatedCalories}{' '}
          kcal burned
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          {[
            { label: 'Exercises', value: `${completedCount}/${exercises.length}`, c: '#A78BFA' },
            { label: 'Duration', value: `${Math.round(elapsedSecs / 60)}m`, c: '#06B6D4' },
            { label: 'Calories', value: `${estimatedCalories}`, c: '#F59E0B' },
          ].map((s) => (
            <GlassCard key={s.label} style={{ flex: 1, alignItems: 'center' }} padding={14}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: s.c }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>{s.label}</Text>
            </GlassCard>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 32, width: '100%' }}
        >
          <LinearGradient
            colors={['#7C3AED', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: RADIUS.full }}
          >
            <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                Back to Workouts
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#1A0A3C', '#0D1F3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 56,
          paddingHorizontal: 24,
          paddingBottom: 28,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 14 }}>
            <IconArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>
              {currentWorkout.emoji} {currentWorkout.name}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSub, marginTop: 2 }}>
              {currentWorkout.category} · {currentWorkout.exercises.length} exercises
            </Text>
          </View>
          {currentWorkout.status === 'scheduled' && (
            <TouchableOpacity
              onPress={() => setEditVisible(true)}
              style={{
                padding: 8,
                backgroundColor: 'rgba(124,58,237,0.15)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(124,58,237,0.3)',
                marginRight: 8,
              }}
            >
              <IconEdit size={18} color="#A78BFA" strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setConfirmDelete(true)}
            disabled={deleting}
            style={{
              padding: 8,
              backgroundColor: 'rgba(239,68,68,0.15)',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
            }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <IconTrash size={18} color="#EF4444" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>

        {/* Timer */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Stopwatch
            workoutId={currentWorkout.id}
            running={started && !finished}
            onTick={setElapsedSecs}
          />
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
            {isFutureWorkout
              ? `Scheduled for ${new Date(currentWorkout.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : started
                ? `~${estimatedCalories} kcal burned`
                : completedCount > 0
                  ? 'Tap Finish to save your workout'
                  : 'Start timer or check exercises to begin'}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <LinearGradient
            colors={['#7C3AED', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: '100%', width: `${progress * 100}%` as any, borderRadius: 99 }}
          />
        </View>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>
          {completedCount} of {exercises.length} exercises completed
        </Text>

        {/* Start / Pause / Finish */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {/* Start/Pause toggle */}
          {!started ? (
            <TouchableOpacity
              onPress={() => !isFutureWorkout && startTimer()}
              disabled={isFutureWorkout}
              style={{
                flex: completedCount > 0 ? 1 : undefined,
                width: completedCount > 0 ? undefined : '100%',
                opacity: isFutureWorkout ? 0.4 : 1,
              }}
            >
              <LinearGradient
                colors={isFutureWorkout ? ['#374151', '#4B5563'] : ['#10B981', '#34D399']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: RADIUS.full }}
              >
                <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    {isFutureWorkout ? '🔒  Not Yet' : '▶  Start Workout'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={pauseTimer} style={{ flex: 1 }}>
              <View
                style={{
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: COLORS.bgCard,
                  borderRadius: RADIUS.full,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.textSub, fontSize: 15, fontWeight: '700' }}>
                  ⏸ Pause
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Finish — always visible once any exercise is completed */}
          {completedCount > 0 && (
            <TouchableOpacity onPress={handleFinish} disabled={saving} style={{ flex: 1 }}>
              <LinearGradient
                colors={['#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: RADIUS.full }}
              >
                <View
                  style={{
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <IconCheck size={16} color="#fff" />
                  )}
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    Finish ({completedCount}/{exercises.length})
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Finish confirmation modal */}
      <Modal
        visible={confirmFinish}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmFinish(false)}
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
              borderColor: 'rgba(124,58,237,0.4)',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
              Finish Workout?
            </Text>
            <Text style={{ color: COLORS.textSub, fontSize: 14, marginBottom: 24 }}>
              {completedCount}/{exercises.length} exercises ·{' '}
              {Math.max(1, Math.round(elapsedSecs / 60))} mins · ~{estimatedCalories} kcal
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setConfirmFinish(false)}
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
                onPress={() => {
                  setConfirmFinish(false);
                  submitWorkout();
                }}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: RADIUS.full,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={['#7C3AED', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Finish</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDelete(false)}
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
              Delete Workout
            </Text>
            <Text style={{ color: COLORS.textSub, fontSize: 14, marginBottom: 24 }}>
              Delete &quot;{currentWorkout.name}&quot;? This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setConfirmDelete(false)}
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
                onPress={confirmAndDelete}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#EF4444',
                  borderRadius: RADIUS.full,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: COLORS.textSub,
            letterSpacing: 0.8,
            marginBottom: 14,
          }}
        >
          EXERCISES
        </Text>
        {exercises.map((ex, idx) => (
          <GlassCard
            key={ex.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
              opacity: ex.completed ? 0.65 : 1,
            }}
            padding={14}
            glow={ex.completed ? '#10B981' : undefined}
          >
            {/* Checkbox — only this triggers toggle */}
            <TouchableOpacity
              onPress={() => toggleExercise(ex.id)}
              style={{ marginRight: 14 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={isFutureWorkout}
            >
              <LinearGradient
                colors={ex.completed ? ['#10B981', '#34D399'] : ['transparent', 'transparent']}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: ex.completed ? 0 : 1.5,
                  borderColor: COLORS.border,
                }}
              >
                {ex.completed && <IconCheck size={14} color="#fff" strokeWidth={2.5} />}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: ex.completed ? COLORS.textSub : '#fff',
                  textDecorationLine: ex.completed ? 'line-through' : 'none',
                }}
              >
                {idx + 1}. {ex.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                  {ex.sets} sets × {ex.reps} reps
                </Text>
                {ex.weightKg ? (
                  <Text style={{ fontSize: 12, color: '#A78BFA' }}>{ex.weightKg} kg</Text>
                ) : null}
                {ex.restSecs ? (
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{ex.restSecs}s rest</Text>
                ) : null}
              </View>
            </View>
          </GlassCard>
        ))}
      </ScrollView>

      <AddWorkoutModal
        visible={editVisible}
        workout={currentWorkout}
        onClose={() => setEditVisible(false)}
        onSave={handleEditSave}
      />
    </View>
  );
};

export default WorkoutDetailScreen;
