import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import type { MetricType, CreateMetricPayload } from '../../types';
import { metricLabel, metricUnit, metricIcon, toUTCISOString } from '../../utils/format';
import Button from '../Button/Button';
import Input from '../Input/Input';
import { styles } from './QuickAdd.styles';

const METRIC_TYPES: MetricType[] = [
  'weight',
  'blood_pressure',
  'glucose',
  'steps',
  'sleep',
  'nutrition',
  'activity',
];

interface QuickAddProps {
  onClose: () => void;
  onSubmit: (payload: CreateMetricPayload) => Promise<void>;
}

const QuickAdd: React.FC<QuickAddProps> = ({ onClose, onSubmit }) => {
  const [type, setType] = useState<MetricType>('weight');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        type,
        value: num,
        unit: metricUnit[type],
        timestamp: toUTCISOString(new Date()),
        source: 'manual',
      });
      onClose();
    } catch {
      setError('Failed to save metric. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.title}>Quick Add Metric</Text>

              <Text style={styles.sectionLabel}>Metric Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                {METRIC_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, type === t && styles.typeChipActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                      {metricIcon[t]} {metricLabel[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label={`Value (${metricUnit[type]})`}
                value={value}
                onChangeText={setValue}
                placeholder={type === 'steps' ? '8000' : type === 'weight' ? '70' : '120'}
                keyboardType="decimal-pad"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <Button onPress={handleSubmit} variant="primary" size="lg" loading={loading}>
                  Save
                </Button>
                <Button onPress={onClose} variant="ghost" size="lg">
                  Cancel
                </Button>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default QuickAdd;
