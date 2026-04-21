import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CustomDateTimePicker from '../DateTimePicker/CustomDateTimePicker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../../utils/theme';
import { IconPlus, IconArrowLeft } from '../icons/Icons';
import type { CreateWorkoutPayload, Exercise, Workout } from '../../api/workouts';
import { toUTCISOString } from '../../utils/format';

const CATEGORIES = [
  { label: 'Strength', emoji: '🏋️' },
  { label: 'Cardio', emoji: '🏃' },
  { label: 'Core', emoji: '💪' },
  { label: 'Flexibility', emoji: '🧘' },
  { label: 'HIIT', emoji: '🔥' },
  { label: 'Lowerbody', emoji: '🦵' },
];

const DEFAULT_EXERCISES: Record<string, Omit<Exercise, 'id' | 'completed'>[]> = {
  Strength: [
    { name: 'Bench Press', sets: 3, reps: 10, weightKg: 60, restSecs: 90 },
    { name: 'Squat', sets: 4, reps: 8, weightKg: 80, restSecs: 120 },
    { name: 'Deadlift', sets: 3, reps: 6, weightKg: 100, restSecs: 120 },
  ],
  Cardio: [
    { name: 'Running', sets: 1, reps: 1, restSecs: 0 },
    { name: 'Jumping Jacks', sets: 3, reps: 30, restSecs: 30 },
    { name: 'Burpees', sets: 3, reps: 15, restSecs: 60 },
  ],
  Core: [
    { name: 'Plank', sets: 3, reps: 1, restSecs: 45 },
    { name: 'Crunches', sets: 3, reps: 20, restSecs: 30 },
    { name: 'Leg Raises', sets: 3, reps: 15, restSecs: 30 },
  ],
  Flexibility: [
    { name: 'Hip Flexor Stretch', sets: 2, reps: 1, restSecs: 30 },
    { name: 'Hamstring Stretch', sets: 2, reps: 1, restSecs: 30 },
    { name: 'Shoulder Stretch', sets: 2, reps: 1, restSecs: 30 },
  ],
  HIIT: [
    { name: 'Mountain Climbers', sets: 4, reps: 20, restSecs: 20 },
    { name: 'Jump Squats', sets: 4, reps: 15, restSecs: 20 },
    { name: 'High Knees', sets: 4, reps: 30, restSecs: 20 },
  ],
  Lowerbody: [
    { name: 'Lunges', sets: 3, reps: 12, weightKg: 20, restSecs: 60 },
    { name: 'Leg Press', sets: 4, reps: 10, weightKg: 100, restSecs: 90 },
    { name: 'Calf Raises', sets: 3, reps: 20, restSecs: 45 },
  ],
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (payloads: CreateWorkoutPayload[]) => Promise<void>;
  workout?: Workout; // if provided, modal is in edit mode
}

const uid = () => Math.random().toString(36).slice(2);

const AddWorkoutModal: React.FC<Props> = ({ visible, onClose, onSave, workout }) => {
  const isEdit = !!workout;

  const [step, setStep] = useState<'category' | 'details'>(() => (isEdit ? 'details' : 'category'));
  const [category, setCategory] = useState(workout?.category ?? '');
  const [emoji, setEmoji] = useState(workout?.emoji ?? '🏋️');
  const [name, setName] = useState(workout?.name ?? '');
  const [durationMins, setDurationMins] = useState(String(workout?.durationMins ?? 45));
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (workout?.scheduledAt) return new Date(workout.scheduledAt);
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [exercises, setExercises] = useState<
    (Omit<Exercise, 'id' | 'completed'> & { id: string })[]
  >(workout?.exercises.map((e, i) => ({ ...e, id: e.id || String(i) })) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Repeat options
  type RepeatOption = 'none' | 'alternate' | 'next3' | 'next7' | 'custom';
  const [repeat, setRepeat] = useState<RepeatOption>('none');
  // Custom: which days of week are selected (0=Sun..6=Sat)
  const [customDays, setCustomDays] = useState<number[]>([]);

  const REPEAT_OPTIONS: { key: RepeatOption; label: string; desc: string }[] = [
    { key: 'none', label: 'Once', desc: 'No repeat' },
    { key: 'alternate', label: 'Alternate Days', desc: 'Every 2 days' },
    { key: 'next3', label: 'Next 3 Days', desc: 'Daily for 3 days' },
    { key: 'next7', label: 'Next 7 Days', desc: 'Daily for 7 days' },
    { key: 'custom', label: 'Custom Days', desc: 'Pick days of week' },
  ];

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Build list of dates to schedule based on repeat option
  const buildScheduleDates = (): Date[] => {
    const dates: Date[] = [new Date(scheduledDate)];
    if (repeat === 'none') return dates;

    const base = new Date(scheduledDate);

    if (repeat === 'alternate') {
      for (let i = 1; i <= 3; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i * 2);
        dates.push(d);
      }
    } else if (repeat === 'next3') {
      for (let i = 1; i < 3; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push(d);
      }
    } else if (repeat === 'next7') {
      for (let i = 1; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push(d);
      }
    } else if (repeat === 'custom' && customDays.length > 0) {
      // Find next occurrence of each selected weekday within next 4 weeks
      const seen = new Set<string>();
      seen.add(base.toDateString());
      for (let offset = 1; offset <= 28; offset++) {
        const d = new Date(base);
        d.setDate(base.getDate() + offset);
        if (customDays.includes(d.getDay()) && !seen.has(d.toDateString())) {
          seen.add(d.toDateString());
          dates.push(d);
        }
        if (dates.length >= 8) break;
      }
    }
    return dates;
  };

  // Re-sync state when workout prop changes (e.g. opening edit for different workout)

  useEffect(() => {
    if (visible && workout) {
      setStep('details');
      setCategory(workout.category);
      setEmoji(workout.emoji);
      setName(workout.name);
      setDurationMins(String(workout.durationMins));
      setScheduledDate(new Date(workout.scheduledAt));
      setExercises(workout.exercises.map((e, i) => ({ ...e, id: e.id || String(i) })));
      setError('');
    } else if (visible && !workout) {
      setStep('category');
      setCategory('');
      setEmoji('🏋️');
      setName('');
      setDurationMins('45');
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      setScheduledDate(d);
      setExercises([]);
      setError('');
    }
  }, [visible, workout]);

  const selectCategory = (cat: (typeof CATEGORIES)[0]) => {
    setCategory(cat.label);
    setEmoji(cat.emoji);
    setName(`${cat.label} Workout`);
    setExercises(
      (DEFAULT_EXERCISES[cat.label] ?? []).map((e) => ({ ...e, id: uid(), completed: false }))
    );
    setStep('details');
  };

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      { id: uid(), name: '', sets: 3, reps: 10, restSecs: 60, completed: false },
    ]);
  };

  const updateExercise = (id: string, field: string, value: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, [field]: ['name'].includes(field) ? value : Number(value) || 0 } : e
      )
    );
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Workout name is required');
      return;
    }
    if (exercises.length === 0) {
      setError('Add at least one exercise');
      return;
    }
    if (exercises.some((e) => !e.name.trim())) {
      setError('All exercises need a name');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const dates = isEdit ? [scheduledDate] : buildScheduleDates();
      const base = {
        name: name.trim(),
        category,
        emoji,
        exercises: exercises.map(({ id: _id, ...e }) => ({ ...e })),
        durationMins: parseInt(durationMins) || 45,
      };
      const payloads = dates.map((d) => ({ ...base, scheduledAt: toUTCISOString(d) }));
      await onSave(payloads);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep('category');
    setCategory('');
    setName('');
    setExercises([]);
    setError('');
    setSaving(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setRepeat('none');
    setCustomDays([]);
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    setScheduledDate(d);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <TouchableOpacity
            onPress={step === 'details' && !isEdit ? () => setStep('category') : handleClose}
            style={{ marginRight: 14 }}
          >
            <IconArrowLeft size={20} color={COLORS.textSub} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' }}>
            {step === 'category'
              ? 'Choose Category'
              : isEdit
                ? `Edit: ${emoji} ${name}`
                : `${emoji}  ${name || 'New Workout'}`}
          </Text>
          {step === 'details' && (
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#A78BFA" size="small" />
              ) : (
                <LinearGradient
                  colors={['#7C3AED', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Save</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
              margin: 16,
              borderRadius: RADIUS.sm,
              padding: 12,
            }}
          >
            <Text style={{ color: '#FCA5A5', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {/* Step 1 — Category picker */}
        {step === 'category' && (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            <Text style={{ fontSize: 14, color: COLORS.textSub, marginBottom: 8 }}>
              Select a category to get started with suggested exercises.
            </Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                onPress={() => selectCategory(cat)}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.bgCard,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.md,
                    padding: 18,
                    gap: 16,
                  }}
                >
                  <Text style={{ fontSize: 36 }}>{cat.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                      {cat.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                      {DEFAULT_EXERCISES[cat.label]?.length ?? 0} suggested exercises
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Step 2 — Details */}
        {step === 'details' && (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                fontWeight: '700',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              WORKOUT NAME
            </Text>
            <TextInput
              style={{
                backgroundColor: COLORS.bgInput,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.md,
                paddingHorizontal: 16,
                height: 50,
                color: '#fff',
                fontSize: 15,
                marginBottom: 20,
              }}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Morning Strength"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Duration */}
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                fontWeight: '700',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              DURATION (MINS)
            </Text>
            <TextInput
              style={{
                backgroundColor: COLORS.bgInput,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.md,
                paddingHorizontal: 16,
                height: 50,
                color: '#fff',
                fontSize: 15,
                marginBottom: 20,
              }}
              value={durationMins}
              onChangeText={setDurationMins}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Schedule — date + time picker */}
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                fontWeight: '700',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              SCHEDULED
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {/* Date button */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.bgInput,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: RADIUS.md,
                  height: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  📅{' '}
                  {scheduledDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {/* Time button */}
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.bgInput,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: RADIUS.md,
                  height: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  🕐 {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Repeat — only for new workouts */}
            {!isEdit && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                    marginBottom: 10,
                  }}
                >
                  REPEAT
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {REPEAT_OPTIONS.map((opt) => (
                    <TouchableOpacity key={opt.key} onPress={() => setRepeat(opt.key)}>
                      {repeat === opt.key ? (
                        <LinearGradient
                          colors={['#7C3AED', '#06B6D4']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            borderRadius: RADIUS.full,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                            {opt.label}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View
                          style={{
                            borderRadius: RADIUS.full,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            backgroundColor: COLORS.bgCard,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                          }}
                        >
                          <Text style={{ color: COLORS.textSub, fontSize: 12 }}>{opt.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom day picker */}
                {repeat === 'custom' && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8 }}>
                      Select days of the week:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {DAY_LABELS.map((d, i) => {
                        const sel = customDays.includes(i);
                        return (
                          <TouchableOpacity
                            key={i}
                            onPress={() =>
                              setCustomDays((prev) =>
                                sel ? prev.filter((x) => x !== i) : [...prev, i]
                              )
                            }
                          >
                            {sel ? (
                              <LinearGradient
                                colors={['#7C3AED', '#06B6D4']}
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                                  {d}
                                </Text>
                              </LinearGradient>
                            ) : (
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: COLORS.bgCard,
                                  borderWidth: 1,
                                  borderColor: COLORS.border,
                                }}
                              >
                                <Text style={{ color: COLORS.textSub, fontSize: 12 }}>{d}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Preview count */}
                {repeat !== 'none' && (
                  <Text style={{ fontSize: 11, color: '#A78BFA', marginTop: 8 }}>
                    {(() => {
                      const count = buildScheduleDates().length;
                      return `${count} session${count > 1 ? 's' : ''} will be created`;
                    })()}
                  </Text>
                )}
              </View>
            )}

            {/* Exercises */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                }}
              >
                EXERCISES ({exercises.length})
              </Text>
              <TouchableOpacity
                onPress={addExercise}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(124,58,237,0.2)',
                  borderRadius: RADIUS.full,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <IconPlus size={13} color="#A78BFA" strokeWidth={2.5} />
                <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '600' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {exercises.map((ex, idx) => (
              <View
                key={ex.id}
                style={{
                  backgroundColor: COLORS.bgCard,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: RADIUS.md,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Text
                    style={{ fontSize: 13, color: '#A78BFA', fontWeight: '700', marginRight: 10 }}
                  >
                    #{idx + 1}
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: '600',
                      borderBottomWidth: 1,
                      borderColor: COLORS.border,
                      paddingBottom: 4,
                    }}
                    value={ex.name}
                    onChangeText={(v) => updateExercise(ex.id, 'name', v)}
                    placeholder="Exercise name"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <TouchableOpacity
                    onPress={() => removeExercise(ex.id)}
                    style={{ marginLeft: 12 }}
                  >
                    <Text style={{ color: '#F43F5E', fontSize: 18, lineHeight: 22 }}>×</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { label: 'Sets', field: 'sets', value: String(ex.sets) },
                    { label: 'Reps', field: 'reps', value: String(ex.reps) },
                    { label: 'kg', field: 'weightKg', value: String(ex.weightKg ?? '') },
                    { label: 'Rest(s)', field: 'restSecs', value: String(ex.restSecs ?? '') },
                  ].map((f) => (
                    <View key={f.field} style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: COLORS.textMuted,
                          marginBottom: 4,
                          textAlign: 'center',
                        }}
                      >
                        {f.label}
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 8,
                          height: 36,
                          textAlign: 'center',
                          color: '#fff',
                          fontSize: 14,
                        }}
                        value={f.value}
                        onChangeText={(v) => updateExercise(ex.id, f.field, v)}
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.textMuted}
                        placeholder="—"
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <CustomDateTimePicker
        visible={showDatePicker}
        value={scheduledDate}
        mode="date"
        minimumDate={new Date()}
        onConfirm={(date) => {
          setScheduledDate(date);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      <CustomDateTimePicker
        visible={showTimePicker}
        value={scheduledDate}
        mode="time"
        onConfirm={(date) => {
          setScheduledDate(date);
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />
    </Modal>
  );
};

export default AddWorkoutModal;
