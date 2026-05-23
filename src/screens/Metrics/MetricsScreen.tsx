import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Alert, StatusBar } from 'react-native';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import { useAuth } from '../../context/AuthContext';
import { getMetrics, createMetric, deleteMetric } from '../../api/metrics';
import type { Metric, MetricType, CreateMetricPayload } from '../../types';
import { metricIcon, metricLabel, metricUnit, formatDateTime } from '../../utils/format';
import QuickAdd from '../../components/QuickAdd/QuickAdd';
import MetricChart from '../../components/MetricChart/MetricChart';
import { styles } from './Metrics.styles';
import { MetricsSkeleton } from '../../components/Skeleton/Skeleton';

const FILTER_TYPES: MetricType[] = [
  'weight',
  'blood_pressure',
  'glucose',
  'steps',
  'sleep',
  'nutrition',
  'activity',
];

const MetricsScreen: React.FC = () => {
  const { user } = useAuth();
  const [ms0, ms1, ms2] = useEntranceAnimation(3, { initialDelay: 60, stagger: 110 });
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [activeFilter, setActiveFilter] = useState<MetricType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const loadMetrics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMetrics(user.user_id, {
        type: activeFilter === 'all' ? undefined : activeFilter,
      });
      setMetrics(data);
    } catch {
      Alert.alert('Error', 'Failed to load metrics. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [user, activeFilter]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleDelete = async (metricId: string) => {
    if (!user) return;
    try {
      await deleteMetric(user.user_id, metricId);
      setMetrics((prev) => prev.filter((m) => m.metric_id !== metricId));
    } catch {
      Alert.alert('Error', 'Failed to delete metric. Please try again.');
    }
  };

  const handleQuickAdd = async (payload: CreateMetricPayload) => {
    if (!user) return;
    try {
      await createMetric(user.user_id, payload);
      await loadMetrics();
    } catch {
      Alert.alert('Error', 'Failed to save metric. Please try again.');
    }
  };

  const sorted = [...metrics].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const displayType: MetricType = activeFilter === 'all' ? 'weight' : activeFilter;
  const chartData = metrics
    .filter((m) => m.type === displayType)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-14)
    .map((m) => ({
      label: new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: m.value,
    }));

  const latestValue = sorted.find((m) => m.type === displayType);

  if (loading) {
    return <MetricsSkeleton />;
  }

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={entranceStyle(ms0)}>
        <View style={styles.header}>
          <Text style={styles.title}>Metrics</Text>
          <Text style={styles.subtitle}>Track your health data</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={entranceStyle(ms1)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {FILTER_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterChip, activeFilter === type && styles.filterChipActive]}
                onPress={() => setActiveFilter(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === type && styles.filterChipTextActive,
                  ]}
                >
                  {metricIcon[type]} {metricLabel[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {chartData.length > 1 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>
                  {metricIcon[displayType]} {metricLabel[displayType]} Trend
                </Text>
                {latestValue && (
                  <Text style={styles.chartLatest}>
                    {latestValue.value}{' '}
                    <Text style={styles.chartUnit}>{metricUnit[displayType]}</Text>
                  </Text>
                )}
              </View>
              <MetricChart data={chartData} color="#C58BF2" unit={metricUnit[displayType]} />
            </View>
          )}
        </Animated.View>
        <Animated.View style={entranceStyle(ms2)}>
          <Text style={styles.listTitle}>History</Text>
          {sorted.length === 0 ? (
            <Text style={styles.emptyState}>No metrics yet. Tap + to add your first entry!</Text>
          ) : (
            sorted.map((m) => (
              <View key={m.metric_id} style={styles.metricItem}>
                <View style={styles.metricIconBg}>
                  <Text style={styles.metricIcon}>{metricIcon[m.type]}</Text>
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricType}>{metricLabel[m.type]}</Text>
                  <Text style={styles.metricTime}>
                    {formatDateTime(m.timestamp)} · {m.source}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricUnit}>{m.unit}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(m.metric_id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowQuickAdd(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {showQuickAdd && (
        <QuickAdd onClose={() => setShowQuickAdd(false)} onSubmit={handleQuickAdd} />
      )}
    </View>
  );
};

export default MetricsScreen;
