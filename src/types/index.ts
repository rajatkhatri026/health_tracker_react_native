export type MetricType =
  | 'weight'
  | 'blood_pressure'
  | 'glucose'
  | 'steps'
  | 'sleep'
  | 'nutrition'
  | 'activity';

export type GoalStatus = 'active' | 'completed' | 'paused';
export type GoalRecurrence = 'daily' | 'weekly' | 'monthly' | 'none';
export type DataSource = 'manual' | 'healthkit' | 'google_fit' | 'device';

export interface User {
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  time_zone?: string;
  preferences?: Record<string, unknown>;
}

export interface UserProfile {
  height?: number;
  baseline_weight?: number;
  blood_type?: string;
  medical_notes?: string;
}

export interface Metric {
  metric_id: string;
  user_id: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: string;
  source: DataSource;
}

export interface CreateMetricPayload {
  type: MetricType;
  value: number;
  unit: string;
  timestamp: string;
  source: DataSource;
}

export interface Goal {
  goal_id: string;
  user_id: string;
  metric_type: MetricType;
  target_value: number;
  current_value?: number;
  start_date: string;
  end_date: string;
  recurrence: GoalRecurrence;
  status: GoalStatus;
}

export interface CreateGoalPayload {
  metric_type: MetricType;
  target_value: number;
  start_date: string;
  end_date: string;
  recurrence: GoalRecurrence;
}

export interface Device {
  device_id: string;
  user_id: string;
  vendor: string;
  model: string;
  last_sync: string;
}

export interface Consent {
  consent_id: string;
  user_id: string;
  provider_id: string;
  scope: string;
  granted_at: string;
  expires_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
