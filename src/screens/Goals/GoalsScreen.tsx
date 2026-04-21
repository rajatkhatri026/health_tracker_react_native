import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGoals, createGoal, deleteGoal } from '../../api/goals';
import type { Goal, MetricType, GoalRecurrence, CreateGoalPayload } from '../../types';
import { metricLabel, metricIcon } from '../../utils/format';
import GoalCard from '../../components/GoalCard/GoalCard';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { styles } from './Goals.styles';

const METRIC_TYPES: MetricType[] = [
  'weight',
  'blood_pressure',
  'glucose',
  'steps',
  'sleep',
  'nutrition',
  'activity',
];
const RECURRENCES: GoalRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];

const GoalsScreen: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [metricType, setMetricType] = useState<MetricType>('weight');
  const [targetValue, setTargetValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recurrence, setRecurrence] = useState<GoalRecurrence>('none');

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getGoals(user.user_id);
      setGoals(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleDelete = async (goalId: string) => {
    if (!user) return;
    try {
      await deleteGoal(user.user_id, goalId);
      setGoals((prev) => prev.filter((g) => g.goal_id !== goalId));
    } catch {}
  };

  const handleCreate = async () => {
    if (!targetValue || !startDate || !endDate) {
      setFormError('Please fill in all fields');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setFormError('End date must be after start date');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const payload: CreateGoalPayload = {
        metric_type: metricType,
        target_value: parseFloat(targetValue),
        start_date: startDate,
        end_date: endDate,
        recurrence,
      };
      await createGoal(user!.user_id, payload);
      setShowCreate(false);
      setTargetValue('');
      setStartDate('');
      setEndDate('');
      await loadGoals();
    } catch {
      setFormError('Failed to create goal');
    } finally {
      setFormLoading(false);
    }
  };

  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');
  const paused = goals.filter((g) => g.status === 'paused');

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Goals 🎯</Text>
        <Text style={styles.subtitle}>Set and track your health goals</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          {[
            { label: 'ACTIVE', val: active.length, icon: '🎯', bg: '#EEF0FF' },
            { label: 'DONE', val: completed.length, icon: '✅', bg: '#F0FFF8' },
            { label: 'TOTAL', val: goals.length, icon: '📊', bg: '#FFF8EE' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: s.bg }]}>
                <Text style={{ fontSize: 18 }}>{s.icon}</Text>
              </View>
              <Text style={styles.statValue}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#92A3FD" style={{ padding: 20 }} />
        ) : goals.length === 0 ? (
          <Text style={styles.emptyState}>No goals yet. Tap + to create your first goal!</Text>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Active Goals</Text>
                {active.map((g) => (
                  <GoalCard key={g.goal_id} goal={g} onDelete={handleDelete} />
                ))}
              </>
            )}
            {completed.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Completed</Text>
                {completed.map((g) => (
                  <GoalCard key={g.goal_id} goal={g} onDelete={handleDelete} />
                ))}
              </>
            )}
            {paused.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Paused</Text>
                {paused.map((g) => (
                  <GoalCard key={g.goal_id} goal={g} onDelete={handleDelete} />
                ))}
              </>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal
        transparent
        animationType="slide"
        visible={showCreate}
        onRequestClose={() => setShowCreate(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCreate(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Create Goal</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.formLabel}>Metric Type</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 14 }}
                  >
                    {METRIC_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeChip, metricType === t && styles.typeChipActive]}
                        onPress={() => setMetricType(t)}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            metricType === t && styles.typeChipTextActive,
                          ]}
                        >
                          {metricIcon[t]} {metricLabel[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={{ gap: 14 }}>
                    <Input
                      label="Target Value"
                      value={targetValue}
                      onChangeText={setTargetValue}
                      placeholder="e.g. 70"
                      keyboardType="decimal-pad"
                    />
                    <Input
                      label="Start Date (YYYY-MM-DD)"
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="2026-01-01"
                    />
                    <Input
                      label="End Date (YYYY-MM-DD)"
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="2026-12-31"
                    />
                    <View>
                      <Text style={styles.formLabel}>Recurrence</Text>
                      <View style={styles.recurrenceRow}>
                        {RECURRENCES.map((r) => (
                          <TouchableOpacity
                            key={r}
                            style={[styles.recChip, recurrence === r && styles.recChipActive]}
                            onPress={() => setRecurrence(r)}
                          >
                            <Text
                              style={[
                                styles.recChipText,
                                recurrence === r && styles.recChipTextActive,
                              ]}
                            >
                              {r === 'none' ? 'One-time' : r.charAt(0).toUpperCase() + r.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    {formError ? <Text style={styles.error}>{formError}</Text> : null}
                    <Button
                      onPress={handleCreate}
                      variant="primary"
                      size="lg"
                      loading={formLoading}
                    >
                      Create Goal
                    </Button>
                    <Button onPress={() => setShowCreate(false)} variant="ghost" size="lg">
                      Cancel
                    </Button>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default GoalsScreen;
