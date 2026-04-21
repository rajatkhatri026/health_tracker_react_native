import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMetrics, createMetric } from '../api/metrics';
import type { Metric, MetricType, CreateMetricPayload } from '../types';
import { toUTCISOString } from '../utils/format';

interface UseMetricsOptions {
  type?: MetricType;
  days?: number; // how many days back to fetch
}

interface UseMetricsResult {
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addMetric: (payload: Omit<CreateMetricPayload, 'timestamp' | 'source'>) => Promise<void>;
  latest: Record<string, Metric>;
  weeklyValues: (type: MetricType) => number[];
}

export const useMetrics = (options: UseMetricsOptions = {}): UseMetricsResult => {
  const { user } = useAuth();
  const { type, days = 7 } = options;
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const data = await getMetrics(user.user_id, { type, from });
      setMetrics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [user, type, days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Latest value per type
  const latest = metrics.reduce<Record<string, Metric>>((acc, m) => {
    if (!acc[m.type] || new Date(m.timestamp) > new Date(acc[m.type].timestamp)) {
      acc[m.type] = m;
    }
    return acc;
  }, {});

  // Last N days of values for a given metric type (oldest → newest, length = days)
  const weeklyValues = useCallback(
    (metricType: MetricType): number[] => {
      const now = Date.now();
      const buckets: (number | null)[] = Array(7).fill(null);
      metrics
        .filter((m) => m.type === metricType)
        .forEach((m) => {
          const daysAgo = Math.floor(
            (now - new Date(m.timestamp).getTime()) / (24 * 60 * 60 * 1000)
          );
          const idx = 6 - daysAgo;
          if (idx >= 0 && idx < 7) {
            if (buckets[idx] === null || m.value > (buckets[idx] as number)) {
              buckets[idx] = m.value;
            }
          }
        });
      // fill nulls with 0
      return buckets.map((v) => v ?? 0);
    },
    [metrics]
  );

  const addMetric = useCallback(
    async (payload: Omit<CreateMetricPayload, 'timestamp' | 'source'>) => {
      if (!user) return;
      const full: CreateMetricPayload = {
        ...payload,
        timestamp: toUTCISOString(new Date()),
        source: 'manual',
      };
      await createMetric(user.user_id, full);
      await fetch();
    },
    [user, fetch]
  );

  return { metrics, loading, error, refresh: fetch, addMetric, latest, weeklyValues };
};
