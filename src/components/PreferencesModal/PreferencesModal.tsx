import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../../utils/theme';
import type { AppPreferences } from '../../hooks/useAppPreferences';

interface Props {
  visible: boolean;
  prefs: AppPreferences;
  onClose: () => void;
  onSave: (p: AppPreferences) => Promise<void> | void;
}

type ChipOption<T> = { label: string; value: T };

function ChipRow<T extends string | number>({
  options,
  selected,
  onSelect,
}: {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={s.chipRow}>
      {options.map((o) => {
        const active = o.value === selected;
        return active ? (
          <TouchableOpacity
            key={String(o.value)}
            activeOpacity={0.9}
            onPress={() => onSelect(o.value)}
          >
            <LinearGradient
              colors={['#0891B2', '#0891B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.chipActive}
            >
              <Text style={s.chipTxtActive}>{o.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            key={String(o.value)}
            style={s.chipInactive}
            onPress={() => onSelect(o.value)}
            activeOpacity={0.7}
          >
            <Text style={s.chipTxt}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const PreferencesModal: React.FC<Props> = ({ visible, prefs, onClose, onSave }) => {
  const [local, setLocal] = useState<AppPreferences>(prefs);

  React.useEffect(() => {
    setLocal(prefs);
  }, [prefs, visible]);

  const set = <K extends keyof AppPreferences>(key: K, val: AppPreferences[K]) =>
    setLocal((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await onSave(local);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={s.header}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.headerSide}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.title}>Preferences</Text>
            <View style={[s.headerSide, { alignItems: 'flex-end' }]}>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#0891B2', '#0891B2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.saveBtn}
                >
                  <Text style={s.saveTxt}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {[
            {
              label: 'Weight Unit',
              sub: 'Used for BMI and calorie calculations',
              key: 'weightUnit' as const,
              options: [
                { label: 'Kilograms (kg)', value: 'kg' },
                { label: 'Pounds (lbs)', value: 'lbs' },
              ],
            },
            {
              label: 'Height Unit',
              sub: 'Used for BMI calculations',
              key: 'heightUnit' as const,
              options: [
                { label: 'Centimetres (cm)', value: 'cm' },
                { label: 'Feet & Inches (ft)', value: 'ft' },
              ],
            },
            {
              label: 'Water Unit',
              sub: 'Display unit on the Water Intake screen',
              key: 'waterUnit' as const,
              options: [
                { label: 'Millilitres (ml)', value: 'ml' },
                { label: 'Fluid Ounces (fl oz)', value: 'fl oz' },
              ],
            },
            {
              label: 'Daily Step Goal',
              sub: 'Target steps per day',
              key: 'dailyStepGoal' as const,
              options: [
                { label: '5,000', value: 5000 },
                { label: '7,500', value: 7500 },
                { label: '10,000', value: 10000 },
                { label: '12,500', value: 12500 },
                { label: '15,000', value: 15000 },
              ],
            },
            {
              label: 'Default Daily Water Goal',
              sub: 'Used as the default goal for new dates',
              key: 'dailyWaterGoal' as const,
              options: [
                { label: '1.5 L', value: 1500 },
                { label: '2.0 L', value: 2000 },
                { label: '2.5 L', value: 2500 },
                { label: '3.0 L', value: 3000 },
                { label: '3.5 L', value: 3500 },
                { label: '4.0 L', value: 4000 },
              ],
            },
          ].map((section, i, arr) => (
            <View key={section.key}>
              <View style={s.row}>
                <Text style={s.label}>{section.label}</Text>
                <Text style={s.sub}>{section.sub}</Text>
                <ChipRow
                  options={section.options as ChipOption<string | number>[]}
                  selected={local[section.key] as string | number}
                  onSelect={(v) => set(section.key, v as AppPreferences[typeof section.key])}
                />
              </View>
              {i < arr.length - 1 && <View style={s.divider} />}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { flex: 1 },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.full },
  saveTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 0,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sub: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14, lineHeight: 17 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipActive: { borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 9 },
  chipInactive: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipTxtActive: { fontSize: 13, fontWeight: '700', color: '#fff' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textSub },

  divider: { height: 12 },
});

export default PreferencesModal;
