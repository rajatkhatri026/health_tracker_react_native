import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Goal } from '../../types';
import { metricLabel, metricIcon, formatDate, getGoalProgress } from '../../utils/format';
import { styles } from './GoalCard.styles';

interface GoalCardProps {
  goal: Goal;
  onDelete?: (goalId: string) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onDelete }) => {
  const progress = getGoalProgress(goal.current_value ?? 0, goal.target_value);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBg}>
            <Text style={{ fontSize: 18 }}>{metricIcon[goal.metric_type]}</Text>
          </View>
          <Text style={styles.metricLabel}>{metricLabel[goal.metric_type]}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, styles[`badge_${goal.status}`]]}>
            <Text style={[styles.badgeText, styles[`badgeText_${goal.status}`]]}>
              {goal.status.toUpperCase()}
            </Text>
          </View>
          {onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(goal.goal_id)}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {goal.current_value ?? 0} / {goal.target_value}
          </Text>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
      </View>

      <Text style={styles.dates}>
        {formatDate(goal.start_date)} → {formatDate(goal.end_date)}
        {goal.recurrence !== 'none' ? ` · ${goal.recurrence}` : ''}
      </Text>
    </View>
  );
};

export default GoalCard;
