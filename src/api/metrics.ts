import api from './axios';
import type { Metric, CreateMetricPayload, MetricType } from '../types';

export interface MetricsQuery {
  type?: MetricType;
  from?: string;
  to?: string;
}

export const getMetrics = async (userId: string, query?: MetricsQuery): Promise<Metric[]> => {
  const { data } = await api.get<Metric[]>(`/users/${userId}/metrics`, { params: query });
  return data;
};

export const createMetric = async (
  userId: string,
  payload: CreateMetricPayload
): Promise<{ metric_id: string; status: string }> => {
  const { data } = await api.post(`/users/${userId}/metrics`, payload);
  return data;
};

export const deleteMetric = async (userId: string, metricId: string): Promise<void> => {
  await api.delete(`/users/${userId}/metrics/${metricId}`);
};
